const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * =====================================================
 *  GET /api/transactions/recent?limit=5
 *  PURPOSE:
 *  - Used by Dashboard "Recent Activities"
 *  - Returns latest N transaction logs only
 * =====================================================
 */
router.get("/recent", async (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || "5", 10), 20));

  try {
    const result = await pool.query(
      `
      SELECT
        th."CreatedAt" AS timestamp,

        -- ACCOUNT: <name> (<id>)
        CASE
          WHEN sa."SuperAdminID" IS NOT NULL THEN
            CONCAT('SuperAdmin', ' (', th."ResidentID", ')')

          WHEN ba."BarangayAdminID" IS NOT NULL THEN
            CONCAT(COALESCE(ba."AdminName", 'Admin'), ' (', th."ResidentID", ')')

          WHEN r."ResidentID" IS NOT NULL THEN
            CONCAT(
              COALESCE(r."FirstName",''),
              CASE
                WHEN r."MiddleName" IS NOT NULL AND r."MiddleName" <> ''
                  THEN ' ' || LEFT(r."MiddleName",1) || '.'
                ELSE ''
              END,
              CASE
                WHEN r."LastName" IS NOT NULL AND r."LastName" <> ''
                  THEN ' ' || r."LastName"
                ELSE ''
              END,
              ' (', th."ResidentID", ')'
            )

          ELSE
            CONCAT('(', th."ResidentID", ')')
        END AS account,

        COALESCE(th."Action",'') AS action,

        TRIM(
          CONCAT(
            COALESCE(th."RequestType",''),
            CASE
              WHEN th."RequestPurpose" IS NOT NULL AND th."RequestPurpose" <> ''
                THEN ' - ' || th."RequestPurpose"
              ELSE ''
            END,
            CASE
              WHEN th."RequestStatus" IS NOT NULL AND th."RequestStatus" <> ''
                THEN ' (' || th."RequestStatus" || ')'
              ELSE ''
            END
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
      LIMIT $1;
      `,
      [limit]
    );

    res.json(result.rows);
  } catch (e) {
    console.error("RECENT TRANSACTIONS ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});


/**
 * =====================================================
 *  GET /api/transactions
 *  PURPOSE:
 *  - Full Transaction Log Page
 * =====================================================
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        th."TransactionID"::text AS id,
        th."CreatedAt"           AS timestamp,

        CASE
          WHEN sa."SuperAdminID" IS NOT NULL THEN
            CONCAT('SuperAdmin', ' (', th."ResidentID", ')')

          WHEN ba."BarangayAdminID" IS NOT NULL THEN
            CONCAT(COALESCE(ba."AdminName", 'Admin'), ' (', th."ResidentID", ')')

          WHEN r."ResidentID" IS NOT NULL THEN
            CONCAT(
              COALESCE(r."FirstName",''),
              CASE
                WHEN r."MiddleName" IS NOT NULL AND r."MiddleName" <> ''
                  THEN ' ' || LEFT(r."MiddleName",1) || '.'
                ELSE ''
              END,
              CASE
                WHEN r."LastName" IS NOT NULL AND r."LastName" <> ''
                  THEN ' ' || r."LastName"
                ELSE ''
              END,
              ' (', th."ResidentID", ')'
            )

          ELSE
            CONCAT('(', th."ResidentID", ')')
        END AS account,

        CASE
          WHEN sa."SuperAdminID" IS NOT NULL THEN 'Admin'
          WHEN ba."BarangayAdminID" IS NOT NULL THEN 'Admin'
          ELSE 'Resident'
        END AS "accountType",

        COALESCE(th."Action",'') AS action,

        TRIM(
          CONCAT(
            COALESCE(th."RequestType",''),
            CASE
              WHEN th."RequestPurpose" IS NOT NULL AND th."RequestPurpose" <> ''
                THEN ' - ' || th."RequestPurpose"
              ELSE ''
            END,
            CASE
              WHEN th."RequestStatus" IS NOT NULL AND th."RequestStatus" <> ''
                THEN ' (' || th."RequestStatus" || ')'
              ELSE ''
            END
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

    res.json({
      stats: {
        total,
        adminActions: 0,
        residentActions: total,
      },
      transactions: result.rows,
    });

  } catch (e) {
    console.error("TRANSACTIONS ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;