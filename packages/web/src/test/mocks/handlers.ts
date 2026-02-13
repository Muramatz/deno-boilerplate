import { http, HttpResponse } from 'msw';

export const handlers = [
  // デフォルトで全API呼び出しを404にする（テストごとにオーバーライド）
  http.all('/api/*', () => {
    return HttpResponse.json({ error: { message: 'Not mocked' } }, { status: 404 });
  }),
];
