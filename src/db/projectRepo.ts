import { getDb } from './database';
import { generateId } from '../utils/id';
import { addPersonalTransaction } from './personalRepo';
import { cancelScheduledNotification } from '../utils/notifications';
import type { Project, ProjectExpense, ProjectPayment, ProjectStatus, ProjectWithStats } from '../types';

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  budget: number;
  description: string;
  status: string;
  start_date: string;
  settled_at: string | null;
  created_at: string;
  discount_amount: number;
  payment_due_date: string | null;
  payment_reminder_notification_id: string | null;
}

interface ExpenseRow {
  id: string;
  project_id: string;
  amount: number;
  note: string;
  date: string;
  photo_uri: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  project_id: string;
  amount: number;
  note: string;
  date: string;
  created_at: string;
}

function mapProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    client: r.client,
    budget: r.budget,
    description: r.description,
    status: r.status as ProjectStatus,
    startDate: r.start_date,
    settledAt: r.settled_at,
    createdAt: r.created_at,
    discountAmount: r.discount_amount,
    paymentDueDate: r.payment_due_date,
    paymentReminderNotificationId: r.payment_reminder_notification_id,
  };
}

function mapExpense(r: ExpenseRow): ProjectExpense {
  return {
    id: r.id,
    projectId: r.project_id,
    amount: r.amount,
    note: r.note,
    date: r.date,
    photoUri: r.photo_uri,
    createdAt: r.created_at,
  };
}

function mapPayment(r: PaymentRow): ProjectPayment {
  return {
    id: r.id,
    projectId: r.project_id,
    amount: r.amount,
    note: r.note,
    date: r.date,
    createdAt: r.created_at,
  };
}

export async function addProject(input: {
  name: string;
  client?: string;
  budget: number;
  description?: string;
  startDate: string;
  paymentDueDate?: string | null;
  openingSpent?: number;
  openingReceived?: number;
}): Promise<Project> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO projects (id, name, client, budget, description, status, start_date, settled_at, created_at, discount_amount, payment_due_date, payment_reminder_notification_id)
     VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?, 0, ?, NULL)`,
    id,
    input.name,
    input.client ?? '',
    input.budget,
    input.description ?? '',
    input.startDate,
    createdAt,
    input.paymentDueDate ?? null
  );

  if (input.openingSpent && input.openingSpent > 0) {
    await addProjectExpense({
      projectId: id,
      amount: input.openingSpent,
      note: 'Opening balance',
      date: input.startDate,
    });
  }
  if (input.openingReceived && input.openingReceived > 0) {
    await addProjectPayment({
      projectId: id,
      amount: input.openingReceived,
      note: 'Opening balance',
      date: input.startDate,
    });
  }

  return {
    id,
    name: input.name,
    client: input.client ?? '',
    budget: input.budget,
    description: input.description ?? '',
    status: 'active',
    startDate: input.startDate,
    settledAt: null,
    createdAt,
    discountAmount: 0,
    paymentDueDate: input.paymentDueDate ?? null,
    paymentReminderNotificationId: null,
  };
}

export async function updateProject(
  id: string,
  input: {
    name: string;
    client?: string;
    budget: number;
    description?: string;
    startDate: string;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE projects SET name = ?, client = ?, budget = ?, description = ?, start_date = ? WHERE id = ?`,
    input.name,
    input.client ?? '',
    input.budget,
    input.description ?? '',
    input.startDate,
    id
  );
}

export async function setProjectPaymentDueDate(
  id: string,
  paymentDueDate: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE projects SET payment_due_date = ? WHERE id = ?`, paymentDueDate, id);
}

export async function setProjectPaymentReminderNotificationId(
  id: string,
  notificationId: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE projects SET payment_reminder_notification_id = ? WHERE id = ?`,
    notificationId,
    id
  );
}

export async function getProjectTotalSpent(projectId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM project_expenses WHERE project_id = ?`,
    projectId
  );
  return row?.total ?? 0;
}

export async function getProjectTotalReceived(projectId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM project_payments WHERE project_id = ?`,
    projectId
  );
  return row?.total ?? 0;
}

async function attachStats(p: Project): Promise<ProjectWithStats> {
  const [totalSpent, totalReceived] = await Promise.all([
    getProjectTotalSpent(p.id),
    getProjectTotalReceived(p.id),
  ]);
  const remaining = p.budget - totalSpent;
  const due = p.budget - totalReceived;
  return {
    ...p,
    totalSpent,
    remaining,
    totalReceived,
    due,
    effectiveDue: Math.max(due - p.discountAmount, 0),
    netBenefit: remaining - p.discountAmount,
  };
}

export async function getAllProjectsWithStats(): Promise<ProjectWithStats[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ProjectRow>(
    `SELECT * FROM projects ORDER BY created_at DESC`
  );
  const projects = rows.map(mapProject);
  return Promise.all(projects.map((p) => attachStats(p)));
}

export async function getProjectById(id: string): Promise<ProjectWithStats | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProjectRow>(`SELECT * FROM projects WHERE id = ?`, id);
  if (!row) return null;
  return attachStats(mapProject(row));
}

