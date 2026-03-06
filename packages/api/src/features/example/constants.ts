export const EXAMPLE_STATUSES = [
  { id: 'active', label: 'Active', order: 1 },
  { id: 'inactive', label: 'Inactive', order: 2 },
  { id: 'archived', label: 'Archived', order: 3 },
] as const;

export type ExampleStatusId = (typeof EXAMPLE_STATUSES)[number]['id'];
export const EXAMPLE_STATUS_IDS = EXAMPLE_STATUSES.map((s) => s.id);
