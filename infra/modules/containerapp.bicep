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

@description('Entra ID app registration client id for the admin sign-in. Leave empty to deploy without authentication configured.')
param authClientId string = ''

@description('Entra ID tenant id. Only read when authClientId is set.')
param authTenantId string = ''

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
// catalogue is public; the app's middleware and route handlers decide what the
// admin surface needs. Skipped entirely until an app registration exists.
resource authConfig 'Microsoft.App/containerApps/authConfigs@2024-03-01' = if (!empty(authClientId)) {
  parent: containerApp
  name: 'current'
  properties: {
    platform: { enabled: true }
    globalValidation: {
      unauthenticatedClientAction: 'AllowAnonymous'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          openIdIssuer: '${az.environment().authentication.loginEndpoint}${authTenantId}/v2.0'
          clientId: authClientId
          clientSecretSettingName: 'aad-client-secret'
        }
        validation: {
          allowedAudiences: [ 'api://${authClientId}' ]
        }
      }
    }
    login: {
      preserveUrlFragmentsForLogins: false
      tokenStore: { enabled: true }
    }
  }
}

output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output environmentId string = environment.id
