const pool = require("./db");

(async () => {
  try {
    const resident = await pool.query(
      `SELECT "ResidentID" FROM resident WHERE "Email" LIKE 'mock.resident.%@example.com' ORDER BY "ResidentID" ASC LIMIT 1`
    );
    const admin = await pool.query(
      `SELECT "BarangayAdminID" FROM barangayadmin WHERE "Email" LIKE 'mock.official.%@example.com' ORDER BY "BarangayAdminID" ASC LIMIT 1`
    );
    console.log(`RESIDENT_ID=${resident.rows[0]?.ResidentID || ""}`);
    console.log(`ADMIN_ID=${admin.rows[0]?.BarangayAdminID || ""}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