export async function getProjectExpenses(projectId: string): Promise<ProjectExpense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT * FROM project_expenses WHERE project_id = ? ORDER BY date DESC, created_at DESC`,
    projectId
  );
  return rows.map(mapExpense);
}

export async function addProjectExpense(input: {
  projectId: string;
  amount: number;
  note?: string;
  date: string;
  photoUri?: string | null;
}): Promise<ProjectExpense> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO project_expenses (id, project_id, amount, note, date, photo_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.projectId,
    input.amount,
    input.note ?? '',
    input.date,
    input.photoUri ?? null,
    createdAt
  );
  return {
    id,
    projectId: input.projectId,
    amount: input.amount,
    note: input.note ?? '',
    date: input.date,
    photoUri: input.photoUri ?? null,
    createdAt,
  };
}

export async function getProjectExpenseById(id: string): Promise<ProjectExpense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>(`SELECT * FROM project_expenses WHERE id = ?`, id);
  return row ? mapExpense(row) : null;
}

export async function updateProjectExpense(
  id: string,
  input: { amount: number; note: string; date: string; photoUri?: string | null }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE project_expenses SET amount = ?, note = ?, date = ?, photo_uri = ? WHERE id = ?`,
    input.amount,
    input.note,
    input.date,
    input.photoUri ?? null,
    id
  );
}

export async function deleteProjectExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM project_expenses WHERE id = ?`, id);
}

export async function getProjectPayments(projectId: string): Promise<ProjectPayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PaymentRow>(
    `SELECT * FROM project_payments WHERE project_id = ? ORDER BY date DESC, created_at DESC`,
    projectId
  );
  return rows.map(mapPayment);
}

export async function addProjectPayment(input: {
  projectId: string;
  amount: number;
  note?: string;
  date: string;
}): Promise<ProjectPayment> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO project_payments (id, project_id, amount, note, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.projectId,
    input.amount,
    input.note ?? '',
    input.date,
    createdAt
  );
  return {
    id,
    projectId: input.projectId,
    amount: input.amount,
    note: input.note ?? '',
    date: input.date,
    createdAt,
  };
}

export async function getProjectPaymentById(id: string): Promise<ProjectPayment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PaymentRow>(`SELECT * FROM project_payments WHERE id = ?`, id);
  return row ? mapPayment(row) : null;
}

export async function updateProjectPayment(
  id: string,
  input: { amount: number; note: string; date: string }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE project_payments SET amount = ?, note = ?, date = ? WHERE id = ?`,
    input.amount,
    input.note,
    input.date,
    id
  );
}

export async function deleteProjectPayment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM project_payments WHERE id = ?`, id);
}

/**
 * Records a payment on a project that's already settled. Since settlement already
 * transferred the project's net benefit to the personal balance as a one-time snapshot,
 * any payment collected afterwards (e.g. a late client payment) is posted directly as
 * personal income rather than waiting for a settlement that has already happened.
 */
export async function addPostSettlementPayment(input: {
  projectId: string;
  projectName: string;
  amount: number;
  note?: string;
  date: string;
}): Promise<ProjectPayment> {
  const payment = await addProjectPayment({
    projectId: input.projectId,
    amount: input.amount,
    note: input.note,
    date: input.date,
  });
  await addPersonalTransaction({
    type: 'income',
    amount: input.amount,
    category: 'Project Settlement',
    note: `${input.projectName} payment`,
    date: input.date,
    source: 'project_settlement',
    projectId: input.projectId,
  });
  return payment;
}

/**
 * Settling a project transfers its net benefit (budget - spent - discount) into
 * the personal balance as a single income/expense transaction, then closes the
 * project by marking it completed so no further cost/payment entries are made.
 */
export async function settleProject(
  projectId: string,
  discountAmount = 0,
  settleDate?: string
): Promise<void> {
  const db = await getDb();
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  if (project.status === 'completed') return;

  const discount = Math.max(discountAmount, 0);
  const netBenefit = project.remaining - discount;

  if (project.paymentReminderNotificationId) {
    await cancelScheduledNotification(project.paymentReminderNotificationId);
  }

  const date = settleDate ?? new Date().toISOString().slice(0, 10);
  await addPersonalTransaction({
    type: netBenefit >= 0 ? 'income' : 'expense',
    amount: Math.abs(netBenefit),
    category: 'Project Settlement',
    note: `${project.name} settlement`,
    date,
    source: 'project_settlement',
    projectId: project.id,
  });

  await db.runAsync(
    `UPDATE projects SET status = 'completed', settled_at = ?, discount_amount = ? WHERE id = ?`,
    new Date(`${date}T00:00:00`).toISOString(),
    discount,
    projectId
  );
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  const project = await getProjectById(id);
  if (project?.paymentReminderNotificationId) {
    await cancelScheduledNotification(project.paymentReminderNotificationId);
  }
  await db.runAsync(`DELETE FROM projects WHERE id = ?`, id);
}
