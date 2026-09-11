# Deployment

Two deployables - the application image and the Azure resources - with a
workflow each. Do the first-run steps in order; after that, merging a PR is the
whole process.

> **These commands are PowerShell.** Two things bite if you paste bash into it:
> assignment is `$VAR = ...` rather than `VAR=...`, and a backslash is neither a
> line continuation nor an escape character. Line continuation is a backtick,
> and JSON is passed as a file rather than an inline string, which is what
> Azure's own guidance recommends when quoting bites.
>
> `${VAR}` braces are not decoration where a colon follows the name: `"$PREFIX:ref"`
> makes PowerShell look for a drive called `PREFIX`.

## First run

### 1. Resource group

```powershell
az login
az account set --subscription "<subscription-id>"
az group create --name rg-wtla-prod --location westeurope
```

### 2. Give GitHub a way in (OIDC, no stored secrets)

```powershell
az ad app create --display-name "wtla-deploy"
$APP_ID = az ad app list --display-name "wtla-deploy" --query "[0].appId" -o tsv
az ad sp create --id $APP_ID
```

GitHub issues OIDC subjects carrying immutable numeric ids for the owner and the
repository, so the subject is **not** the `repo:owner/name:...` string most
guides show. Derive it rather than typing it:

```powershell
$OWNER = "scotscottmca"
$REPO  = "wherethemlogs.app"
$OWNER_ID = gh api "users/$OWNER" --jq .id
$REPO_ID  = gh api "repos/$OWNER/$REPO" --jq .id
$PREFIX = "repo:${OWNER}@${OWNER_ID}/${REPO}@${REPO_ID}"
$PREFIX
```

Two credentials are needed, because `deploy-infra`'s lint job runs on the branch
while its deploy job runs in the `production` GitHub environment, and they
present different subjects.

```powershell
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

Then give the service principal its roles:

```powershell
$SP_ID = az ad sp list --display-name "wtla-deploy" --query "[0].id" -o tsv
$RG_ID = az group show --name rg-wtla-prod --query id -o tsv

az role assignment create --assignee-object-id $SP_ID `
  --assignee-principal-type ServicePrincipal `
  --role Contributor --scope $RG_ID

az role assignment create --assignee-object-id $SP_ID `
  --assignee-principal-type ServicePrincipal `
  --role "User Access Administrator" --scope $RG_ID
```

`User Access Administrator` is needed because the Bicep creates role
assignments - the container's access to Cosmos, Blob and the registry.

**If sign-in fails with `AADSTS700213: No matching federated identity record
found`**, the credential's subject does not match what GitHub actually sent. Do
not guess it - the failing run prints it. Open the run, expand *Sign in to
Azure*, and read the line beginning `subject claim -`. Create a credential whose
`subject` is that string exactly.

```powershell
az ad app federated-credential list --id $APP_ID --query "[].{name:name,subject:subject}" -o table
```

### 3. Deploy the infrastructure

Add your own object id so you can seed and debug against Cosmos. Cosmos
data-plane RBAC is a separate system from Azure RBAC - being Owner on the
subscription grants nothing inside the account, so without this the seed script
gets a 403.

```powershell
az ad signed-in-user show --query id -o tsv
```

Put it in `infra/main.parameters.json` under `developerPrincipalIds` **and commit
it**. An object id is an identifier, not a credential. It has to be committed
because the workflows deploy the file from the repository: leave it only in your
working tree and a workflow run will not create the assignment, which is a
confusing way to lose access you thought you had.

Then:

```powershell
az deployment group create `
  --resource-group rg-wtla-prod `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.json `
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

**Settings, Secrets and variables, Actions**

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | `$APP_ID` from step 2 |
| Secret | `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| Secret | `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| Variable | `AZURE_RESOURCE_GROUP` | `rg-wtla-prod` |
| Variable | `AZURE_CONTAINERAPP_NAME` | `containerAppName` output |
| Variable | `AZURE_REGISTRY_NAME` | `registryName` output |

Setting them from the terminal instead:

```powershell
gh secret set AZURE_CLIENT_ID --body $APP_ID
gh secret set AZURE_TENANT_ID --body (az account show --query tenantId -o tsv)
gh secret set AZURE_SUBSCRIPTION_ID --body (az account show --query id -o tsv)

