// API hooks
export {
  useCreateExample,
  useDeleteExample,
  useExampleById,
  useUpdateExample,
} from './api/index.ts';
export type { CreateExampleRequest, ExampleResponse, UpdateExampleRequest } from './api/index.ts';

// Components
export { CreateForm, type ExampleData } from './components/create-form.tsx';
export { DetailView } from './components/detail-view.tsx';
export { UpdateForm } from './components/update-form.tsx';
export { DeleteButton } from './components/delete-button.tsx';
