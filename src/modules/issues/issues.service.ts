import pool from '../../config/db';
import type { Issue, IssueStatus, IssueType, Reporter } from '../../types';

export interface IssueFilters {
  sort?: 'newest' | 'oldest';
  type?: IssueType;
  status?: IssueStatus;
}

export interface UpdateIssueFields {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
}

type UpdateValue = string;

export async function createIssue(title: string, description: string, type: IssueType, reporterId: number) {
  const r = await pool.query<Issue>(
    'INSERT INTO issues (title,description,type,reporter_id) VALUES ($1,$2,$3,$4) RETURNING id,title,description,type,status,reporter_id,created_at,updated_at',
    [title, description, type, reporterId]
  );
  return r.rows[0];
}

export async function listIssues(filters: IssueFilters) {
  const parts: string[] = [];
  const values: string[] = [];
  let idx = 1;
  if (filters.type) {
    parts.push(`type = $${idx++}`);
    values.push(filters.type);
  }
  if (filters.status) {
    parts.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  const where = parts.length ? 'WHERE ' + parts.join(' AND ') : '';
  const order = filters.sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';
  const q = `SELECT id,title,description,type,status,reporter_id,created_at,updated_at FROM issues ${where} ${order}`;
  const r = await pool.query<Issue>(q, values);
  return r.rows;
}

export async function getIssueById(id: number) {
  const r = await pool.query<Issue>('SELECT id,title,description,type,status,reporter_id,created_at,updated_at FROM issues WHERE id = $1', [id]);
  return r.rows[0] || null;
}

export async function updateIssue(id: number, fields: UpdateIssueFields) {
  const allowed: (keyof UpdateIssueFields)[] = ['title', 'description', 'type', 'status'];
  const sets: string[] = [];
  const values: UpdateValue[] = [];
  let idx = 1;
  for (const k of Object.keys(fields) as (keyof UpdateIssueFields)[]) {
    if (!allowed.includes(k)) continue;
    const value = fields[k];
    if (value === undefined) continue;
    sets.push(`${k} = $${idx++}`);
    values.push(value);
  }
  if (!sets.length) return getIssueById(id);
  const queryValues: (string | number)[] = [...values, id];
  const q = `UPDATE issues SET ${sets.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING id,title,description,type,status,reporter_id,created_at,updated_at`;
  const r = await pool.query<Issue>(q, queryValues);
  return r.rows[0] || null;
}

export async function deleteIssue(id: number) {
  await pool.query('DELETE FROM issues WHERE id = $1', [id]);
}

export async function getUsersByIds(ids: number[]) {
  if (!ids.length) return [];
  const params = ids.map((_, i) => `$${i + 1}`).join(',');
  const r = await pool.query<Reporter>(`SELECT id,name,role FROM users WHERE id IN (${params})`, ids);
  return r.rows;
}
