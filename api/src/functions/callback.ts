import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OAuthClient } from '../oauth';

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

app.http('callback', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: 'callback',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		const url = new URL(request.url);
		
		const code = url.searchParams.get('code');
		if (!code) {
			return { status: 400, body: 'Missing code' };
		}

		const oauth2 = createOAuth();
		const accessToken = await oauth2.getToken({
			code,
			redirect_uri: `${process.env.SITE_URL}/api/callback`,
		});
		
		return callbackScriptResponse('success', accessToken);
	},
});
