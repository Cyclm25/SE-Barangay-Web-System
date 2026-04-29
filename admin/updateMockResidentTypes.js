const pool = require("./db");

async function main() {
  const types = [
    "Student",
    "PWD",
    "Indigenous",
    "Senior Citizen",
    "Solo Parent",
    "OFW",
    "Unemployed",
    "Employed",
    "Resident",
  ];

  const residents = await pool.query(
    `SELECT "ResidentID" FROM resident
     WHERE "Email" LIKE 'mock.resident.%@example.com'
     ORDER BY "ResidentID" ASC`
  );

  for (let i = 0; i < residents.rows.length; i += 1) {
    const id = residents.rows[i].ResidentID;
    const type = types[i % types.length];
    await pool.query(
      `UPDATE resident
       SET "ResidentType" = $1
       WHERE "ResidentID" = $2`,
      [type, id]
    );
  }

  const summary = await pool.query(
    `SELECT "ResidentType", COUNT(*)::int AS count
     FROM resident
     WHERE "Email" LIKE 'mock.resident.%@example.com'
     GROUP BY "ResidentType"
     ORDER BY "ResidentType"`
  );

  console.log(summary.rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

