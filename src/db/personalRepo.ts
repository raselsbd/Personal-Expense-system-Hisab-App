import { getDb } from './database';
import { generateId } from '../utils/id';
import { NON_INCOME_SOURCES } from '../types';
import type { AccountType, PersonalTransaction, TransactionSource, TransactionType } from '../types';

const sqlList = (sources: string[]) => sources.map((src) => `'${src}'`).join(', ');

// Loans and account transfers move the balance but are never counted as income or cost.
// A loss-making project settlement still reduces the balance, but project costs stay
// inside the project and never show up as personal cost.
const COUNTS_AS_INCOME = `source NOT IN (${sqlList(NON_INCOME_SOURCES)})`;
const COUNTS_AS_COST = `source NOT IN (${sqlList([...NON_INCOME_SOURCES, 'project_settlement'])})`;

function countsAs(type: TransactionType): string {
  return type === 'income' ? COUNTS_AS_INCOME : COUNTS_AS_COST;
}

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
  transfer_id: string | null;
  account: string | null;
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
    transferId: r.transfer_id,
    account: (r.account ?? 'cash') as AccountType,
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
  transferId?: string | null;
  account?: AccountType;
  photoUri?: string | null;
}): Promise<PersonalTransaction> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO personal_transactions (id, type, amount, category, note, date, source, project_id, loan_id, transfer_id, account, photo_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.amount,
    input.category,
    input.note ?? '',
    input.date,
    input.source ?? 'manual',
    input.projectId ?? null,
    input.loanId ?? null,
    input.transferId ?? null,
    input.account ?? 'cash',
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
    transferId: input.transferId ?? null,
    account: input.account ?? 'cash',
    photoUri: input.photoUri ?? null,
    createdAt,
  };
}

/** Moves money between accounts as a linked expense/income pair that is not income or cost. */
export async function addAccountTransfer(input: {
  from: AccountType;
  to: AccountType;
  amount: number;
  note?: string;
  date: string;
}): Promise<void> {
  const transferId = generateId();
  await addPersonalTransaction({
    type: 'expense',
    amount: input.amount,
    category: 'Transfer',
    note: input.note ?? '',
    date: input.date,
    source: 'transfer',
    transferId,
    account: input.from,
  });
  await addPersonalTransaction({
    type: 'income',
    amount: input.amount,
    category: 'Transfer',
    note: input.note ?? '',
    date: input.date,
    source: 'transfer',
    transferId,
    account: input.to,
  });
}

export async function getTransactionsByLoanId(loanId: string): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(`SELECT * FROM personal_transactions WHERE loan_id = ?`, loanId);
  return rows.map(mapRow);
}

export async function deletePersonalTransaction(id: string): Promise<void> {
  await deletePersonalTransactions([id]);
}

/** Deleting either side of an account transfer removes both sides so balances stay consistent. */
export async function deletePersonalTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM personal_transactions WHERE id IN (${placeholders})
       OR transfer_id IN (SELECT transfer_id FROM personal_transactions WHERE id IN (${placeholders}) AND transfer_id IS NOT NULL)`,
    ...ids,
    ...ids
  );
}

export async function updatePersonalTransaction(
  id: string,
  input: {
    type: TransactionType;
    amount: number;
    category: string;
    note: string;
    date: string;
    account?: AccountType;
    photoUri?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE personal_transactions SET type = ?, amount = ?, category = ?, note = ?, date = ?, account = COALESCE(?, account), photo_uri = ? WHERE id = ?`,
    input.type,
    input.amount,
    input.category,
    input.note,
    input.date,
    input.account ?? null,
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
    `SELECT SUM(amount) as total FROM personal_transactions WHERE type = 'income' AND ${COUNTS_AS_INCOME}`
  );
  return row?.total ?? 0;
}

export async function getLifetimeCost(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM personal_transactions WHERE type = 'expense' AND ${COUNTS_AS_COST}`
  );
  return row?.total ?? 0;
}

/**
 * Filtering by income/cost returns only real income/cost entries (no loans, transfers or project losses),
 * while filtering by account returns that account's full log, loans and transfers included.
 */
export async function getFilteredTransactions(opts: {
  type?: TransactionType;
  account?: AccountType;
  startDate?: string;
  endDate?: string;
}): Promise<PersonalTransaction[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts.type) {
    clauses.push('type = ?');
    params.push(opts.type);
    if (!opts.account) clauses.push(countsAs(opts.type));
  }
  if (opts.account) {
    clauses.push('account = ?');
    params.push(opts.account);
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
    `SELECT SUM(amount) as total FROM personal_transactions
     WHERE type = ? AND date >= ? AND date <= ? AND ${countsAs(type)}`,
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

export async function getAccountBalances(): Promise<Record<AccountType, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ account: string; total: number | null }>(
    `SELECT account, SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total
     FROM personal_transactions GROUP BY account`
  );
  const balances: Record<AccountType, number> = { cash: 0, bkash: 0, bank: 0 };
  for (const r of rows) {
    if (r.account in balances) balances[r.account as AccountType] = r.total ?? 0;
  }
  return balances;
}

export async function getCategoryBreakdown(
  type: TransactionType,
  startDate: string,
  endDate: string
): Promise<{ category: string; total: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM personal_transactions
     WHERE type = ? AND date >= ? AND date <= ? AND ${countsAs(type)}
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
