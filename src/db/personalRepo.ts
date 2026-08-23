import { getDb } from './database';
import { generateId } from '../utils/id';
import type { PersonalTransaction, TransactionSource, TransactionType } from '../types';

interface Row {
  id: string;
  type: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  source: string;
  project_id: string | null;
  loan_id: string | null;
  photo_uri: string | null;
  created_at: string;
}

function mapRow(r: Row): PersonalTransaction {
  return {
    id: r.id,
    type: r.type as TransactionType,
    amount: r.amount,
    category: r.category,
    note: r.note,
    date: r.date,
    source: r.source as TransactionSource,
    projectId: r.project_id,
    loanId: r.loan_id,
    photoUri: r.photo_uri,
    createdAt: r.created_at,
  };
}

export async function addPersonalTransaction(input: {
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  date: string;
  source?: TransactionSource;
  projectId?: string | null;
  loanId?: string | null;
  photoUri?: string | null;
}): Promise<PersonalTransaction> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO personal_transactions (id, type, amount, category, note, date, source, project_id, loan_id, photo_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.amount,
    input.category,
    input.note ?? '',
    input.date,
    input.source ?? 'manual',
    input.projectId ?? null,
    input.loanId ?? null,
    input.photoUri ?? null,
    createdAt
  );
  return {
    id,
    type: input.type,
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    date: input.date,
    source: input.source ?? 'manual',
    projectId: input.projectId ?? null,
    loanId: input.loanId ?? null,
    photoUri: input.photoUri ?? null,
    createdAt,
  };
}

export async function getTransactionsByLoanId(loanId: string): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(`SELECT * FROM personal_transactions WHERE loan_id = ?`, loanId);
  return rows.map(mapRow);
}

export async function deletePersonalTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM personal_transactions WHERE id = ?`, id);
}

export async function deletePersonalTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM personal_transactions WHERE id IN (${placeholders})`, ...ids);
}

export async function updatePersonalTransaction(
  id: string,
  input: {
    type: TransactionType;
    amount: number;
    category: string;
    note: string;
    date: string;
    photoUri?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE personal_transactions SET type = ?, amount = ?, category = ?, note = ?, date = ?, photo_uri = ? WHERE id = ?`,
    input.type,
    input.amount,
    input.category,
    input.note,
    input.date,
    input.photoUri ?? null,
    id
  );
}

export async function getPersonalTransactionById(id: string): Promise<PersonalTransaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM personal_transactions WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

export async function getAllPersonalTransactions(): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM personal_transactions ORDER BY date DESC, created_at DESC`
  );
  return rows.map(mapRow);
}

export async function getTransactionsInRange(
  startDate: string,
  endDate: string
): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM personal_transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`,
    startDate,
    endDate
  );
  return rows.map(mapRow);
}

export async function getLifetimeIncome(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM personal_transactions WHERE type = 'income'`
  );
  return row?.total ?? 0;
}

export async function getLifetimeCost(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM personal_transactions WHERE type = 'expense'`
  );
  return row?.total ?? 0;
}

export async function getFilteredTransactions(opts: {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts.type) {
    clauses.push('type = ?');
    params.push(opts.type);
  }
  if (opts.startDate) {
    clauses.push('date >= ?');
    params.push(opts.startDate);
  }
  if (opts.endDate) {
    clauses.push('date <= ?');
    params.push(opts.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM personal_transactions ${where} ORDER BY date DESC, created_at DESC`,
    ...params
  );
  return rows.map(mapRow);
}

export async function getSumByTypeInRange(
  type: TransactionType,
  startDate: string,
  endDate: string
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM personal_transactions WHERE type = ? AND date >= ? AND date <= ?`,
    type,
    startDate,
    endDate
  );
  return row?.total ?? 0;
}

export async function getCurrentBalance(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total FROM personal_transactions`
  );
  return row?.total ?? 0;
}

export async function getCategoryBreakdown(
  type: TransactionType,
  startDate: string,
  endDate: string
): Promise<{ category: string; total: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM personal_transactions
     WHERE type = ? AND date >= ? AND date <= ?
     GROUP BY category ORDER BY total DESC`,
    type,
    startDate,
    endDate
  );
}

export async function getMonthlyTotals(
  months: { start: string; end: string; label: string }[]
): Promise<{ label: string; income: number; expense: number }[]> {
  return Promise.all(
    months.map(async (m) => {
      const [income, expense] = await Promise.all([
        getSumByTypeInRange('income', m.start, m.end),
        getSumByTypeInRange('expense', m.start, m.end),
      ]);
      return { label: m.label, income, expense };
    })
  );
}
