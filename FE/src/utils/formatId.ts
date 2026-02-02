/**
 * Formats an ID string to include dashes
 * Example: AD20260001 -> AD-2026-0001
 * Example: RS20260123 -> RS-2026-0123
 */
export function formatId(id: string): string {
  // If ID already has dashes, return as is
  if (id.includes('-')) {
    return id;
  }
  
  // Extract parts: prefix (2 letters), year (4 digits), number (4 digits)
  const prefix = id.slice(0, 2);
  const year = id.slice(2, 6);
  const number = id.slice(6);
  
  return `${prefix}-${year}-${number}`;
}
