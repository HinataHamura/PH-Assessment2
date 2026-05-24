export function buildWhereClause(filters: Record<string, string>) {
  const keys = Object.keys(filters);
  if (!keys.length) return { clause: '', values: [] };
  const parts: string[] = [];
  const values: string[] = [];
  keys.forEach((k, i) => {
    parts.push(`${k} = $${i + 1}`);
    values.push(filters[k] || '');
  });
  return { clause: 'WHERE ' + parts.join(' AND '), values };
}
