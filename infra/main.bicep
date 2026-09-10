targetScope = 'resourceGroup'

@description('Short name for the workload. Used as a prefix for every resource.')
@minLength(3)
@maxLength(12)
param workloadName string = 'wtla'

@description('Environment discriminator, e.g. prod or stage.')
@allowed(['prod', 'stage'])
param environmentName string = 'prod'

@description('Region for everything except the Static Web App.')
param location string = resourceGroup().location

@description('''
Static Web Apps is available in a limited set of regions. Pick the closest to
`location`; the linked backend may live in a different region.
''')
@allowed(['westeurope', 'centralus', 'eastus2', 'westus2', 'eastasia'])
param staticWebAppLocation string = 'westeurope'

@description('''
Cosmos DB free tier is limited to ONE account per Azure subscription. Set this
to false if the subscription already has a free-tier account, or the deployment
will fail.
''')
param cosmosFreeTier bool = true

@description('Shared throughput for the database, in RU/s. 400 is the minimum and sits inside the free tier grant of 1000.')
@minValue(400)
@maxValue(1000)
param cosmosThroughput int = 400

@description('Entra ID object IDs that should get Cosmos data-plane access for local development and seeding. Leave empty in CI.')
param developerPrincipalIds array = []

var token = uniqueString(resourceGroup().id, workloadName, environmentName)
var prefix = '${workloadName}-${environmentName}'
var tags = {
  workload: workloadName
  environment: environmentName
  'azd-env-name': prefix
}

// Cosmos data-plane role ids are fixed GUIDs scoped to the account.
// Storage account names are 3-24 chars, lowercase alphanumeric only.
var storageAccountName = toLower('st${workloadName}${environmentName}${take(token, 10)}')

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

module api 'modules/functions.bicep' = {
  name: 'api'
  params: {
    location: location
    tags: tags
    planName: 'plan-${prefix}-${token}'
    functionAppName: 'func-${prefix}-${token}'
    storageAccountName: storage.outputs.name
    appInsightsConnectionString: monitoring.outputs.connectionString
    cosmosEndpoint: data.outputs.endpoint
    cosmosDatabaseName: data.outputs.databaseName
    iconsContainerUrl: storage.outputs.iconsContainerUrl
    iconsContainerName: storage.outputs.iconsContainerName
  }
}

module web 'modules/staticwebapp.bicep' = {
  name: 'web'
  params: {
    location: staticWebAppLocation
    tags: tags
    name: 'stapp-${prefix}-${token}'
    backendResourceId: api.outputs.functionAppId
    backendRegion: location
  }
}

// --- Data-plane access, all by managed identity. No keys are issued. --------

module apiCosmosAccess 'modules/cosmos-role.bicep' = {
  name: 'api-cosmos-access'
  params: {
    cosmosAccountName: data.outputs.accountName
    principalId: api.outputs.principalId
    roleDefinitionId: cosmosDataContributorRoleId
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

// The API writes vendor and app icons into the public blob container.
module apiBlobAccess 'modules/blob-role.bicep' = {
  name: 'api-blob-access'
  params: {
    storageAccountName: storageAccountName
    principalId: api.outputs.principalId
    roleDefinitionId: blobContributorRoleId
  }
}

output staticWebAppName string = web.outputs.name
output staticWebAppHostname string = web.outputs.defaultHostname
output functionAppName string = api.outputs.functionAppName
output cosmosAccountName string = data.outputs.accountName
output cosmosDatabaseName string = data.outputs.databaseName
output storageAccountName string = storage.outputs.name
output iconsContainerUrl string = storage.outputs.iconsContainerUrl
