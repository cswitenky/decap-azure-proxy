import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomBytes } from 'node:crypto';
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

app.http('auth', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: 'auth',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		const url = new URL(request.url);
		const provider = url.searchParams.get('provider');
		
		if (provider !== 'github') {
			return { status: 400, body: 'Invalid provider' };
		}

		// Get scope from query params, fallback to default
		const requestedScope = url.searchParams.get('scope') || 'public_repo,user';

		const oauth2 = createOAuth();
		const authorizationUri = oauth2.authorizeURL({
			redirect_uri: `https://${url.hostname}/api/callback`,
			scope: requestedScope,
			state: randomBytes(4).toString('hex'),
		});

		return {
			status: 302,
			headers: {
				location: authorizationUri,
			},
		};
	},
});
