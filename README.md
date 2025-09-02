# decap-azure-proxy

An Azure Static Web Apps GitHub OAuth proxy for [Decap CMS](https://github.com/decaporg/decap-cms). This allows for deploying Decap CMS without requiring Netlify Identity or Git Gateway services to handle GitHub authentication so that the CMS client can make GitHub API calls.

This proxy is intended to be deployed on its own subdomain, separate from whatever website domain you're using Decap with.

## Getting Started

### Create a GitHub OAuth App

You'll need to [configure a GitHub OAuth application](https://github.com/settings/applications/new). Your `Application callback URL` must be the domain you deploy your Azure Static Web App to with the `/api/callback` path. Based on the sample configuration below, that would mean `https://your-app-name.azurestaticapps.net/api/callback`.

Save the OAuth client ID and secret for later, you'll need to provide those secrets to the Azure Static Web App.

**Note**: The proxy automatically uses the `scope` parameter from Decap CMS. If your GitHub repo is private, Decap CMS will automatically request `repo` scope. For public repos, it uses `public_repo,user` scope.

### Deploy to Azure Static Web Apps

#### Option 1: Deploy via GitHub Actions (Recommended)

1. Fork this repository
2. Create an Azure Static Web App in the Azure Portal:
   - Go to Azure Portal → Create a resource → Static Web App
   - Connect your GitHub repository
   - Set build details:
     - App location: `/`
     - API location: `api`
     - Output location: `dist`
3. The GitHub Actions workflow will automatically deploy your app

#### Option 2: Deploy via Azure CLI

1. Install the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. Login: `az login`
3. Create a Static Web App:
```bash
az staticwebapp create 
  --name decap-proxy 
  --resource-group your-resource-group 
  --source https://github.com/your-username/decap-azure-proxy 
  --location "Central US" 
  --branch main 
  --app-location "/" 
  --api-location "api" 
  --output-location "dist"
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

2. Install dependencies for both static site and API:
```bash
# Install static site dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

3. Create a `local.settings.json` file in the `api` directory:
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
# Option 1: Use Azure Static Web Apps CLI (recommended)
npm install -g @azure/static-web-apps-cli
swa start . --api-location api

# Option 2: Start API only
cd api
npm run start
```

The static site will be available at `http://localhost:4280/` and the API at `http://localhost:4280/api/` when using the SWA CLI.

## Technology Stack

- **Frontend**: Static HTML site
- **Backend**: Azure Functions with TypeScript
- **Runtime**: Node.js 18
- **Build**: TypeScript compilation via `tsc`
- **Deployment**: Azure Static Web Apps via GitHub Actions

## API Endpoints

- `GET /api` - Health check endpoint (returns "Hello 👋")
- `GET /api/auth?provider=github&scope=<scope>` - Initiates GitHub OAuth flow
- `GET /api/callback?provider=github&code=<code>` - Handles OAuth callback

## Configuration

### Environment Variables (Azure Portal)

Set these in your Azure Static Web App Configuration:

- `GITHUB_OAUTH_ID`: Your GitHub OAuth App Client ID
- `GITHUB_OAUTH_SECRET`: Your GitHub OAuth App Client Secret
