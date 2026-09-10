@description('Grants a principal data-plane access to Cosmos. Control-plane RBAC does not cover documents.')
param cosmosAccountName string
param principalId string
param roleDefinitionId string

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' existing = {
  name: cosmosAccountName
}

resource assignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = {
  parent: account
  name: guid(account.id, principalId, roleDefinitionId)
  properties: {
    principalId: principalId
    roleDefinitionId: '${account.id}/sqlRoleDefinitions/${roleDefinitionId}'
    scope: account.id
  }
}
