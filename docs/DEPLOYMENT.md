# Deployment

Two deployables - the application image and the Azure resources - with a
workflow each. Do the first-run steps in order; after that, merging a PR is the
whole process.

> **Shell note.** The commands below are bash. In PowerShell, variable
> assignment is `$VAR = ...` and a backslash is not an escape character, so
> inline JSON like `'{\"name\": ...}'` arrives at `az` mangled. Every place
> this guide passes JSON, there is a PowerShell block beside it that writes the
> JSON to a file and passes `@file` instead - which is what Azure's own docs
> recommend when quoting bites.

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

# GitHub issues OIDC subjects with immutable numeric IDs for the owner and the
# repository, so the subject is NOT the "repo:owner/name:..." string most
# guides show. Derive it rather than typing it.
OWNER=scotscottmca
REPO=wherethemlogs.app
OWNER_ID=$(gh api "users/$OWNER" --jq .id)
REPO_ID=$(gh api "repos/$OWNER/$REPO" --jq .id)
SUBJECT_PREFIX="repo:${OWNER}@${OWNER_ID}/${REPO}@${REPO_ID}"

# One for the jobs that run on a branch, one for the jobs that run in the
# "production" GitHub environment. Both are needed: deploy-infra's lint job has
# no environment and its deploy job does.
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"wtla-main\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"${SUBJECT_PREFIX}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"wtla-env-production\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"${SUBJECT_PREFIX}:environment:production\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

<details>
<summary>The same two credentials, in PowerShell</summary>

```powershell
$APP_ID = az ad app list --display-name "wtla-deploy" --query "[0].appId" -o tsv
$OWNER_ID = gh api users/scotscottmca --jq .id
$REPO_ID = gh api repos/scotscottmca/wherethemlogs.app --jq .id
$PREFIX = "repo:scotscottmca@$OWNER_ID/wherethemlogs.app@$REPO_ID"

# A literal here-string: no interpolation, no escaping, no shell mangling.
@"
{
  "name": "wtla-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "${PREFIX}:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
"@ | Set-Content fic-main.json -Encoding utf8

@"
{
  "name": "wtla-env-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "${PREFIX}:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}
"@ | Set-Content fic-env.json -Encoding utf8

az ad app federated-credential create --id $APP_ID --parameters "@fic-main.json"
az ad app federated-credential create --id $APP_ID --parameters "@fic-env.json"
Remove-Item fic-main.json, fic-env.json
```

</details>

SP_ID=$(az ad sp list --display-name "wtla-deploy" --query "[0].id" -o tsv)
RG_ID=$(az group show --name rg-wtla-prod --query id -o tsv)
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$RG_ID"
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role "User Access Administrator" --scope "$RG_ID"
```

**If sign-in fails with `AADSTS700213: No matching federated identity record
found`**, the credential's subject does not match what GitHub actually sent.
Do not guess it - the failing run prints it. Open the run, expand *Sign in to
Azure*, and read the line beginning `subject claim -`. Create a credential whose
`subject` is that string exactly.

```bash
az ad app federated-credential list --id "$APP_ID" --query "[].{name:name,subject:subject}" -o table
```

Both credentials matter: `deploy-infra`'s lint job runs on the branch and its
deploy job runs in the `production` environment, so they present different
subjects.

`User Access Administrator` is needed because the Bicep creates role
assignments - the container's access to Cosmos, Blob and the registry.

### 3. Deploy the infrastructure

Add your own object id so you can seed and debug against Cosmos. Cosmos
data-plane RBAC is a separate system from Azure RBAC - being Owner on the
subscription grants nothing inside the account, so without this the seed script
gets a 403.

```bash
az ad signed-in-user show --query id -o tsv
```

Put it in `infra/main.parameters.json` under `developerPrincipalIds` **and commit
it**. An object id is an identifier, not a credential. It has to be committed
because the workflows deploy the file from the repository: leave it only in your
working tree and a workflow run will not create the assignment, which is a
confusing way to lose access you thought you had.

Then:

```bash
az deployment group create \
  --resource-group rg-wtla-prod \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --query properties.outputs
