#!/usr/bin/env bash
set -euo pipefail

npm ci
npm run build

account_name="$(azd env get-value AZURE_STORAGE_ACCOUNT_NAME)"
resource_group="$(azd env get-value AZURE_RESOURCE_GROUP)"

for attempt in 1 2 3 4 5 6; do
  if az storage blob service-properties update \
    --account-name "$account_name" \
    --auth-mode login \
    --static-website true \
    --index-document index.html \
    --404-document index.html \
    --only-show-errors >/dev/null \
  && az storage blob upload-batch \
    --account-name "$account_name" \
    --auth-mode login \
    --destination '$web' \
    --source dist \
    --overwrite true \
    --only-show-errors; then
    website_url="$(az storage account show \
      --name "$account_name" \
      --resource-group "$resource_group" \
      --query primaryEndpoints.web \
      --output tsv)"
    azd env set WEBSITE_URL "$website_url"
    exit 0
  fi

  if [[ "$attempt" -eq 6 ]]; then
    echo "Static website upload failed after waiting for the deployment role assignment." >&2
    exit 1
  fi

  sleep 10
done
