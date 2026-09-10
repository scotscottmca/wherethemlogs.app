param location string
param tags object
param name string

// Basic is the cheapest tier that supports managed-identity pulls. The image
// is small and there is one of it.
resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

output name string = registry.name
output loginServer string = registry.properties.loginServer
output id string = registry.id