gh variable set AZURE_RESOURCE_GROUP --body "rg-wtla-prod"
gh variable set AZURE_CONTAINERAPP_NAME --body "ca-wtla-prod"
gh variable set AZURE_REGISTRY_NAME --body "crwtlaprods7gilgc3be"
```

Create a GitHub **environment** named `production`, so the deploy jobs and the
federated credential in step 2 line up.

### 5. Ship the first image

Run **Deploy app** manually (Actions, Deploy app, Run workflow), or push any
change under `app/`. It builds the image in ACR, deploys the template with that
image - which creates the container app the first time - and polls `/api/health`
until the revision answers.

```powershell
gh workflow run deploy-app.yml --ref main
gh run watch
```

`/api/health` returns 200 with counts of zero on an empty catalogue, so this
passes before seeding. A failure here means the app cannot reach Cosmos, not
that the catalogue is empty.

### 6. Seed the catalogue

```powershell
npm install
npm run seed -- --endpoint https://cosmos-wtla-prod-s7gilgc3beox2.documents.azure.com:443/
```

24 vendors, 33 apps, 86 log paths. Idempotent - re-running upserts by id. It
never deletes, so a record dropped from `scripts/seed-data.json` stays in the
database.

`Forbidden` here means the identity has no Cosmos data-plane role. The script
prints the principal that was refused and the exact command to grant it. To fix
it permanently rather than for this machine, add the id to
`developerPrincipalIds` and redeploy the infrastructure.

### 7. Turn on sign-in for the admin surface

Until this is done `/admin` returns 503 and says so plainly: no provider is
configured, so there is nothing to sign in to.

Entra ID, single tenant, assignment required. That combination shuts the front
door rather than guarding it: nobody outside the tenant can complete sign-in at
all, and inside it only accounts you explicitly assign get a token.

**Register the application:**

```powershell
$SITE = az containerapp show -n ca-wtla-prod -g rg-wtla-prod `
  --query properties.configuration.ingress.fqdn -o tsv

# Check it before using it. An empty $SITE builds "https:///.auth/..." and az
# rejects that as "Invalid value specified for property 'web'", which names the
# property rather than the missing hostname.
if (-not $SITE) { throw "Could not read the container app FQDN. Is ca-wtla-prod deployed?" }
"Redirect URI: https://$SITE/.auth/login/aad/callback"

az ad app create --display-name "Where Them Logs App" `
  --web-redirect-uris "https://$SITE/.auth/login/aad/callback" `
  --sign-in-audience AzureADMyOrg `
  --enable-id-token-issuance true
