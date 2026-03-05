import { http } from 'msw';

export const handlers = [
  // デフォルトで全API呼び出しを404にする（テストごとにオーバーライド）
  http.all('/api/*', () => {
    return new Response(JSON.stringify({ error: { message: 'Not mocked' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
];
