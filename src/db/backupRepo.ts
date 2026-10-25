import { getDb } from './database';

const BACKUP_SCHEMA_VERSION = 2;

// Parents come before children so foreign keys resolve during restore.
const BACKUP_TABLES = [
  'projects',
  'project_expenses',
  'project_payments',
  'personal_loans',
  'personal_transactions',
  'tasks',
  'settings',
  'monthly_threshold_overrides',
  'custom_categories',
  'recurring_transactions',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

// Scheduled-notification IDs reference OS notifications from the original install,
// so they are never restored — reminders need re-setting after a restore.
const NOTIFICATION_COLUMNS: Partial<Record<BackupTable, string[]>> = {
  projects: ['payment_reminder_notification_id'],
  personal_loans: ['reminder_notification_id'],
  tasks: ['notification_id'],
};

export interface BackupPayload {
  app: 'hisab';
  schemaVersion: number;
  exportedAt: string;
  data: Partial<Record<BackupTable, Record<string, unknown>[]>>;
}

export function isValidBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.app === 'hisab' && typeof v.data === 'object' && v.data !== null;
}

export async function exportBackup(): Promise<BackupPayload> {
  const db = await getDb();
  const data: BackupPayload['data'] = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return {
    app: 'hisab',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/**
 * Restoring replaces all local data with the backup's contents. Every column present in
 * both the backup row and the current table is copied, so backups from older versions
 * restore fully and any missing newer columns fall back to their defaults (e.g. account = cash).
 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  const d = payload.data;

  const tableColumns: Partial<Record<BackupTable, Set<string>>> = {};
  for (const table of BACKUP_TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    tableColumns[table] = new Set(info.map((c) => c.name));
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const table of [...BACKUP_TABLES].reverse()) {
      await txn.runAsync(`DELETE FROM ${table}`);
    }

    for (const table of BACKUP_TABLES) {
      const known = tableColumns[table]!;
      const skip = new Set(NOTIFICATION_COLUMNS[table] ?? []);
      for (const row of d[table] ?? []) {
        const columns = Object.keys(row).filter(
          (c) => known.has(c) && !skip.has(c) && row[c] !== undefined && row[c] !== null
        );
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        await txn.runAsync(
          `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          ...columns.map((c) => row[c] as string | number)
        );
      }
    }
  });
}
