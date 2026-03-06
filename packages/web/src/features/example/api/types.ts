import type { InferRequestType, InferResponseType } from 'hono/client';
import type { api } from '@/lib/api.ts';

type ExampleApi = (typeof api.api)['example'];

export type ExampleListResponse = InferResponseType<ExampleApi['$get'], 200>;
export type CreateExampleRequest = InferRequestType<ExampleApi['$post']>['json'];
export type UpdateExampleRequest = InferRequestType<ExampleApi[':id']['$patch']>['json'];
export type ExampleResponse = InferResponseType<ExampleApi[':id']['$get'], 200>;
