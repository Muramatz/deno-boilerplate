import { boolean, date, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const examples = pgTable(
  'examples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull(),
    field1: boolean('field1').default(false).notNull(),
    field2: text('field2').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('examples_date_unique').on(table.date)],
);

export type ExampleRecord = typeof examples.$inferSelect;
export type NewExampleRecord = typeof examples.$inferInsert;
