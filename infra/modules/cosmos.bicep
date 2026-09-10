param location string
param tags object
param accountName string
param freeTier bool
param throughput int

@description('Set true to allow key-based access. Left off so every caller uses Entra ID.')
param allowLocalAuth bool = false

var databaseName = 'wtla'

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  identity: { type: 'SystemAssigned' }
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: freeTier
    disableLocalAuth: !allowLocalAuth
    minimalTlsVersion: 'Tls12'
    consistencyPolicy: {
      // Session is the right default for a single-region catalogue: a writer
      // reads its own writes, which is all the admin portal needs.
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
    capabilities: []
  }
}

// Shared throughput across the whole database keeps the free-tier grant in one
// place. Both containers draw from it.
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: { id: databaseName }
    options: { throughput: throughput }
  }
}

// Vendors are few and read constantly; the id is the partition key so a lookup
// is always a point read.
resource vendors 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'vendors'
  properties: {
    resource: {
      id: 'vendors'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      uniqueKeyPolicy: {
        uniqueKeys: [
          { paths: ['/slug'] }
        ]
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/_etag/?' }]
      }
    }
  }
}

// Apps are partitioned by vendor so "every app for this vendor" — the admin
// portal's main query — stays inside one partition. Log paths are embedded on
// the app document: they are always read with it, always written with it, and
// bounded in number.
resource apps 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'apps'
  properties: {
    resource: {
      id: 'apps'
      partitionKey: {
        paths: ['/vendorId']
        kind: 'Hash'
      }
      uniqueKeyPolicy: {
        uniqueKeys: [
          { paths: ['/slug'] }
        ]
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [
          { path: '/_etag/?' }
          // Nothing queries inside an embedded path's note text.
          { path: '/logPaths/*/note/?' }
        ]
        compositeIndexes: [
          [
            { path: '/vendorId', order: 'ascending' }
            { path: '/name', order: 'ascending' }
          ]
          [
            { path: '/updatedAt', order: 'descending' }
          ]
        ]
      }
    }
  }
}

output accountName string = account.name
output endpoint string = account.properties.documentEndpoint
output databaseName string = database.name
output vendorsContainer string = vendors.name
output appsContainer string = apps.name
