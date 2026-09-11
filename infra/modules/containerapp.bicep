param location string
param tags object
param environmentName string
param appName string
param logAnalyticsCustomerId string
@secure()
param logAnalyticsSharedKey string
param registryLoginServer string
param containerImage string
param identityResourceId string
param identityClientId string
param cosmosEndpoint string
param cosmosDatabaseName string
param storageAccountName string
param iconsContainerName string
param iconsContainerUrl string
param appInsightsConnectionString string

@description('0 scales to zero and costs almost nothing, at the price of a cold start on the first request. 1 keeps the site instant.')
@minValue(0)
@maxValue(5)
param minReplicas int = 1

@minValue(1)
@maxValue(10)
param maxReplicas int = 5

@description('''
Which provider signs admins in.

"aad" is the tight one: a single-tenant app registration means nobody outside
the tenant can complete sign-in at all, and with "Assignment required" switched
on inside it, only explicitly assigned accounts get a token. The front door is
shut rather than guarded.

"github" needs only a two-minute OAuth app, but GitHub lets anyone authenticate,
so the allowlist in the app is the whole lock.

"none" deploys with no sign-in, which leaves /admin unreachable by anyone.
''')
@allowed(['none', 'github', 'aad'])
param authProvider string = 'none'

@description('OAuth client id for the chosen provider.')
param authClientId string = ''

@description('Entra ID tenant id. Only read when authProvider is "aad".')
param authTenantId string = ''

@description('''
Comma separated GitHub logins allowed to administer the catalogue.

GitHub authenticates but carries no roles, so this is the authorization list.
Empty means nobody is an admin, which is the safe default: signing in is never
sufficient on its own.
''')
param adminGithubLogins string = ''

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
    zoneRedundant: false
  }
}

// Naming a provider is not the same as having configured one. Until the client
// id is filled in there is no /.auth/login/... endpoint, so the app is told
// "none" and says so, rather than redirecting people into a 404.
var authConfigured = authProvider != 'none' && !empty(authClientId)
var effectiveAuthProvider = authConfigured ? authProvider : 'none'

var appProbes = [
  {
    // Liveness and readiness both use /api/live, which never touches Cosmos.
    // Restarting or de-rotating the last replica because the database is having
    // a bad minute turns a degraded site into a down one.
    type: 'Liveness'
    httpGet: { path: '/api/live', port: 3000 }
    initialDelaySeconds: 10
    periodSeconds: 30
    failureThreshold: 3
  }
  {
    type: 'Readiness'
    httpGet: { path: '/api/live', port: 3000 }
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  }
  {
    type: 'Startup'
    httpGet: { path: '/api/live', port: 3000 }
    initialDelaySeconds: 3
    periodSeconds: 3
    failureThreshold: 20
  }
]

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityResourceId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          { latestRevision: true, weight: 100 }
        ]
      }
      registries: [
        {
          server: registryLoginServer
          // Pull with the pre-created identity, which already holds AcrPull.
          identity: identityResourceId
        }
      ]
      // Revisions are the rollback story: a bad deploy is one traffic shift away
      // from undone, and the previous revision is still warm.
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_DATABASE', value: cosmosDatabaseName }
            { name: 'STORAGE_ACCOUNT_NAME', value: storageAccountName }
            { name: 'ICONS_CONTAINER_NAME', value: iconsContainerName }
            { name: 'ICONS_CONTAINER_URL', value: iconsContainerUrl }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
            // Tells DefaultAzureCredential which identity to use. Without it a
            // user-assigned identity is ambiguous and the SDK picks nothing.
            { name: 'AZURE_CLIENT_ID', value: identityClientId }
            { name: 'AUTH_PROVIDER', value: effectiveAuthProvider }
            { name: 'ADMIN_GITHUB_LOGINS', value: adminGithubLogins }
          ]
          probes: appProbes
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http'
            http: { metadata: { concurrentRequests: '40' } }
          }
        ]
      }
    }
  }
}

// Built-in authentication. Anonymous traffic is allowed through because the
// catalogue itself is public; the app's middleware and route handlers decide
// what the admin surface needs. Skipped entirely while authProvider is 'none',
// which leaves /admin unreachable rather than open.
resource authConfig 'Microsoft.App/containerApps/authConfigs@2024-03-01' = if (authConfigured) {
  parent: containerApp
  name: 'current'
  properties: {
    platform: { enabled: true }
    globalValidation: {
      unauthenticatedClientAction: 'AllowAnonymous'
    }
    identityProviders: authProvider == 'github'
      ? {
          gitHub: {
            enabled: true
            registration: {
              clientId: authClientId
              // The secret is set on the container app separately, so it never
              // passes through a template or a parameters file.
              clientSecretSettingName: 'github-client-secret'
            }
            login: {
              // Enough to read the login and numeric id, and nothing else. The
              // app never touches a repository on the visitor's behalf.
              scopes: [ 'read:user' ]
            }
          }
        }
      : {
          azureActiveDirectory: {
            enabled: true
            registration: {
              openIdIssuer: '${az.environment().authentication.loginEndpoint}${authTenantId}/v2.0'
              clientId: authClientId
              clientSecretSettingName: 'aad-client-secret'
            }
            validation: {
              // The sign-in flow's ID token carries aud = the client id. The
              // Application ID URI form is only the audience when the app is
              // called as an API. Accepting only the second would reject every
              // browser login, so both are listed.
              allowedAudiences: [
                authClientId
                'api://${authClientId}'
              ]
            }
          }
        }
    login: {
      preserveUrlFragmentsForLogins: false
      // Off deliberately. The token store persists the provider's access and
      // refresh tokens so an app can call downstream APIs as the signed-in
      // user; this one only ever reads the identity out of the injected header.
      // Enabling it also demands a blob container and a SAS URL setting, which
      // is a credential to rotate in exchange for nothing.
      tokenStore: { enabled: false }
    }
  }
}

output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output environmentId string = environment.id
