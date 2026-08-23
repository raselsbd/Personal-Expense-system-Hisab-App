import { getDb } from './database';
import { generateId } from '../utils/id';
import { addPersonalTransaction } from './personalRepo';
import type { RecurringTransaction, TransactionType } from '../types';

interface Row {
  id: string;
  type: string;
  amount: number;
  category: string;
  note: string;
  day_of_month: number;
  active: number;
  last_generated_month: string | null;
  created_at: string;
}

function mapRow(r: Row): RecurringTransaction {
  return {
    id: r.id,
    type: r.type as TransactionType,
    amount: r.amount,
    category: r.category,
    note: r.note,
    dayOfMonth: r.day_of_month,
    active: r.active === 1,
    lastGeneratedMonth: r.last_generated_month,
    createdAt: r.created_at,
  };
}

export async function addRecurringTransaction(input: {
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  dayOfMonth: number;
}): Promise<RecurringTransaction> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recurring_transactions (id, type, amount, category, note, day_of_month, active, last_generated_month, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
    id,
    input.type,
    input.amount,
    input.category,
    input.note ?? '',
    input.dayOfMonth,
    createdAt
  );
  return {
    id,
    type: input.type,
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    dayOfMonth: input.dayOfMonth,
    active: true,
    lastGeneratedMonth: null,
    createdAt,
  };
}

export async function listRecurringTransactions(): Promise<RecurringTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM recurring_transactions ORDER BY day_of_month ASC`
  );
  return rows.map(mapRow);
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE recurring_transactions SET active = ? WHERE id = ?`, active ? 1 : 0, id);
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM recurring_transactions WHERE id = ?`, id);
}

/**
 * Auto-inserts a personal transaction for every active recurring template whose
 * day-of-month has passed for the current month and hasn't been generated yet.
 * Safe to call repeatedly (e.g. on every app/dashboard load) — each template only
 * fires once per calendar month thanks to last_generated_month.
 */
export async function generateDueRecurringTransactions(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const due = await db.getAllAsync<Row>(
    `SELECT * FROM recurring_transactions WHERE active = 1 AND (last_generated_month IS NULL OR last_generated_month != ?)`,
    currentMonth
  );

  let generated = 0;
  for (const row of due) {
    const template = mapRow(row);
    if (today < Math.min(template.dayOfMonth, daysInMonth)) continue;

    const day = Math.min(template.dayOfMonth, daysInMonth);
    const date = `${currentMonth}-${String(day).padStart(2, '0')}`;
    await addPersonalTransaction({
      type: template.type,
      amount: template.amount,
      category: template.category,
      note: template.note,
      date,
      source: 'recurring',
    });
    await db.runAsync(
      `UPDATE recurring_transactions SET last_generated_month = ? WHERE id = ?`,
      currentMonth,
      template.id
    );
    generated += 1;
  }
  return generated;
}
