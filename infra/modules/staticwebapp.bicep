param location string
param tags object
param name string
param backendResourceId string
param backendRegion string

// Standard is required for two things this design depends on: linking a
// separately deployed backend, and custom role assignment on routes.
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    // The site is deployed by the GitHub workflow, not by SWA's own build.
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// Routes /api/* on the Static Web App's own domain to the Function App, and
// forwards the authenticated principal with it.
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: swa
  name: 'api'
  properties: {
    backendResourceId: backendResourceId
    region: backendRegion
  }
}

output name string = swa.name
output id string = swa.id
output defaultHostname string = swa.properties.defaultHostname