```

`--enable-id-token-issuance` is not optional and is easy to miss, because the
portal's web-app wizard ticks it for you while the CLI does not. The platform
signs people in with `response_type=code id_token` and `response_mode=form_post`,
so without it Entra posts back to the callback with no ID token and the whole
thing ends as a bare `401` on `POST /.auth/login/aad/callback` - which names
nothing and looks like a bad client secret.

On a registration that already exists:

```powershell
az ad app update --id $CLIENT_ID --enable-id-token-issuance true
```

Then keep the ids the next steps need:

```powershell
$CLIENT_ID = az ad app list --display-name "Where Them Logs App" --query "[0].appId" -o tsv
$TENANT_ID = az account show --query tenantId -o tsv
az ad sp create --id $CLIENT_ID     # the enterprise app, needed for assignment
"client $CLIENT_ID / tenant $TENANT_ID"
```

`AzureADMyOrg` is the part that makes it single tenant. Do not change it to a
multi-tenant audience unless you mean to let other directories in.

**Add the `admin` app role** (Portal, App registrations, your app, App roles):

| Field | Value |
| --- | --- |
| Display name | Admin |
| Allowed member types | Users/Groups |
| Value | `admin` |
| Description | Can add, edit and delete catalogue records |

**Require assignment, then assign yourself** (Portal, Enterprise applications,
your app):

- Properties, set **Assignment required?** to **Yes**. Without this any account
  in the tenant can sign in, and only the app role stops them; with it, an
  unassigned account cannot get a token at all and never reaches the site.
- Users and groups, add yourself with the **Admin** role.

**Create a client secret.** One does not exist yet: the app registration is
created without credentials, and this makes one.

```powershell
# --append matters. Without it, "reset" removes every existing credential on the
# registration, which is a blunt way to discover what else was using it.
$SECRET = az ad app credential reset --id $CLIENT_ID --append --years 2 `
  --query password -o tsv

if (-not $SECRET) { throw "No secret was returned. Check that $CLIENT_ID is right." }
```

**Store it as a GitHub secret**, which is the only place it lives. The
deployment takes it as a parameter, so nothing has to be set on the container
app out of band, and a rebuild from nothing works:

```powershell
gh secret set AZURE_AAD_CLIENT_SECRET --body $SECRET
Remove-Variable SECRET
```

Azure shows a secret's value once, at creation. There is no way to read it back
afterwards, so if you lose it before storing it, generate another with the same
command rather than hunting for the old one.

Doing it in the portal instead: App registrations, your app, **Certificates &
secrets**, New client secret. Copy the **Value** column, not the Secret ID.

> **It expires.** `--years 2` sets the lifetime, and Entra caps it at two. When
> it lapses, sign-in breaks with `AADSTS7000222` and nothing else changes, so it
> reads as a sudden inexplicable outage. Note the date now, or move to a
> certificate, which the same `az ad app credential reset` can issue.

Set these in `infra/main.parameters.json` and redeploy the infrastructure:

```json
"authProvider":  { "value": "aad" },
"authClientId":  { "value": "<application (client) id>" },
"authTenantId":  { "value": "<directory (tenant) id>" }
```

Auth switches on only when the provider, the client id **and** the secret are
all present. Two of the three leaves it off rather than half-configured, and the
app reports itself unconfigured rather than redirecting into a login endpoint
that was never deployed.

The secret is a deployment parameter rather than something set on the container
app by hand, because the auth config references it by name: a template that
names a secret it does not create cannot build the app from nothing. To deploy
manually, pass it:

```powershell
az deployment group create `
  --resource-group rg-wtla-prod `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.json `
  --parameters authClientSecret=$SECRET `
  --query properties.outputs
```

**If sign-in ends in `401` on `POST /.auth/login/aad/callback`**, check ID token
issuance first - it is the one setting `az ad app create` leaves off:

```powershell
az ad app show --id $CLIENT_ID --query "web.implicitGrantSettings" -o json
```

`enableIdTokenIssuance` must be `true`. The client secret, the redirect URI and
the role assignment can all be perfect and it will still fail without it.

**If you sign in and land on "Not your bay"**, the account you signed in with
carries no `admin` role. The page itself now prints which account the platform
saw and what roles came with it, which is usually the whole answer: a tenant with
more than one account of yours, or an assignment that landed on the other one.

The trap is **Default Access**. Adding a user under Enterprise applications
without picking a named role assigns `00000000-0000-0000-0000-000000000000`,
which puts no `roles` claim in the token at all - indistinguishable from not
being assigned. Check what is actually assigned:

```powershell
$SP_ID = az ad sp show --id $CLIENT_ID --query id -o tsv
az rest --method get `
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/appRoleAssignedTo" `
  --query "value[].{principal:principalDisplayName, role:appRoleId}" -o table
