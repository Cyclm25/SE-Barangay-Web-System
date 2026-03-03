/**
 * Generates an ID based on the current year with an incrementing counter
 * Example: 20260001, 20260002, etc. (for year 2026)
 * Example: 20270001, 20270002, etc. (for year 2027)
 * @param sequenceNumber - The sequential number for the current year (1, 2, 3, etc.)
 * @returns ID in format YYYYNNNN where YYYY is the current year and NNNN is the sequence number
 */
export function generateYearBasedId(sequenceNumber: number): string {
  const currentYear = new Date().getFullYear();
  const paddedSequence = String(sequenceNumber).padStart(4, '0');
  return `${currentYear}${paddedSequence}`;
}

/**
 * Extracts the year from a year-based ID
 * Example: 20260001 -> 2026
 * Example: 20270042 -> 2027
 */
export function getYearFromId(id: string): number {
  return parseInt(id.slice(0, 4), 10);
}

/**
 * Extracts the sequence number from a year-based ID
 * Example: 20260001 -> 1
 * Example: 20270042 -> 42
 */
export function getSequenceFromId(id: string): number {
  return parseInt(id.slice(4), 10);
}

/**
 * Checks if an ID is from the current year
 * Example: 20260001 -> false (if current year is 2027)
 * Example: 20270001 -> true (if current year is 2027)
 */
export function isCurrentYearId(id: string): boolean {
  const currentYear = new Date().getFullYear();
  const idYear = getYearFromId(id);
  return idYear === currentYear;
}

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
