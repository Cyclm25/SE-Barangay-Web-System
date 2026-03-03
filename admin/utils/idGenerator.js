/**
 * ID Generator Utility
 * Generates IDs based on the current year with an incrementing counter
 * Example: 20260001, 20260002, etc. (for year 2026)
 * Example: 20270001, 20270002, etc. (for year 2027)
 */

/**
 * Generates an ID based on the current year with an incrementing counter
 * @param {number} sequenceNumber - The sequential number for the current year (1, 2, 3, etc.)
 * @returns {string} ID in format YYYYNNNN where YYYY is the current year and NNNN is the sequence number
 */
function generateYearBasedId(sequenceNumber) {
  const currentYear = new Date().getFullYear();
  const paddedSequence = String(sequenceNumber).padStart(4, '0');
  return `${currentYear}${paddedSequence}`;
}

/**
 * Generates the next ID by querying the database for the highest sequence number of the current year
 * @param {object} pool - The database connection pool
 * @param {string} tableName - The table to query (e.g., 'resident', 'barangayadmin')
 * @param {string} idColumnName - The column name containing the ID (e.g., 'ResidentID', 'BarangayAdminID')
 * @returns {Promise<string>} The next ID in format YYYYNNNN
 */
async function generateNextId(pool, tableName, idColumnName) {
  const currentYear = new Date().getFullYear();
  const yearPrefix = String(currentYear);
  
  try {
    // Query to find the highest sequence number for the current year
    const result = await pool.query(
      `
      SELECT CAST(SUBSTRING("${idColumnName}", 5) AS INTEGER) as sequence
      FROM "${tableName}"
      WHERE "${idColumnName}" LIKE $1
      ORDER BY sequence DESC
      LIMIT 1
      `,
      [`${yearPrefix}%`]
    );

    let nextSequence = 1;
    if (result.rows.length > 0 && result.rows[0].sequence) {
      nextSequence = result.rows[0].sequence + 1;
    }

    return generateYearBasedId(nextSequence);
  } catch (err) {
    console.error('Error generating next ID:', err.message);
    throw err;
  }
}

/**
 * Extracts the year from a year-based ID
 * @param {string} id - The ID (e.g., '20260001')
 * @returns {number} The year (e.g., 2026)
 */
function getYearFromId(id) {
  return parseInt(id.slice(0, 4), 10);
}

/**
 * Extracts the sequence number from a year-based ID
 * @param {string} id - The ID (e.g., '20260001')
 * @returns {number} The sequence number (e.g., 1)
 */
function getSequenceFromId(id) {
  return parseInt(id.slice(4), 10);
}

/**
 * Checks if an ID is from the current year
 * @param {string} id - The ID (e.g., '20260001')
 * @returns {boolean} True if the ID is from the current year
 */
function isCurrentYearId(id) {
  const currentYear = new Date().getFullYear();
  const idYear = getYearFromId(id);
  return idYear === currentYear;
}

module.exports = {
  generateYearBasedId,
  generateNextId,
  getYearFromId,
  getSequenceFromId,
  isCurrentYearId,
};
