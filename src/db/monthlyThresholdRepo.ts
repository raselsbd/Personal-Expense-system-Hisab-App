import { getDb } from './database';
import type { MonthlyThresholdOverride } from '../types';

export async function getThresholdOverride(month: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ threshold: number }>(
    `SELECT threshold FROM monthly_threshold_overrides WHERE month = ?`,
    month
  );
  return row?.threshold ?? null;
}

export async function setThresholdOverride(month: string, threshold: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO monthly_threshold_overrides (month, threshold) VALUES (?, ?)
     ON CONFLICT(month) DO UPDATE SET threshold = excluded.threshold`,
    month,
    threshold
  );
}

export async function deleteThresholdOverride(month: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM monthly_threshold_overrides WHERE month = ?`, month);
}

export async function listThresholdOverrides(): Promise<MonthlyThresholdOverride[]> {
  const db = await getDb();
  return db.getAllAsync<MonthlyThresholdOverride>(
    `SELECT month, threshold FROM monthly_threshold_overrides ORDER BY month DESC`
  );
}

export async function getEffectiveMonthlyThreshold(month: string, defaultThreshold: number): Promise<number> {
  const override = await getThresholdOverride(month);
  return override ?? defaultThreshold;
}
