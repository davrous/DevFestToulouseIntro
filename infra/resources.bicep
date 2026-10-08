@minLength(1)
@description('Name of the Azure Developer CLI environment.')
param environmentName string

@description('Location for the storage account.')
param location string

@description('Object ID of the identity that deploys the website content.')
param principalId string

@allowed([
  'User'
  'ServicePrincipal'
])
@description('Type of identity that deploys the website content.')
param principalType string

var storageAccountName = 'stdevfest${uniqueString(subscription().id, environmentName)}'
var blobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)
var storageAccountContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '17d1049b-9a84-46fb-8f53-869881c3d3ab'
)

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'web'
  }
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource contentDeploymentRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, blobDataContributorRoleId)
  scope: storageAccount
  properties: {
    principalId: principalId
    principalType: principalType
    roleDefinitionId: blobDataContributorRoleId
  }
}

resource websiteConfigurationRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, storageAccountContributorRoleId)
  scope: storageAccount
  properties: {
    principalId: principalId
    principalType: principalType
    roleDefinitionId: storageAccountContributorRoleId
  }
}

output storageAccountName string = storageAccount.name
