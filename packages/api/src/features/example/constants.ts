export const EXAMPLE_STATUSES = [
  { id: 'active', label: '有効', order: 1 },
  { id: 'inactive', label: '無効', order: 2 },
  { id: 'archived', label: 'アーカイブ', order: 3 },
] as const;

export type ExampleStatusId = (typeof EXAMPLE_STATUSES)[number]['id'];
export const EXAMPLE_STATUS_IDS = EXAMPLE_STATUSES.map((s) => s.id);