```

An `appRoleId` of all zeros is Default Access. Assign the real role to that
account, then **sign out and back in** - the role is written into the token at
sign-in, so reloading will not pick it up.

**What each refusal looks like**, so none of them reads as a bug:

| Who | What they get |
| --- | --- |
| Not in the tenant | An Entra sign-in error. They never reach the site. |
| In the tenant, not assigned | `AADSTS50105` from Entra. Also never reaches the site. |
| Assigned but no `admin` role | The site's own 403 page |
| Anonymous | Redirected to sign in |

<details>
<summary>GitHub instead, if a tenant is ever inconvenient</summary>

Create a GitHub OAuth app with callback
`https://ca-wtla-prod.proudgrass-36ed8d55.westeurope.azurecontainerapps.io/.auth/login/github/callback`, store the secret as
`github-client-secret`, and set `authProvider` to `github`, `authClientId` to
the OAuth client id, and `adminGithubLogins` to a comma separated allowlist.

GitHub authenticates anyone with an account and carries no roles, so that
allowlist is the entire lock. An empty list refuses everyone. Strangers can
reach the consent screen and land on the 403 page; they can read and write
nothing. `/api/me` prints the caller's own claims, which is how you find the
value to allowlist.

</details>

### 8. Serve it at wherethemlogs.app, behind Cloudflare

DNS is on Cloudflare and the apex is **proxied** (orange cloud). Browsers talk
to Cloudflare; Cloudflare talks to Azure over TLS.

The certificate on the Azure side is a **Cloudflare Origin Certificate**, not an
Azure managed one. Azure revalidates DNS whenever a managed certificate renews,
and it cannot see its own IP through the proxy, so a managed certificate behind
the orange cloud fails to renew and TLS breaks months later. An origin
certificate lasts up to 15 years and is never revalidated. Only Cloudflare
trusts it, which is fine: only Cloudflare ever connects to the origin.

**1. Create the origin certificate.** Cloudflare, SSL/TLS, Origin Server,
Create certificate. RSA, hostnames `wherethemlogs.app` and
`*.wherethemlogs.app`, 15 years. Save the certificate as `origin.pem` and the
private key as `origin.key`. The key is shown once.

**2. Convert it and upload it to the environment**, under a fixed name the
template refers to:

```powershell
$PFX_PASSWORD = [guid]::NewGuid().ToString()
openssl pkcs12 -export -out origin.pfx -inkey origin.key -in origin.pem `
  -passout "pass:$PFX_PASSWORD"

az containerapp env certificate upload -g rg-wtla-prod `
  -n cae-wtla-prod-s7gilgc3beox2 `
  --certificate-name wherethemlogs-origin `
  --certificate-file origin.pfx --password $PFX_PASSWORD

Remove-Item origin.pfx, origin.key
Remove-Variable PFX_PASSWORD
```

Keep `origin.pem` and `origin.key` somewhere safe if you want to re-upload later
without reissuing, or delete them and reissue from Cloudflare when needed.

**3. Grey-cloud the apex, once.** Azure checks that the A record points at the
environment when a domain is first added, and it cannot see that through the
proxy - that is the `FailedARecordValidation` error. Set the apex record to
**DNS only** and confirm:

```powershell
dig +short wherethemlogs.app A     # must return 20.76.241.92
```

The `asuid` TXT record must also be present; it already is.

**4. Bind it through the template.** Set the certificate name in
`infra/main.parameters.json`:

```json
"customDomain":                { "value": "wherethemlogs.app" },
"customDomainCertificateName": { "value": "wherethemlogs-origin" }
```

and push, or run **Deploy infrastructure** with mode `deploy`. The binding
belongs in the template, not in `az containerapp hostname bind`: every push
redeploys the whole container app from the template, and a domain bound by hand
but absent from it would be dropped on the next deploy, silently.

