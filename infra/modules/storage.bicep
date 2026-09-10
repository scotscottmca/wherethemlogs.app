param location string
param tags object
param accountName string

var iconsContainerName = 'icons'

resource account 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    // The icons container is public-read on purpose: icons are served straight
    // to the browser and there is nothing private about a vendor logo.
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: account
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'HEAD', 'OPTIONS']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource icons 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: iconsContainerName
  properties: {
    publicAccess: 'Blob'
  }
}

output name string = account.name
output id string = account.id
output iconsContainerName string = iconsContainerName
output iconsContainerUrl string = '${account.properties.primaryEndpoints.blob}${iconsContainerName}'
