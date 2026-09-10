# Deployment

Two deployables — the application image and the Azure resources — with a
workflow each. Do the first-run steps in order; after that, merging a PR is the
whole process.

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

Both federated credentials matter: the deploy jobs run in a GitHub environment
called `production`, so the subject is the environment, not the branch. Missing
one of these is what produced `Not all values are present` on the first attempt.

`User Access Administrator` is needed because the Bicep creates role
assignments — the container's access to Cosmos, Blob and the registry.

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

Keep the outputs — `containerAppName`, `registryName`, `cosmosAccountName`,
`siteUrl`.

The container app comes up on a placeholder image, because the real one does not
exist yet. Its ingress port and health probes stay off until step 5 supplies a
real image — the placeholder serves port 80 and has no `/api/live`, and probing
it would fail the revision. That is expected.

If a deployment has already failed and left the app in a terminal state, delete
it before re-running; there is nothing in it to preserve:

```bash
az containerapp delete -n ca-wtla-prod -g rg-wtla-prod --yes
```

> **Cosmos is serverless and free tier is off.** Both are set in
> `infra/main.parameters.json`, and both are decided at account creation —
> switching afterwards means a new account and a data migration. Change
> `cosmosMode` now or not at all.

### 4. Repository secrets and variables

**Settings → Secrets and variables → Actions**

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | `$APP_ID` from step 2 |
| Secret | `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| Secret | `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| Variable | `AZURE_RESOURCE_GROUP` | `rg-wtla-prod` |
| Variable | `AZURE_CONTAINERAPP_NAME` | `containerAppName` output |
| Variable | `AZURE_REGISTRY_NAME` | `registryName` output |

Create a GitHub **environment** named `production`, so the deploy jobs and the
federated credential in step 2 line up.

### 5. Ship the first image

Run **Deploy app** manually (Actions → Deploy app → Run workflow), or push any
change under `app/`. It builds in ACR, rolls a new revision, and polls
`/api/health` until the revision answers.

### 6. Seed the catalogue

```bash
npm install
npm run seed -- --endpoint https://<cosmosAccountName>.documents.azure.com:443/
```

24 vendors, 33 apps, 86 log paths. Idempotent — re-running upserts by id. It
never deletes, so a record dropped from `scripts/seed-data.json` stays in the
database.

`Forbidden` here means your object id is not in `developerPrincipalIds`; add it
and redeploy the infrastructure.

### 7. Turn on sign-in for the admin surface

Register an Entra ID application for the site:

```bash
SITE=$(az containerapp show -n <containerAppName> -g rg-wtla-prod \
  --query properties.configuration.ingress.fqdn -o tsv)

az ad app create --display-name "Where Them Logs App" \
  --web-redirect-uris "https://$SITE/.auth/login/aad/callback" \
  --sign-in-audience AzureADMyOrg
```

Add an **app role** called `admin` to that registration (Portal → App
registrations → your app → App roles → Create):

| Field | Value |
| --- | --- |
| Display name | Admin |
| Allowed member types | Users/Groups |
| Value | `admin` |
| Description | Can add, edit and delete catalogue records |

Then assign yourself or a group to it under **Enterprise applications → your app
→ Users and groups**. That claim is what `requireAdmin()` reads; there is no
separate invitation list.

Create a client secret, store it on the container app, and re-deploy the
infrastructure with the auth parameters filled in:

```bash
az containerapp secret set -n <containerAppName> -g rg-wtla-prod \
  --secrets aad-client-secret=<the-secret-value>
```

Set `authClientId` and `authTenantId` in `infra/main.parameters.json`, then
re-run the infrastructure deployment. Until they are set, the app deploys with
no authentication configured and `/admin` simply has nowhere to send you.

## After the first run

Merge a PR into `main`. Path filters decide what moves:

| You changed | What deploys |
| --- | --- |
| `app/`, `components/`, `lib/`, `public/`, `middleware.ts`, `next.config.mjs`, `Dockerfile`, root `package*.json` | a new container revision |
| `infra/` | Bicep, incremental |

Every PR runs CI: typecheck, `next build`, a container build, and a boot check
that exercises the routes. `next build` will happily compile a route tree that
crashes at runtime — two different dynamic segment names on one path, for
example — so the boot check is not ceremony.

## Local development

```bash
npm install
LOCAL_ADMIN_BYPASS=true \
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/ \
COSMOS_DATABASE=wtla \
npm run dev            # http://localhost:3777
```

Needs `az login` with an account listed in `developerPrincipalIds`.

`LOCAL_ADMIN_BYPASS=true` short-circuits the role check so admin routes are
reachable without a signed-in principal. No deployed configuration sets it — the
Bicep never emits it.

To exercise the container as it actually ships:

```bash
docker build -t wtla:local .
docker run --rm -p 3888:3000 \
  -e COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/ \
  -e COSMOS_DATABASE=wtla \
  wtla:local
```

Note that the container has no Azure identity on your machine, so Cosmos calls
fail and the pages render their "not answering" state. That path is worth
seeing; it is what a real outage looks like.

## Rollback

**The application** — revisions, and this is the fast one:

```bash
az containerapp revision list -n <containerAppName> -g rg-wtla-prod -o table
az containerapp ingress traffic set -n <containerAppName> -g rg-wtla-prod \
  --revision-weight <previous-revision>=100
```

Seconds, and the previous revision is still warm. Reverting the commit is the
follow-up, not the fix.

**Infrastructure** — Bicep is incremental and declarative: revert the template
and redeploy. It will not delete resources the template no longer mentions;
remove those by hand.

**Data** — Cosmos periodic backup, four-hourly with eight hours of retention.
Restoring means opening a support request. If the catalogue becomes valuable,
switch `backupPolicy` to `Continuous` for self-service point-in-time restore.

## Health

```bash
curl https://<site>/api/live      # is the process answering
curl https://<site>/api/health    # can it reach Cosmos
curl "https://<site>/api/search?q=teams&platform=windows"
```

Logs:

```bash
az containerapp logs show -n <containerAppName> -g rg-wtla-prod --follow
```
