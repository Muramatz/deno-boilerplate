import { hc } from 'hono/client';
import type { AppType } from '@app/api';

// deno-lint-ignore no-explicit-any
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || '';

export const api = hc<AppType>(API_BASE_URL);

export type { AppType };
export type Client = typeof api;
