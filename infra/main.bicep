targetScope = 'resourceGroup'

@description('Short name for the workload. Used as a prefix for every resource.')
@minLength(3)
@maxLength(12)
param workloadName string = 'wtla'

@description('Environment discriminator, e.g. prod or stage.')
@allowed(['prod', 'stage'])
param environmentName string = 'prod'

param location string = resourceGroup().location

@description('''
Cosmos DB free tier is limited to ONE account per Azure subscription, so this
is off. Turn it on only on a subscription that has no free-tier account, or the
deployment fails.
''')
param cosmosFreeTier bool = false

@description('''
How Cosmos throughput is bought. IMMUTABLE after the account is created.
Serverless bills per request unit consumed, which suits a catalogue this size
with a 60-second in-process cache in front of it.
''')
@allowed(['serverless', 'provisioned'])
param cosmosMode string = 'serverless'

@description('Shared RU/s for the database. Only read when cosmosMode is "provisioned".')
@minValue(400)
@maxValue(4000)
param cosmosThroughput int = 400

@description('''
The image the container runs. Left at the quickstart placeholder on a first
deploy, because the app image does not exist until the app workflow has run
once. The infrastructure workflow reads the currently deployed image and passes
it back in, so re-running infra never reverts the app.
''')
param containerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('0 scales to zero and costs almost nothing, at the price of a cold start. 1 keeps a tool people reach for mid-incident instant.')
@minValue(0)
@maxValue(5)
param minReplicas int = 1

@description('Entra ID app registration client id for admin sign-in. Empty deploys without authentication configured.')
param authClientId string = ''

@description('Entra ID tenant id. Only read when authClientId is set.')
param authTenantId string = ''

@description('Entra ID object IDs that should get Cosmos data-plane access for local development and seeding. Leave empty in CI.')
param developerPrincipalIds array = []

var token = uniqueString(resourceGroup().id, workloadName, environmentName)
var prefix = '${workloadName}-${environmentName}'
var tags = {
  workload: workloadName
  environment: environmentName
}

// Storage and registry names are alphanumeric-only and length limited.
var storageAccountName = toLower('st${workloadName}${environmentName}${take(token, 10)}')
var registryName = toLower('cr${workloadName}${environmentName}${take(token, 10)}')

// Cosmos data-plane roles are fixed GUIDs scoped to the account.
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'
// Storage Blob Data Contributor.
var blobContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    workspaceName: 'log-${prefix}-${token}'
    appInsightsName: 'appi-${prefix}-${token}'
  }
}

module data 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    location: location
    tags: tags
    accountName: 'cosmos-${prefix}-${token}'
    freeTier: cosmosFreeTier
    mode: cosmosMode
    throughput: cosmosThroughput
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    tags: tags
    accountName: storageAccountName
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    tags: tags
    name: registryName
  }
}

module web 'modules/containerapp.bicep' = {
  name: 'web'
  params: {
    location: location
    tags: tags
    environmentName: 'cae-${prefix}-${token}'
    appName: 'ca-${prefix}'
    logAnalyticsCustomerId: monitoring.outputs.customerId
    logAnalyticsSharedKey: monitoring.outputs.sharedKey
    registryLoginServer: registry.outputs.loginServer
    containerImage: containerImage
    cosmosEndpoint: data.outputs.endpoint
    cosmosDatabaseName: data.outputs.databaseName
    storageAccountName: storageAccountName
    iconsContainerName: storage.outputs.iconsContainerName
    iconsContainerUrl: storage.outputs.iconsContainerUrl
    appInsightsConnectionString: monitoring.outputs.connectionString
    minReplicas: minReplicas
    authClientId: authClientId
    authTenantId: authTenantId
  }
}

// --- Data-plane access, all by managed identity. No keys are issued. --------

module webAcrPull 'modules/acr-role.bicep' = {
  name: 'web-acr-pull'
  params: {
    registryName: registryName
    principalId: web.outputs.principalId
  }
}

module webCosmosAccess 'modules/cosmos-role.bicep' = {
  name: 'web-cosmos-access'
  params: {
    cosmosAccountName: data.outputs.accountName
    principalId: web.outputs.principalId
    roleDefinitionId: cosmosDataContributorRoleId
  }
}

module webBlobAccess 'modules/blob-role.bicep' = {
  name: 'web-blob-access'
  params: {
    storageAccountName: storageAccountName
    principalId: web.outputs.principalId
    roleDefinitionId: blobContributorRoleId
  }
}

module developerCosmosAccess 'modules/cosmos-role.bicep' = [
  for (principalId, i) in developerPrincipalIds: {
    name: 'dev-cosmos-access-${i}'
    params: {
      cosmosAccountName: data.outputs.accountName
      principalId: principalId
      roleDefinitionId: cosmosDataContributorRoleId
    }
  }
]

output containerAppName string = web.outputs.name
output siteUrl string = 'https://${web.outputs.fqdn}'
output registryName string = registry.outputs.name
output registryLoginServer string = registry.outputs.loginServer
output cosmosAccountName string = data.outputs.accountName
output cosmosEndpoint string = data.outputs.endpoint
output cosmosDatabaseName string = data.outputs.databaseName
output cosmosMode string = data.outputs.mode
output storageAccountName string = storage.outputs.name
output iconsContainerUrl string = storage.outputs.iconsContainerUrl
