/**
 * Example Usage of Year-Based ID Generator
 * 
 * This file demonstrates how to use the generateYearBasedId and generateNextId functions
 * to generate IDs based on the current year with an incrementing counter.
 */

const { 
  generateYearBasedId, 
  generateNextId, 
  getYearFromId, 
  getSequenceFromId,
  isCurrentYearId 
} = require('../utils/idGenerator');

// Example 1: Generate a specific ID with sequence number
console.log('Example 1: Manual ID Generation');
console.log('Sequence 1:', generateYearBasedId(1));      // 20260001 (if current year is 2026)
console.log('Sequence 42:', generateYearBasedId(42));    // 20260042
console.log('Sequence 1000:', generateYearBasedId(1000)); // 20261000
console.log('');

// Example 2: Extract year from ID
console.log('Example 2: Extract Year from ID');
console.log('Year from 20260001:', getYearFromId('20260001')); // 2026
console.log('Year from 20270042:', getYearFromId('20270042')); // 2027
console.log('');

// Example 3: Extract sequence number from ID
console.log('Example 3: Extract Sequence Number');
console.log('Sequence from 20260001:', getSequenceFromId('20260001')); // 1
console.log('Sequence from 20270042:', getSequenceFromId('20270042')); // 42
console.log('');

// Example 4: Check if ID is from current year
console.log('Example 4: Check if Current Year');
// These results depend on the current year
const currentYearId = generateYearBasedId(1);
console.log(`Is "${currentYearId}" from current year?`, isCurrentYearId(currentYearId)); // true
console.log(`Is "20200001" from current year?`, isCurrentYearId('20200001')); // false (unless current year is 2020)
console.log('');

// Example 5: Using in database operations (async example)
// This would be used in your resident registration route
/*
const pool = require('../db');

async function registerResident(residentData) {
  try {
    // Generate the next resident ID
    const newResidentId = await generateNextId(pool, 'resident', 'ResidentID');
    
    console.log('Generated Resident ID:', newResidentId);
    
    // Then use this ID in your INSERT statement
    const result = await pool.query(
      `INSERT INTO resident ("ResidentID", "FirstName", "LastName", ...)
       VALUES ($1, $2, $3, ...)
       RETURNING *`,
      [newResidentId, residentData.firstName, residentData.lastName, ...]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
}
*/

module.exports = {
  generateYearBasedId,
  generateNextId,
  getYearFromId,
  getSequenceFromId,
  isCurrentYearId,
};