```

Keep the outputs - `containerAppName`, `registryName`, `cosmosAccountName`,
`siteUrl`.

**The container app is not created by this step**, and `containerAppName` and
`siteUrl` come back empty. That is expected: the image does not exist yet, and
there is no placeholder. Step 5 creates the app and fills both in.

Everything else - registry, Cosmos, storage, monitoring, and the managed
identity with its role assignments - is created here, which is what step 5
needs.

> **Cosmos is serverless and free tier is off.** Both are set in
> `infra/main.parameters.json`, and both are decided at account creation -
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
change under `app/`. It builds the image in ACR, deploys the template with that
image - which creates the container app the first time - and polls `/api/health`
until the revision answers.

`/api/health` returns 200 with counts of zero on an empty catalogue, so this
passes before seeding. A failure here means the app cannot reach Cosmos, not
that the catalogue is empty.

### 6. Seed the catalogue

```bash
npm install
npm run seed -- --endpoint https://<cosmosAccountName>.documents.azure.com:443/
```

24 vendors, 33 apps, 86 log paths. Idempotent - re-running upserts by id. It
never deletes, so a record dropped from `scripts/seed-data.json` stays in the
database.

`Forbidden` here means the identity has no Cosmos data-plane role. The script
prints the principal that was refused and the exact command to grant it. To fix
it permanently rather than for this machine, add the id to
`developerPrincipalIds` and redeploy the infrastructure.

### 7. Turn on sign-in for the admin surface

Until this is done `/admin` is unreachable by anyone, including you: with no
provider configured there is no `/.auth/login/...` endpoint to redirect to.

**Create a GitHub OAuth app** at <https://github.com/settings/developers>:

| Field | Value |
| --- | --- |
| Application name | Where Them Logs App |
| Homepage URL | `https://<your-fqdn>` |
| Authorization callback URL | `https://<your-fqdn>/.auth/login/github/callback` |

Generate a client secret, then put it on the container app. It is set directly
so it never passes through a template or a parameters file:

```bash
az containerapp secret set -n <containerAppName> -g rg-wtla-prod \
  --secrets github-client-secret=<the-secret-value>
```

Set these in `infra/main.parameters.json` and redeploy the infrastructure:

```json
"authProvider":      { "value": "github" },
"authClientId":      { "value": "<the OAuth app client id>" },
"adminGithubLogins": { "value": "scotscottmca" }
```

**GitHub authenticates but carries no roles**, so `adminGithubLogins` is the
authorization list: comma separated, matched against the login or the numeric
user id. Empty means nobody is an admin. Signing in is never sufficient on its
own, so a stranger who finds the site and signs in gets the 403 page, not the
catalogue.

If a login that should work does not, sign in and open `/api/me`. It returns
your own claims verbatim, so you can put the value that actually arrives into
the allowlist rather than guessing which claim type the provider used.

<details>
<summary>Entra ID instead, if this ever needs org SSO</summary>

Register an application, add an **app role** with value `admin`, assign users
or groups to it, then set `authProvider` to `aad` with `authClientId` and
`authTenantId`, and store the secret as `aad-client-secret`. The role arrives in
the token's `roles` claim and the directory becomes the allowlist, so
`adminGithubLogins` is not used. Both paths are supported at once by the code;
only one provider can be configured on the container app at a time.

</details>

## After the first run

Merge a PR into `main`. Path filters decide what moves:

| You changed | What deploys |
| --- | --- |
| `app/`, `components/`, `lib/`, `public/`, `middleware.ts`, `next.config.mjs`, `Dockerfile`, root `package*.json` | a new container revision |
| `infra/` | Bicep, incremental |

Every PR runs CI: typecheck, `next build`, a container build, and a boot check
that exercises the routes. `next build` will happily compile a route tree that
crashes at runtime - two different dynamic segment names on one path, for
example - so the boot check is not ceremony.

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
reachable without a signed-in principal. No deployed configuration sets it - the
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

**The application** - revisions, and this is the fast one:

```bash
az containerapp revision list -n <containerAppName> -g rg-wtla-prod -o table
az containerapp ingress traffic set -n <containerAppName> -g rg-wtla-prod \
  --revision-weight <previous-revision>=100
```

Seconds, and the previous revision is still warm. Reverting the commit is the
follow-up, not the fix.

**Infrastructure** - Bicep is incremental and declarative: revert the template
and redeploy. It will not delete resources the template no longer mentions;
remove those by hand.

**Data** - Cosmos periodic backup, four-hourly with eight hours of retention.
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
