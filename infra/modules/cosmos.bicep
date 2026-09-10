param location string
param tags object
param accountName string
param freeTier bool
param throughput int

@description('''
How throughput is bought. Immutable after the account is created, so this is a
one-way door - choose before the first deployment.

serverless:  pay per request unit consumed. Right for a small catalogue that is
             cached in-process, where actual database traffic is a couple of
             queries per replica per minute.
provisioned: reserve `throughput` RU/s around the clock. Right when load is
             steady and high enough that reserved capacity is cheaper, or when
             autoscale, multi-region writes or availability zones are needed.
''')
@allowed(['serverless', 'provisioned'])
param mode string = 'serverless'

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
    capabilities: mode == 'serverless' ? [ { name: 'EnableServerless' } ] : []
  }
}

// A serverless account has no provisioned throughput to share; a provisioned
// one shares it across the whole database so both containers draw from one pool.
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: { id: databaseName }
    options: mode == 'provisioned' ? { throughput: throughput } : {}
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
      // No uniqueKeyPolicy: unique keys are scoped to a partition, and this
      // container partitions by /id, so every document is alone in its
      // partition and the constraint would enforce nothing. Slug uniqueness is
      // checked in the route handlers.
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Apps are partitioned by vendor so "every app for this vendor" - the admin
// portal's main query - stays inside one partition. Log paths are embedded on
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
      // Scoped to the partition key, so this makes a slug unique *within a
      // vendor*. Cross-vendor uniqueness is checked in the route handlers.
      uniqueKeyPolicy: {
        uniqueKeys: [
          { paths: ['/slug'] }
        ]
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        // Serves "every app for this vendor, by name" - the admin portal's main
        // query. Single-property ordering is served by the default range index
        // and needs nothing here.
        compositeIndexes: [
          [
            { path: '/vendorId', order: 'ascending' }
            { path: '/name', order: 'ascending' }
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
output mode string = mode
