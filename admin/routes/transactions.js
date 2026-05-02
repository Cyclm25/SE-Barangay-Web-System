const express = require("express");
const router = express.Router();
const pool = require("../db");

const REQUESTER_NAME_SQL = `
  COALESCE(
    NULLIF(
      TRIM(
        CONCAT(
          COALESCE(request_resident."FirstName",''),
          CASE
            WHEN request_resident."MiddleName" IS NOT NULL AND request_resident."MiddleName" <> ''
              THEN ' ' || LEFT(request_resident."MiddleName",1) || '.'
            ELSE ''
          END,
          CASE
            WHEN request_resident."LastName" IS NOT NULL AND request_resident."LastName" <> ''
              THEN ' ' || request_resident."LastName"
            ELSE ''
          END
        )
      ),
      ''
    ),
    req."ResidentID"
  )
`;

const REQUEST_TRANSACTION_DETAILS_SQL = `
  TRIM(
    CONCAT(
      COALESCE(req."RequestType", th."RequestType", 'Online Request'),
      ' - Requester: ',
      ${REQUESTER_NAME_SQL},
      ' (', req."ResidentID", ')',
      CASE
        WHEN req."RequestPurpose" IS NOT NULL AND req."RequestPurpose" <> ''
          THEN ' - Purpose: ' || req."RequestPurpose"
        ELSE ''
      END,
      CASE
        WHEN req."RejectionReason" IS NOT NULL AND req."RejectionReason" <> ''
          THEN ' - Reason: ' || req."RejectionReason"
        ELSE ''
      END,
      CASE
        WHEN COALESCE(th."RequestStatus", req."RequestStatus") IS NOT NULL
          AND COALESCE(th."RequestStatus", req."RequestStatus") <> ''
          THEN ' (' ||
            CASE
              WHEN COALESCE(th."RequestStatus", req."RequestStatus") IN ('Rejected','Denied')
                THEN 'Denied'
              ELSE COALESCE(th."RequestStatus", req."RequestStatus")
            END || ')'
        ELSE ''
      END
    )
  )
`;

const DENIED_REQUEST_DETAILS_SQL = `
  TRIM(
    CONCAT(
      COALESCE(req."RequestType", 'Online Request'),
      ' - Requester: ',
      ${REQUESTER_NAME_SQL},
      ' (', req."ResidentID", ')',
      CASE
        WHEN req."RequestPurpose" IS NOT NULL AND req."RequestPurpose" <> ''
          THEN ' - Purpose: ' || req."RequestPurpose"
        ELSE ''
      END,
      CASE
        WHEN req."RejectionReason" IS NOT NULL AND req."RejectionReason" <> ''
          THEN ' - Reason: ' || req."RejectionReason"
        ELSE ''
      END,
      ' (Denied)'
    )
  )
`;

function buildTransactionActivitySelect({ includeId = false } = {}) {
  return `
    SELECT
      ${includeId ? 'th."TransactionID"::text AS id,' : ""}
      th."CreatedAt" AS timestamp,

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

      ${includeId ? `
      CASE
        WHEN sa."SuperAdminID" IS NOT NULL THEN 'Admin'
        WHEN ba."BarangayAdminID" IS NOT NULL THEN 'Admin'
        ELSE 'Resident'
      END AS "accountType",
      ` : ""}

      COALESCE(th."Action",'') AS action,

      CASE
        WHEN th."RequestID" IS NOT NULL AND req."RequestID" IS NOT NULL
          THEN ${REQUEST_TRANSACTION_DETAILS_SQL}
        WHEN th."RequestType" = 'Resident Records'
          AND th."RequestPurpose" LIKE 'Created resident:%'
          AND target_resident."ResidentID" IS NOT NULL
        THEN
          CONCAT(
            'Resident Records - Created resident: ',
            TRIM(
              CONCAT(
                COALESCE(target_resident."FirstName",''),
                CASE
                  WHEN target_resident."MiddleName" IS NOT NULL AND target_resident."MiddleName" <> ''
                    THEN ' ' || target_resident."MiddleName"
                  ELSE ''
                END,
                CASE
                  WHEN target_resident."LastName" IS NOT NULL AND target_resident."LastName" <> ''
                    THEN ' ' || target_resident."LastName"
                  ELSE ''
                END
              )
            ),
            CASE
              WHEN th."RequestStatus" IS NOT NULL AND th."RequestStatus" <> ''
                THEN ' (' || th."RequestStatus" || ')'
              ELSE ''
            END
          )
        ELSE
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
          )
      END AS details,

      COALESCE(th."RequestType", 'System') AS module

    FROM transaction_history th

    LEFT JOIN resident r
      ON TRIM(r."ResidentID") = TRIM(th."ResidentID")

    LEFT JOIN barangayadmin ba
      ON TRIM(ba."BarangayAdminID") = TRIM(th."ResidentID")

    LEFT JOIN superadmin sa
      ON TRIM(sa."SuperAdminID") = TRIM(th."ResidentID")

    LEFT JOIN resident target_resident
      ON TRIM(target_resident."ResidentID") =
         TRIM(SUBSTRING(th."RequestPurpose" FROM 'Created resident:\\s*([A-Z0-9-]+)'))

    LEFT JOIN "request" req
      ON req."RequestID" = th."RequestID"

    LEFT JOIN resident request_resident
      ON TRIM(request_resident."ResidentID") = TRIM(req."ResidentID")
  `;
}

function buildDeniedRequestActivitySelect({ includeId = false } = {}) {
  return `
    SELECT
      ${includeId ? `CONCAT('denied-request-', req."RequestID"::text) AS id,` : ""}
      COALESCE(req."CompletionDate", req."PickupDate", req."RequestDate", NOW()) AS timestamp,
      CONCAT(${REQUESTER_NAME_SQL}, ' (', req."ResidentID", ')') AS account,
      ${includeId ? "'Resident' AS \"accountType\"," : ""}
      'Denied Document Request' AS action,
      ${DENIED_REQUEST_DETAILS_SQL} AS details,
      'Online Requests' AS module
    FROM "request" req
    LEFT JOIN resident request_resident
      ON TRIM(request_resident."ResidentID") = TRIM(req."ResidentID")
    WHERE req."RequestStatus" IN ('Rejected','Denied')
      AND NOT EXISTS (
        SELECT 1
        FROM transaction_history existing_th
        WHERE existing_th."RequestID" = req."RequestID"
          AND (
            existing_th."RequestStatus" IN ('Rejected','Denied')
            OR LOWER(COALESCE(existing_th."Action",'')) LIKE '%denied%'
            OR LOWER(COALESCE(existing_th."Action",'')) LIKE '%reject%'
          )
      )
  `;
}

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
      SELECT *
      FROM (
        ${buildTransactionActivitySelect()}
        UNION ALL
        ${buildDeniedRequestActivitySelect()}
      ) activity
      ORDER BY activity.timestamp DESC
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
      SELECT *
      FROM (
        ${buildTransactionActivitySelect({ includeId: true })}
        UNION ALL
        ${buildDeniedRequestActivitySelect({ includeId: true })}
      ) activity
      ORDER BY activity.timestamp DESC
      LIMIT 500;
    `);

    const total = result.rows.length;
    const adminActions = result.rows.filter((row) => {
      const accountType = String(row.accountType || "").toLowerCase();
      return accountType === "admin" || accountType === "superadmin" || accountType === "super admin";
    }).length;

    res.json({
      stats: {
        total,
        adminActions,
        residentActions: total - adminActions,
      },
      transactions: result.rows,
    });

  } catch (e) {
    console.error("TRANSACTIONS ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
