import { getDb } from './database';
import { generateId } from '../utils/id';
import { cancelScheduledNotification } from '../utils/notifications';
import {
  addPersonalTransaction,
  deletePersonalTransactions,
  getTransactionsByLoanId,
  updatePersonalTransaction,
} from './personalRepo';
import type { LoanDirection, PersonalLoan } from '../types';

interface Row {
  id: string;
  direction: string;
  person_name: string;
  amount: number;
  note: string;
  date: string;
  due_date: string | null;
  reminder_notification_id: string | null;
  settled: number;
  settled_at: string | null;
  created_at: string;
}

function mapRow(r: Row): PersonalLoan {
  return {
    id: r.id,
    direction: r.direction as LoanDirection,
    personName: r.person_name,
    amount: r.amount,
    note: r.note,
    date: r.date,
    dueDate: r.due_date,
    reminderNotificationId: r.reminder_notification_id,
    settled: r.settled === 1,
    settledAt: r.settled_at,
    createdAt: r.created_at,
  };
}

export async function addLoan(input: {
  direction: LoanDirection;
  personName: string;
  amount: number;
  note?: string;
  date: string;
  dueDate?: string | null;
}): Promise<PersonalLoan> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO personal_loans (id, direction, person_name, amount, note, date, due_date, reminder_notification_id, settled, settled_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?)`,
    id,
    input.direction,
    input.personName,
    input.amount,
    input.note ?? '',
    input.date,
    input.dueDate ?? null,
    createdAt
  );

  if (input.direction === 'lent') {
    await addPersonalTransaction({
      type: 'expense',
      amount: input.amount,
      category: 'Loan Given',
      note: `Loan to ${input.personName}`,
      date: input.date,
      source: 'loan',
      loanId: id,
    });
  }

  return {
    id,
    direction: input.direction,
    personName: input.personName,
    amount: input.amount,
    note: input.note ?? '',
    date: input.date,
    dueDate: input.dueDate ?? null,
    reminderNotificationId: null,
    settled: false,
    settledAt: null,
    createdAt,
  };
}

export async function getLoanById(id: string): Promise<PersonalLoan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM personal_loans WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

export async function listLoans(direction?: LoanDirection): Promise<PersonalLoan[]> {
  const db = await getDb();
  const rows = direction
    ? await db.getAllAsync<Row>(
        `SELECT * FROM personal_loans WHERE direction = ? ORDER BY settled ASC, date DESC, created_at DESC`,
        direction
      )
    : await db.getAllAsync<Row>(
        `SELECT * FROM personal_loans ORDER BY settled ASC, date DESC, created_at DESC`
      );
  return rows.map(mapRow);
}

export async function updateLoan(
  id: string,
  input: { personName: string; amount: number; note: string; date: string; dueDate?: string | null }
): Promise<void> {
  const db = await getDb();
  const existing = await getLoanById(id);
  await db.runAsync(
    `UPDATE personal_loans SET person_name = ?, amount = ?, note = ?, date = ?, due_date = ? WHERE id = ?`,
    input.personName,
    input.amount,
    input.note,
    input.date,
    input.dueDate ?? null,
    id
  );

  if (existing?.direction === 'lent') {
    const linked = await getTransactionsByLoanId(id);
    const given = linked.find((tx) => tx.category === 'Loan Given');
    if (given) {
      await updatePersonalTransaction(given.id, {
        type: 'expense',
        amount: input.amount,
        category: 'Loan Given',
        note: `Loan to ${input.personName}`,
        date: input.date,
        photoUri: given.photoUri,
      });
    }
  }
}

export async function setLoanReminderNotificationId(id: string, notificationId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE personal_loans SET reminder_notification_id = ? WHERE id = ?`, notificationId, id);
}

export async function setLoanSettled(id: string, settled: boolean): Promise<void> {
  const db = await getDb();
  const loan = await getLoanById(id);
  if (!loan) return;

  if (settled && loan.reminderNotificationId) {
    await cancelScheduledNotification(loan.reminderNotificationId);
    await setLoanReminderNotificationId(id, null);
  }

  // Borrowed loans are tracked for display only and never touch the main balance.
  if (loan.direction === 'lent' && settled !== loan.settled) {
    if (settled) {
      await addPersonalTransaction({
        type: 'income',
        amount: loan.amount,
        category: 'Loan Returned',
        note: `Loan repaid by ${loan.personName}`,
        date: new Date().toISOString().slice(0, 10),
        source: 'loan',
        loanId: id,
      });
    } else {
      const linked = await getTransactionsByLoanId(id);
      const returned = linked.filter((tx) => tx.category === 'Loan Returned').map((tx) => tx.id);
      if (returned.length > 0) {
        await deletePersonalTransactions(returned);
      }
    }
  }

  await db.runAsync(
    `UPDATE personal_loans SET settled = ?, settled_at = ? WHERE id = ?`,
    settled ? 1 : 0,
    settled ? new Date().toISOString() : null,
    id
  );
}

export async function deleteLoan(id: string): Promise<void> {
  const db = await getDb();
  const loan = await getLoanById(id);
  if (loan?.reminderNotificationId) {
    await cancelScheduledNotification(loan.reminderNotificationId);
  }
  if (loan?.direction === 'lent') {
    const linked = await getTransactionsByLoanId(id);
    if (linked.length > 0) {
      await deletePersonalTransactions(linked.map((tx) => tx.id));
    }
  }
  await db.runAsync(`DELETE FROM personal_loans WHERE id = ?`, id);
}

export async function getOutstandingLoanTotal(direction: LoanDirection): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM personal_loans WHERE direction = ? AND settled = 0`,
    direction
  );
  return row?.total ?? 0;
}
