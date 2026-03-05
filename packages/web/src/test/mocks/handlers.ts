import { http } from 'msw';

export const handlers = [
  // Default all API calls to 404; each test can override as needed.
  http.all('/api/*', () => {
    return new Response(JSON.stringify({ error: { message: 'Not mocked' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
];
