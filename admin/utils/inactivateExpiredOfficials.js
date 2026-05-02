const pool = require("../db");

async function inactivateExpiredOfficials() {
  const client = await pool.connect();

  try {
    console.log(`[Officials Term Check] Running check at ${new Date().toLocaleString('en-PH')}...`);

    // Automatically inactivate officials whose term has ended
    const result = await client.query(
      `
      UPDATE barangayadmin
      SET "Status" = FALSE
      WHERE "Status" = TRUE
        AND "TermEnd" IS NOT NULL
        AND "TermEnd" <= CURRENT_DATE
      RETURNING "BarangayAdminID", "AdminName", "Position", "TermEnd"
      `
    );

    // Logging results
    if (result.rowCount > 0) {
      console.log(`✅ Inactivated: ${result.rowCount} official(s) with expired term(s)`);
      result.rows.forEach(row => {
        console.log(`   - ${row.AdminName} (${row.Position}) - Term ended: ${row.TermEnd}`);
      });
    }

    return result;

  } catch (err) {
    console.error('[Officials Term Check] Error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = inactivateExpiredOfficials;
