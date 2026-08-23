import { getDb } from './database';
import { generateId } from '../utils/id';
import type { TaskItem } from '../types';

interface Row {
  id: string;
  title: string;
  description: string;
  deadline: string;
  completed: number;
  reminder_minutes_before: number;
  notification_id: string | null;
  created_at: string;
}

function mapRow(r: Row): TaskItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    deadline: r.deadline,
    completed: r.completed === 1,
    reminderMinutesBefore: r.reminder_minutes_before,
    notificationId: r.notification_id,
    createdAt: r.created_at,
  };
}

export async function addTask(input: {
  title: string;
  description?: string;
  deadline: string;
  reminderMinutesBefore?: number;
  notificationId?: string | null;
}): Promise<TaskItem> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO tasks (id, title, description, deadline, completed, reminder_minutes_before, notification_id, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    id,
    input.title,
    input.description ?? '',
    input.deadline,
    input.reminderMinutesBefore ?? 60,
    input.notificationId ?? null,
    createdAt
  );
  return {
    id,
    title: input.title,
    description: input.description ?? '',
    deadline: input.deadline,
    completed: false,
    reminderMinutesBefore: input.reminderMinutesBefore ?? 60,
    notificationId: input.notificationId ?? null,
    createdAt,
  };
}

export async function getTaskById(id: string): Promise<TaskItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM tasks WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

export async function updateTask(
  id: string,
  input: {
    title: string;
    description: string;
    deadline: string;
    reminderMinutesBefore: number;
    notificationId?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE tasks SET title = ?, description = ?, deadline = ?, reminder_minutes_before = ?, notification_id = ? WHERE id = ?`,
    input.title,
    input.description,
    input.deadline,
    input.reminderMinutesBefore,
    input.notificationId ?? null,
    id
  );
}

export async function getAllTasks(): Promise<TaskItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM tasks ORDER BY completed ASC, deadline ASC`
  );
  return rows.map(mapRow);
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE tasks SET completed = ? WHERE id = ?`, completed ? 1 : 0, id);
}

export async function setTaskNotificationId(id: string, notificationId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?`, notificationId, id);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, id);
}

export async function getUpcomingTasks(limit: number = 5): Promise<TaskItem[]> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM tasks WHERE completed = 0 AND deadline >= ? ORDER BY deadline ASC LIMIT ?`,
    nowIso,
    limit
  );
  return rows.map(mapRow);
}
