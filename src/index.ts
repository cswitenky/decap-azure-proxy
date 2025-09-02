import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomBytes } from 'node:crypto';
import { OAuthClient } from './oauth';

const createOAuth = () => {
	return new OAuthClient({
		id: process.env.GITHUB_OAUTH_ID!,
		secret: process.env.GITHUB_OAUTH_SECRET!,
		target: {
			tokenHost: 'https://github.com',
			tokenPath: '/login/oauth/access_token',
			authorizePath: '/login/oauth/authorize',
		},
	});
};

const handleAuth = async (url: URL): Promise<HttpResponseInit> => {
	const provider = url.searchParams.get('provider');
	if (provider !== 'github') {
		return { status: 400, body: 'Invalid provider' };
	}

	const oauth2 = createOAuth();
	const authorizationUri = oauth2.authorizeURL({
		redirect_uri: `https://${url.hostname}/api/callback?provider=github`,
		scope: 'public_repo,user',
		state: randomBytes(4).toString('hex'),
	});

	return {
		status: 302,
		headers: {
			location: authorizationUri,
		},
	};
};

const callbackScriptResponse = (status: string, token: string): HttpResponseInit => {
	return {
		status: 200,
		headers: {
			'Content-Type': 'text/html',
		},
		body: `
<html>
<head>
	<script>
		const receiveMessage = (message) => {
			window.opener.postMessage(
				'authorization:github:${status}:${JSON.stringify({ token })}',
				'*'
			);
			window.removeEventListener("message", receiveMessage, false);
		}
		window.addEventListener("message", receiveMessage, false);
		window.opener.postMessage("authorizing:github", "*");
	</script>
	<body>
		<p>Authorizing Decap...</p>
	</body>
</head>
</html>
`,
	};
};

const handleCallback = async (url: URL): Promise<HttpResponseInit> => {
	const provider = url.searchParams.get('provider');
	if (provider !== 'github') {
		return { status: 400, body: 'Invalid provider' };
	}

	const code = url.searchParams.get('code');
	if (!code) {
		return { status: 400, body: 'Missing code' };
	}

	const oauth2 = createOAuth();
	const accessToken = await oauth2.getToken({
		code,
		redirect_uri: `https://${url.hostname}/api/callback?provider=github`,
	});
	return callbackScriptResponse('success', accessToken);
};

// Auth endpoint
app.http('auth', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: 'auth',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		const url = new URL(request.url);
		return handleAuth(url);
	},
});

// Callback endpoint
app.http('callback', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: 'callback',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		const url = new URL(request.url);
		return handleCallback(url);
	},
});

// Default endpoint
app.http('index', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: '',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		return { body: 'Hello 👋' };
	},
});
