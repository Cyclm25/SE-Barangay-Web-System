const pool = require("./db");

async function main() {
  const residentId = "RS20260001";

  const result = await pool.query(
    `UPDATE resident
     SET "FirstName" = $1,
         "LastName" = $2
     WHERE "ResidentID" = $3
     RETURNING "ResidentID", "FirstName", "MiddleName", "LastName"`,
    ["MARC JEROME", "BALBOA", residentId]
  );

  console.log(result.rows[0] || null);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

