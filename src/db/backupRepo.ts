import { getDb } from './database';

const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  app: 'hisab';
  schemaVersion: number;
  exportedAt: string;
  data: {
    personal_transactions: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    project_expenses: Record<string, unknown>[];
    project_payments: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
    settings: Record<string, unknown>[];
    monthly_threshold_overrides: Record<string, unknown>[];
    custom_categories: Record<string, unknown>[];
    recurring_transactions: Record<string, unknown>[];
  };
}

export function isValidBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.app === 'hisab' && typeof v.data === 'object' && v.data !== null;
}

export async function exportBackup(): Promise<BackupPayload> {
  const db = await getDb();
  const [
    personal_transactions,
    projects,
    project_expenses,
    project_payments,
    tasks,
    settings,
    monthly_threshold_overrides,
    custom_categories,
    recurring_transactions,
  ] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM personal_transactions'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM projects'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM project_expenses'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM project_payments'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM tasks'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM settings'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM monthly_threshold_overrides'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM custom_categories'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM recurring_transactions'),
  ]);

  return {
    app: 'hisab',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      personal_transactions,
      projects,
      project_expenses,
      project_payments,
      tasks,
      settings,
      monthly_threshold_overrides,
      custom_categories,
      recurring_transactions,
    },
  };
}

/**
 * Restoring replaces all local data with the backup's contents. Scheduled-notification
 * IDs are not restored (they reference OS notifications from the original install), so
 * task reminders and payment-due reminders are cleared and would need re-setting.
 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  const d = payload.data;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM personal_transactions');
    await txn.runAsync('DELETE FROM project_expenses');
    await txn.runAsync('DELETE FROM project_payments');
    await txn.runAsync('DELETE FROM projects');
    await txn.runAsync('DELETE FROM tasks');
    await txn.runAsync('DELETE FROM settings');
    await txn.runAsync('DELETE FROM monthly_threshold_overrides');
    await txn.runAsync('DELETE FROM custom_categories');
    await txn.runAsync('DELETE FROM recurring_transactions');

    for (const r of d.projects ?? []) {
      await txn.runAsync(
        `INSERT INTO projects (id, name, client, budget, description, status, start_date, settled_at, created_at, discount_amount, payment_due_date, payment_reminder_notification_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        r.id as string,
        r.name as string,
        r.client as string,
        r.budget as number,
        r.description as string,
        r.status as string,
        r.start_date as string,
        (r.settled_at as string | null) ?? null,
        r.created_at as string,
        (r.discount_amount as number) ?? 0,
        (r.payment_due_date as string | null) ?? null
      );
    }
    for (const r of d.project_expenses ?? []) {
      await txn.runAsync(
        `INSERT INTO project_expenses (id, project_id, amount, note, date, photo_uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        r.id as string,
        r.project_id as string,
        r.amount as number,
        r.note as string,
        r.date as string,
        (r.photo_uri as string | null) ?? null,
        r.created_at as string
      );
    }
    for (const r of d.project_payments ?? []) {
      await txn.runAsync(
        `INSERT INTO project_payments (id, project_id, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        r.id as string,
        r.project_id as string,
        r.amount as number,
        r.note as string,
        r.date as string,
        r.created_at as string
      );
    }
    for (const r of d.personal_transactions ?? []) {
      await txn.runAsync(
        `INSERT INTO personal_transactions (id, type, amount, category, note, date, source, project_id, photo_uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id as string,
        r.type as string,
        r.amount as number,
        r.category as string,
        r.note as string,
        r.date as string,
        r.source as string,
        (r.project_id as string | null) ?? null,
        (r.photo_uri as string | null) ?? null,
        r.created_at as string
      );
    }
    for (const r of d.tasks ?? []) {
      await txn.runAsync(
        `INSERT INTO tasks (id, title, description, deadline, completed, reminder_minutes_before, notification_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
        r.id as string,
        r.title as string,
        r.description as string,
        r.deadline as string,
        r.completed as number,
        r.reminder_minutes_before as number,
        r.created_at as string
      );
    }
    for (const r of d.settings ?? []) {
      await txn.runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, r.key as string, r.value as string);
    }
    for (const r of d.monthly_threshold_overrides ?? []) {
      await txn.runAsync(
        `INSERT INTO monthly_threshold_overrides (month, threshold) VALUES (?, ?)`,
        r.month as string,
        r.threshold as number
      );
    }
    for (const r of d.custom_categories ?? []) {
      await txn.runAsync(
        `INSERT INTO custom_categories (id, name, type, created_at) VALUES (?, ?, ?, ?)`,
        r.id as string,
        r.name as string,
        r.type as string,
        r.created_at as string
      );
    }
    for (const r of d.recurring_transactions ?? []) {
      await txn.runAsync(
        `INSERT INTO recurring_transactions (id, type, amount, category, note, day_of_month, active, last_generated_month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id as string,
        r.type as string,
        r.amount as number,
        r.category as string,
        r.note as string,
        r.day_of_month as number,
        r.active as number,
        (r.last_generated_month as string | null) ?? null,
        r.created_at as string
      );
    }
  });
}
