import * as SQLite from 'expo-sqlite';

const DB_NAME = 'hisab.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  return dbInstance;
}

async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  } catch {
    // Column already exists from a previous install — safe to ignore.
  }
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS personal_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      project_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_personal_transactions_date ON personal_transactions(date);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      budget REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      settled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_expenses (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id);

    CREATE TABLE IF NOT EXISTS project_payments (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_project_payments_project ON project_payments(project_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      reminder_minutes_before INTEGER NOT NULL DEFAULT 60,
      notification_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_threshold_overrides (
      month TEXT PRIMARY KEY NOT NULL,
      threshold REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      day_of_month INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      last_generated_month TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personal_loans (
      id TEXT PRIMARY KEY NOT NULL,
      direction TEXT NOT NULL,
      person_name TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      due_date TEXT,
      reminder_notification_id TEXT,
      settled INTEGER NOT NULL DEFAULT 0,
      settled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_personal_loans_direction ON personal_loans(direction);
  `);

  await addColumnIfMissing(db, 'projects', 'discount_amount', 'REAL NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'projects', 'payment_due_date', 'TEXT');
  await addColumnIfMissing(db, 'projects', 'payment_reminder_notification_id', 'TEXT');
  await addColumnIfMissing(db, 'project_expenses', 'photo_uri', 'TEXT');
  await addColumnIfMissing(db, 'personal_transactions', 'photo_uri', 'TEXT');
  await addColumnIfMissing(db, 'personal_transactions', 'loan_id', 'TEXT');
  await addColumnIfMissing(db, 'personal_transactions', 'transfer_id', 'TEXT');
  await addColumnIfMissing(db, 'personal_transactions', 'account', "TEXT NOT NULL DEFAULT 'cash'");
  await addColumnIfMissing(db, 'personal_loans', 'account', "TEXT NOT NULL DEFAULT 'cash'");

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_personal_transactions_loan ON personal_transactions(loan_id);
    CREATE INDEX IF NOT EXISTS idx_personal_transactions_account ON personal_transactions(account);
  `);
}
