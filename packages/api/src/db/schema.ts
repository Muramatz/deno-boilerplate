// 各featureのschema.tsをここで集約再エクスポート
// NOTE: drizzle-kit はNode.jsで実行されるため @/ エイリアスを解決できない。相対パスを使用。
export { examples } from '../features/example/schema.ts';
