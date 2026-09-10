param location string
param tags object
param name string

/**
 * A user-assigned identity, created before anything that needs it.
 *
 * A system-assigned identity would be created *with* the container app, which
 * makes its role assignments circular: the app cannot pull its own image from
 * the registry until a role is granted to a principal that does not exist until
 * the app is created. Creating the identity first breaks that.
 */
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: name
  location: location
  tags: tags
}

output id string = identity.id
output principalId string = identity.properties.principalId
output clientId string = identity.properties.clientId
