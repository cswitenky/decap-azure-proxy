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
		console.log('Callback script loaded, status:', '${status}', 'token:', '${token}');
		
		const receiveMessage = (message) => {
			console.log('Received message:', message);
			window.opener.postMessage(
				'authorization:github:${status}:${JSON.stringify({ token })}',
				'*'
			);
			window.removeEventListener("message", receiveMessage, false);
			window.close();
		}
		
		window.addEventListener("message", receiveMessage, false);
		
		// Send initial message
		if (window.opener) {
			console.log('Sending authorizing message to opener');
			window.opener.postMessage("authorizing:github", "*");
			
			// Auto-close after sending success message
			setTimeout(() => {
				console.log('Sending final authorization message');
				window.opener.postMessage(
					'authorization:github:${status}:${JSON.stringify({ token })}',
					'*'
				);
				setTimeout(() => window.close(), 1000);
			}, 1000);
		} else {
			console.error('No window.opener found!');
			document.body.innerHTML = '<p>Error: No parent window found. Please close this window.</p>';
		}
	</script>
</head>
<body>
	<p>Authorizing Decap... Status: ${status}</p>
	<p style="font-size: 12px; color: #666;">Check browser console for debug info</p>
</body>
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
		const error = url.searchParams.get('error');
		
		// Handle OAuth errors
		if (error) {
			context.log('OAuth error:', error);
			return callbackScriptResponse('error', error);
		}
		
		if (!code) {
			context.log('Missing authorization code');
			return { status: 400, body: 'Missing code' };
		}

		try {
			const oauth2 = createOAuth();
			const accessToken = await oauth2.getToken({
				code,
				redirect_uri: `${process.env.SITE_URL}/api/callback`,
			});
			
			context.log('Successfully obtained access token');
			return callbackScriptResponse('success', accessToken);
		} catch (error) {
			context.log('Error getting access token:', error);
			return callbackScriptResponse('error', 'Failed to get access token');
		}
	},
});
