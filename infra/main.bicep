targetScope = 'subscription'

@minLength(1)
@description('Name of the Azure Developer CLI environment.')
param environmentName string

@description('Primary location for all resources.')
param location string

@description('Object ID of the identity that deploys the website content.')
param principalId string

@allowed([
  'User'
  'ServicePrincipal'
])
@description('Type of identity that deploys the website content.')
param principalType string

var resourceGroupName = 'rg-${environmentName}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

module resources 'resources.bicep' = {
  name: 'devfest-resources'
  scope: resourceGroup
  params: {
    environmentName: environmentName
    location: location
    principalId: principalId
    principalType: principalType
  }
}

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_STORAGE_ACCOUNT_NAME string = resources.outputs.storageAccountName
