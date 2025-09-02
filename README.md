# decap-azure-proxy

An Azure Static Web Apps GitHub OAuth proxy for [Decap CMS](https://github.com/decaporg/decap-cms). This allows for deploying Decap without the Netlify Identity or Git Gateway services required to handle GitHub authentication so that the CMS client can make GitHub API calls.

This proxy is intended to be deployed on its own subdomain, separate from whatever website domain you're using Decap with.

## Getting Started

### Create a GitHub OAuth App

You'll need to [configure a GitHub OAuth application](https://github.com/settings/applications/new). Your `Application callback URL` must be the domain you deploy your Azure Static Web App to with the `/api/callback` path. Based on the sample configuration below, that would mean `https://your-app-name.azurestaticapps.net/api/callback`.

Save the OAuth client ID and secret for later, you'll need to provide those secrets to the Azure Static Web App.

If your GitHub repo (where you want Decap CMS to push content to) is private, you will have to change the scope in `src/index.ts` to:
```typescript
scope: 'repo,user'
```
So, your code after the change should look like:
```typescript
const authorizationUri = oauth2.authorizeURL({
  redirect_uri: `https://${url.hostname}/api/callback?provider=github`,
  scope: 'repo,user',
  state: randomBytes(4).toString('hex'),
});
```

### Deploy to Azure Static Web Apps

#### Option 1: Deploy via GitHub Actions (Recommended)

1. Fork this repository
2. Create an Azure Static Web App in the Azure Portal:
   - Go to Azure Portal → Create a resource → Static Web App
   - Connect your GitHub repository
   - Set build details:
     - App location: `/`
     - API location: `src`
     - Output location: `` (empty)
3. The GitHub Actions workflow will automatically deploy your app

#### Option 2: Deploy via Azure CLI

1. Install the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. Login: `az login`
3. Create a Static Web App:
```bash
az staticwebapp create \
  --name decap-proxy \
  --resource-group your-resource-group \
  --source https://github.com/your-username/decap-azure-proxy \
  --location "Central US" \
  --branch main \
  --app-location "/" \
  --api-location "src" \
  --output-location ""
```

#### Configure OAuth Secrets

In the Azure Portal, navigate to your Static Web App:
1. Go to Configuration
2. Add the following Application settings:
   - `GITHUB_OAUTH_ID`: Your GitHub OAuth App Client ID
   - `GITHUB_OAUTH_SECRET`: Your GitHub OAuth App Client Secret

### Point to Proxy in Decap Config

Add the `base_url` for your proxy to the backend section of Decap's `config.yml`:

```diff
site_url: https://your-site-powered-by-decap.com
search: false
backend:
  name: github
  branch: main
  repo: "github-user/repo"
+  base_url: https://your-app-name.azurestaticapps.net
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/decap-azure-proxy
cd decap-azure-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Create a `local.settings.json` file:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GITHUB_OAUTH_ID": "your-github-oauth-id",
    "GITHUB_OAUTH_SECRET": "your-github-oauth-secret"
  }
}
```

4. Install Azure Functions Core Tools:
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:7071/api/`

## API Endpoints

- `GET /api/auth?provider=github` - Initiates GitHub OAuth flow
- `GET /api/callback?provider=github&code=...` - Handles OAuth callback
