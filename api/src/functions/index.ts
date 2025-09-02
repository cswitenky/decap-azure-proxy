import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

app.http('index', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: '',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		return { body: 'Hello 👋' };
	},
});
