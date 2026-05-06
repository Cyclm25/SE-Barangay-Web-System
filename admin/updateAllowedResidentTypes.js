const pool = require("./db");

async function main() {
  const allowed = ["RESIDENT", "STUDENT", "SENIOR CITIZEN", "PWD", "INDIGENOUS"];
  const result = await pool.query(
    `SELECT "ResidentID" FROM resident
     WHERE "Email" LIKE 'mock.resident.%@example.com'
     ORDER BY "ResidentID" ASC`
  );

  for (let i = 0; i < result.rows.length; i += 1) {
    const id = result.rows[i].ResidentID;
    const type = allowed[i % allowed.length];
    await pool.query(
      `UPDATE resident
       SET "ResidentType" = $1, "status" = 'Active'
       WHERE "ResidentID" = $2`,
      [type, id]
    );
  }

  const types = await pool.query(
    `SELECT "ResidentType", COUNT(*)::int AS count
     FROM resident
     WHERE "Email" LIKE 'mock.resident.%@example.com'
     GROUP BY "ResidentType"
     ORDER BY "ResidentType"`
  );

  const statuses = await pool.query(
    `SELECT "status", COUNT(*)::int AS count
     FROM resident
     WHERE "Email" LIKE 'mock.resident.%@example.com'
     GROUP BY "status"
     ORDER BY "status"`
  );

  console.log("types", types.rows);
  console.log("status", statuses.rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

