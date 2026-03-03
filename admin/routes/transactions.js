const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
  th."TransactionID"::text AS id,
  th."CreatedAt"           AS timestamp,

  -- ACCOUNT: <name> (<id>)
  CASE
    -- SuperAdmin has no name columns -> label only
    WHEN sa."SuperAdminID" IS NOT NULL THEN
      CONCAT('SuperAdmin', ' (', th."ResidentID", ')')

    -- Barangay Admin name
    WHEN ba."BarangayAdminID" IS NOT NULL THEN
      CONCAT(COALESCE(ba."AdminName", 'Admin'), ' (', th."ResidentID", ')')

    -- Resident name
    WHEN r."ResidentID" IS NOT NULL THEN
      CONCAT(
        COALESCE(r."FirstName",''),
        CASE WHEN r."MiddleName" IS NOT NULL AND r."MiddleName" <> '' THEN ' ' || LEFT(r."MiddleName",1) || '.' ELSE '' END,
        CASE WHEN r."LastName" IS NOT NULL AND r."LastName" <> '' THEN ' ' || r."LastName" ELSE '' END,
        ' (', th."ResidentID", ')'
      )

    -- Fallback
    ELSE
      CONCAT('(', th."ResidentID", ')')
  END AS account,

  -- TYPE column (Admin vs Resident)
  CASE
    WHEN sa."SuperAdminID" IS NOT NULL THEN 'Admin'
    WHEN ba."BarangayAdminID" IS NOT NULL THEN 'Admin'
    ELSE 'Resident'
  END AS "accountType",

  COALESCE(th."Action",'') AS action,

  TRIM(
    CONCAT(
      COALESCE(th."RequestType",''),
      CASE WHEN th."RequestPurpose" IS NOT NULL AND th."RequestPurpose" <> '' THEN ' - ' || th."RequestPurpose" ELSE '' END,
      CASE WHEN th."RequestStatus"  IS NOT NULL AND th."RequestStatus"  <> '' THEN ' (' || th."RequestStatus" || ')' ELSE '' END
    )
  ) AS details,

  COALESCE(th."RequestType", 'System') AS module

FROM transaction_history th

LEFT JOIN resident r
  ON TRIM(r."ResidentID") = TRIM(th."ResidentID")

LEFT JOIN barangayadmin ba
  ON TRIM(ba."BarangayAdminID") = TRIM(th."ResidentID")

LEFT JOIN superadmin sa
  ON TRIM(sa."SuperAdminID") = TRIM(th."ResidentID")

ORDER BY th."CreatedAt" DESC
LIMIT 500;
    `);

        const total = result.rows.length;
        console.log("TRANSACTIONS API rows:", result.rows[0]);

        res.json({
            stats: {
                total,
                adminActions: 0,
                residentActions: total,
            },
            transactions: result.rows,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;