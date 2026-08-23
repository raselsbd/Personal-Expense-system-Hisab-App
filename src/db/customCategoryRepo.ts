import { getDb } from './database';
import { generateId } from '../utils/id';
import type { CustomCategory, CustomCategoryType } from '../types';

interface Row {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

function mapRow(r: Row): CustomCategory {
  return {
    id: r.id,
    name: r.name,
    type: r.type as CustomCategoryType,
    createdAt: r.created_at,
  };
}

export async function listCustomCategories(): Promise<CustomCategory[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM custom_categories ORDER BY created_at ASC`
  );
  return rows.map(mapRow);
}

export async function addCustomCategory(name: string, type: CustomCategoryType): Promise<CustomCategory> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO custom_categories (id, name, type, created_at) VALUES (?, ?, ?, ?)`,
    id,
    name,
    type,
    createdAt
  );
  return { id, name, type, createdAt };
}

export async function deleteCustomCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM custom_categories WHERE id = ?`, id);
}
