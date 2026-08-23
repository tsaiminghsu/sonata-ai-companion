'use client';

// Minimal localStorage-backed "database" for demo mode. Not a general
// query engine - just enough table/filter/sort/subscribe operations to back
// the exact calls lib/demo/mockDataClient.ts makes.

export type Row = Record<string, unknown>;

const PREFIX = 'sonata-demo:';

function loadTable(table: string): Row[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + table);
    return raw ? (JSON.parse(raw) as Row[]) : [];
  } catch {
    return [];
  }
}

function saveTable(table: string, rows: Row[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}

type Listener = (row: Row) => void;
const updateListeners = new Map<string, Set<Listener>>();

function notifyUpdate(table: string, row: Row): void {
  updateListeners.get(table)?.forEach((cb) => cb(row));
}

export function onTableUpdate(table: string, cb: Listener): () => void {
  if (!updateListeners.has(table)) updateListeners.set(table, new Set());
  updateListeners.get(table)!.add(cb);
  return () => updateListeners.get(table)?.delete(cb);
}

export function getRow(table: string, id: string, idField = 'id'): Row | undefined {
  return loadTable(table).find((r) => r[idField] === id);
}

export function getRowByKey(table: string, key: Record<string, unknown>): Row | undefined {
  const rows = loadTable(table);
  return rows.find((r) => Object.entries(key).every(([k, v]) => r[k] === v));
}

export function putRow(table: string, row: Row, idField = 'id'): Row {
  const rows = loadTable(table);
  const idx = rows.findIndex((r) => r[idField] === row[idField]);
  if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
  else rows.push(row);
  saveTable(table, rows);
  const saved = idx >= 0 ? rows[idx] : row;
  notifyUpdate(table, saved);
  return saved;
}

export function putRowByKey(table: string, key: Record<string, unknown>, row: Row): Row {
  const rows = loadTable(table);
  const idx = rows.findIndex((r) => Object.entries(key).every(([k, v]) => r[k] === v));
  const merged = { ...key, ...(idx >= 0 ? rows[idx] : {}), ...row };
  if (idx >= 0) rows[idx] = merged;
  else rows.push(merged);
  saveTable(table, rows);
  notifyUpdate(table, merged);
  return merged;
}

export function deleteRow(table: string, id: string, idField = 'id'): void {
  saveTable(
    table,
    loadTable(table).filter((r) => r[idField] !== id)
  );
}

export function listByField(
  table: string,
  field: string,
  value: unknown,
  opts?: { sortField?: string; sortDirection?: 'ASC' | 'DESC'; limit?: number }
): Row[] {
  let rows = loadTable(table).filter((r) => r[field] === value);
  if (opts?.sortField) {
    const dir = opts.sortDirection === 'DESC' ? -1 : 1;
    rows = rows.sort((a, b) => {
      const av = String(a[opts.sortField!] ?? '');
      const bv = String(b[opts.sortField!] ?? '');
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }
  return opts?.limit ? rows.slice(0, opts.limit) : rows;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