**5. Add the callback to the Entra registration**, if not already done. The
platform builds the callback from the host it was reached on, so without this
sign-in breaks the moment anyone uses the domain:

```powershell
az ad app update --id $CLIENT_ID --web-redirect-uris `
  "https://ca-wtla-prod.proudgrass-36ed8d55.westeurope.azurecontainerapps.io/.auth/login/aad/callback" `
  "https://wherethemlogs.app/.auth/login/aad/callback"
```

**6. Turn the proxy back on and lock the TLS mode.** Orange-cloud the apex, then
Cloudflare, SSL/TLS, Overview: **Full (strict)**. Anything weaker either skips
certificate verification or sends plain HTTP to the origin.

**7. Confirm a redeploy keeps the binding.** Run **Deploy app** once more with
the proxy on, then:

```powershell
az containerapp hostname list -n ca-wtla-prod -g rg-wtla-prod -o table
Invoke-RestMethod https://wherethemlogs.app/api/live
```

Verified on 2026-09-11: a full infrastructure redeploy with the proxy on
succeeded and the binding survived it. Re-applying the template does not re-run
the A-record check for a domain that is already bound, so the orange cloud can
stay on for every deploy. Only the first bind needs the record grey.

#### Sign-in behind the proxy

Cloudflare forwards the original `Host` header unchanged, so the platform sees
`wherethemlogs.app` and builds the right callback without extra configuration.
Verified: with the proxy on, `/admin` redirects to Entra with
`redirect_uri=https://wherethemlogs.app/.auth/login/aad/callback`.
Only if sign-in loops or lands on the container's own hostname does it need to
be told to read forwarded headers instead:

```powershell
az containerapp auth update -n ca-wtla-prod -g rg-wtla-prod `
  --proxy-convention Standard
```

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

```powershell
npm install

# PowerShell has no inline "VAR=x command" prefix, so set them on the session.
$env:LOCAL_ADMIN_BYPASS = "true"
$env:COSMOS_ENDPOINT    = "https://cosmos-wtla-prod-s7gilgc3beox2.documents.azure.com:443/"
$env:COSMOS_DATABASE    = "wtla"

npm run dev            # http://localhost:3777
```

Needs `az login` with an account listed in `developerPrincipalIds`.

`LOCAL_ADMIN_BYPASS=true` short-circuits the role check so admin routes are
reachable without a signed-in principal. No deployed configuration sets it - the
Bicep never emits it.

To exercise the container as it actually ships:

```powershell
docker build -t wtla:local .
docker run --rm -p 3888:3000 `
  -e COSMOS_ENDPOINT=https://cosmos-wtla-prod-s7gilgc3beox2.documents.azure.com:443/ `
  -e COSMOS_DATABASE=wtla `
  wtla:local
```

Note that the container has no Azure identity on your machine, so Cosmos calls
fail and the pages render their "not answering" state. That path is worth
seeing; it is what a real outage looks like.

## Rollback

**The application** - revisions, and this is the fast one:

```powershell
az containerapp revision list -n ca-wtla-prod -g rg-wtla-prod -o table
az containerapp ingress traffic set -n ca-wtla-prod -g rg-wtla-prod `
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

```powershell
# Invoke-RestMethod rather than curl: PowerShell parses the JSON for you, and
# an ampersand in a bare URL is a command separator, so the last one needs quotes.
Invoke-RestMethod https://ca-wtla-prod.proudgrass-36ed8d55.westeurope.azurecontainerapps.io/api/live      # is the process answering
Invoke-RestMethod https://ca-wtla-prod.proudgrass-36ed8d55.westeurope.azurecontainerapps.io/api/health    # can it reach Cosmos
Invoke-RestMethod "https://ca-wtla-prod.proudgrass-36ed8d55.westeurope.azurecontainerapps.io/api/search?q=teams&platform=windows"
```

Logs:

```powershell
az containerapp logs show -n ca-wtla-prod -g rg-wtla-prod --follow
```
