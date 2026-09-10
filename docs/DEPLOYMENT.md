# Deployment

Three deployables, three workflows, one resource group. Do the first-run steps
in order — after that, merging a PR is the whole process.

## First run

### 1. Resource group

```bash
az login
az account set --subscription "<subscription-id>"
az group create --name rg-wtla-prod --location westeurope
```

### 2. Give GitHub a way in (OIDC, no stored secrets)

```bash
az ad app create --display-name "wtla-deploy"
APP_ID=$(az ad app list --display-name "wtla-deploy" --query "[0].appId" -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "wtla-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:scotscottmca/wherethemlogs.app:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "wtla-env-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:scotscottmca/wherethemlogs.app:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'

SP_ID=$(az ad sp list --display-name "wtla-deploy" --query "[0].id" -o tsv)
RG_ID=$(az group show --name rg-wtla-prod --query id -o tsv)
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$RG_ID"
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role "User Access Administrator" --scope "$RG_ID"
```

`User Access Administrator` is needed because the Bicep creates role
assignments (the Function App's access to Cosmos and Blob). Drop it afterwards
if that makes you happier; you will need it again for infra changes that touch
identity.

### 3. Deploy the infrastructure

Add your own object id so you can seed and debug against Cosmos:

```bash
az ad signed-in-user show --query id -o tsv
```

Put it in `infra/main.parameters.json` under `developerPrincipalIds`, then:

```bash
az deployment group create \
  --resource-group rg-wtla-prod \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --query properties.outputs
```

Keep the outputs — `staticWebAppName`, `functionAppName`, `cosmosAccountName`.

> **Cosmos free tier is one account per subscription.** If the deployment fails
> on the Cosmos resource, the subscription already has one: set
> `cosmosFreeTier` to `false` and re-run.

### 4. Repository secrets and variables

**Settings → Secrets and variables → Actions**

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | `$APP_ID` from step 2 |
| Secret | `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| Secret | `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | see below |
| Variable | `AZURE_RESOURCE_GROUP` | `rg-wtla-prod` |
| Variable | `AZURE_FUNCTIONAPP_NAME` | `functionAppName` output |

```bash
az staticwebapp secrets list --name <staticWebAppName> \
  --query "properties.apiKey" -o tsv
```

Create a GitHub **environment** called `production` (and `preview`, for PR
deploys) so the deploy jobs and the federated credentials line up.

### 5. Seed the catalogue

```bash
npm install
npm run seed -- --endpoint https://<cosmosAccountName>.documents.azure.com:443/
```

24 vendors, 33 apps, 86 log paths. Idempotent — re-running upserts by id. It
never deletes, so a record dropped from `scripts/seed-data.json` stays in the
database.

If this fails with `Forbidden`, your object id is not in
`developerPrincipalIds`; add it and redeploy the infra.

### 6. Turn on sign-in for the admin surface

Register an Entra ID application for the site, then:

```bash
az staticwebapp appsettings set --name <staticWebAppName> --setting-names \
  AAD_CLIENT_ID=<app-registration-client-id> \
  AAD_CLIENT_SECRET=<client-secret>
```

Put your tenant id into `staticwebapp.config.json` where it says `<TENANT_ID>`.
The app registration's redirect URI is
`https://<hostname>/.auth/login/aad/callback`.

Then grant yourself the role — **Static Web App → Role management → Invite**,
role `admin`. To follow an Entra group instead, see *Roles from a group* below.

### 7. Lock down the Function App

The Function App has a public hostname of its own. Until this is done, the only
thing standing between the internet and `/api/admin/*` is a header anyone can
set:

```bash
az webapp auth microsoft update --name <functionAppName> --resource-group rg-wtla-prod \
  --client-id <app-registration-client-id> \
  --issuer "https://login.microsoftonline.com/<tenant-id>/v2.0" \
  --yes

az webapp auth update --name <functionAppName> --resource-group rg-wtla-prod \
  --unauthenticated-client-action RedirectToLoginPage
```

Verify afterwards that the site still works — SWA's linked-backend call must
still get through. If it does not, allow anonymous access and instead restrict
`/api/admin/*` at the app level. Do not skip this step and do not treat the
in-code role check as sufficient; it is defence in depth, not the lock.

## After the first run

Merge a PR into `main`. Path filters decide what moves:

| You changed | What deploys |
| --- | --- |
| `app/`, `components/`, `lib/`, `public/`, `staticwebapp.config.json`, `next.config.mjs`, root `package*.json` | the site |
| `api/` | the Function App |
| `infra/` | Bicep, incremental |

Nothing else redeploys. Every PR gets a preview environment if it touches the
site, torn down when the PR closes.

Deploy order matters exactly once: **a breaking API change ships before the site
that depends on it.** Two PRs, API first.

## Local development

Two terminals.

```bash
# 1 — the API
cd api
cp local.settings.json.example local.settings.json   # fill in COSMOS_ENDPOINT etc.
npm install
npm start                                            # http://localhost:7071
```

```bash
# 2 — the site
npm install
NEXT_PUBLIC_API_BASE=http://localhost:7071 npm run dev   # http://localhost:3777
```

Needs [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
and `az login` with an account in `developerPrincipalIds`.

To exercise admin routes locally, set `LOCAL_ADMIN_BYPASS=true` in
`local.settings.json`. It short-circuits the role check and exists in no
deployed configuration — `local.settings.json` is gitignored, and the Bicep
never sets it.

Alternatively run the whole thing behind the SWA CLI, which emulates the proxy
and the auth header:

```bash
npm run build
npx @azure/static-web-apps-cli start out --api-location api --api-devserver-url http://localhost:7071
```

## Roles from a group

Instead of inviting people one at a time:

```bash
az functionapp config appsettings set --name <functionAppName> --resource-group rg-wtla-prod \
  --settings ADMIN_GROUP_IDS=<entra-group-object-id>
```

Add to the `auth` block in `staticwebapp.config.json`:

```json
"rolesSource": "/api/roles"
```

and add a groups claim to the app registration's token configuration.
`api/src/functions/roles.ts` is already written.

## Rollback

- **Site** — Static Web Apps keeps previous deployments; repoint in the portal, or revert the commit and let the workflow run.
- **API** — `az functionapp deployment source config-zip` with a previous artifact, or revert and re-run.
- **Infra** — Bicep is incremental and declarative: revert the template and redeploy. It will not delete resources the template no longer mentions; remove those by hand.
- **Data** — Cosmos periodic backup, four-hourly with eight hours of retention. Restoring means opening a support request. If the catalogue becomes valuable, switch `backupPolicy` to `Continuous` for self-service point-in-time restore.

## Health

```bash
curl https://<hostname>/api/health
curl "https://<hostname>/api/search?q=teams&platform=windows"
```

`deploy-api.yml` polls `/api/health` for a minute after every deploy and fails
the run if it never answers.
