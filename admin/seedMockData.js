const pool = require("./db");
const bcrypt = require("bcrypt");

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

async function getResidentColumns(client) {
  const q = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='resident'`
  );
  const rows = q.rows.map((r) => String(r.column_name));
  const cols = new Set(rows.map((c) => c.toLowerCase()));
  const getExact = (name) => rows.find((c) => c.toLowerCase() === name.toLowerCase()) || null;
  return {
    religion: cols.has("religion") ? getExact("religion") : null,
    nationality: cols.has("nationality") ? getExact("nationality") : null,
    city: cols.has("city") ? getExact("city") : null,
    province: cols.has("province") ? getExact("province") : null,
    zipcode: cols.has("zipcode") ? getExact("zipcode") : null,
  };
}

async function nextResidentId(client) {
  const result = await client.query(
    `SELECT "ResidentID" FROM resident WHERE "ResidentID" ~ '^RS[0-9]{8}$' ORDER BY CAST(RIGHT("ResidentID", 4) AS INTEGER) DESC LIMIT 1`
  );
  const year = new Date().getFullYear();
  const last = result.rows[0]?.ResidentID;
  const n = last ? (parseInt(String(last).slice(-4), 10) || 0) + 1 : 1;
  return `RS${year}${String(n).padStart(4, "0")}`;
}

async function nextOfficialId(client) {
  const result = await client.query(
    `SELECT "BarangayAdminID" FROM barangayadmin WHERE "BarangayAdminID" ~ '^AD[0-9]{8}$' ORDER BY CAST(RIGHT("BarangayAdminID", 4) AS INTEGER) DESC LIMIT 1`
  );
  const year = new Date().getFullYear();
  const last = result.rows[0]?.BarangayAdminID;
  const n = last ? (parseInt(String(last).slice(-4), 10) || 0) + 1 : 1;
  return `AD${year}${String(n).padStart(4, "0")}`;
}

async function nextAnnouncementId(client) {
  const result = await client.query(`SELECT "AnnouncementID" FROM announcement ORDER BY "AnnouncementID" DESC LIMIT 1`);
  const last = Number(result.rows[0]?.AnnouncementID);
  return Number.isFinite(last) ? last + 1 : 1;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const firstNames = ["JUAN", "MARIA", "JOSE", "ANA", "CARLO", "LIZA", "MIGUEL", "ANGEL", "PAOLO", "KRISTINE", "MARK", "JEN", "LEA", "ROSE", "PAUL"];
    const middleNames = ["SANTOS", "REYES", "CRUZ", "LOPEZ", "GARCIA", "TORRES", "RAMOS", "VILLA", "DELA PAZ", ""];
    const lastNames = ["DELA CRUZ", "SANTOS", "REYES", "RAMOS", "GARCIA", "TORRES", "MENDOZA", "BAUTISTA", "NAVARRO", "DE LEON"];
    const streets = ["GEN. TUAZON BLVD", "MABINI ST", "RIZAL AVE", "BONIFACIO ST", "DEL PILAR ST"];
    const positions = ["Barangay Captain", "Kagawad", "SK Kagawad", "SK Chairman", "Secretary", "Treasurer"];
    const certTypes = [
      "Barangay Certificate",
      "Certificate of Residency",
      "Certificate of Indigency",
      "Certificate of Good Moral",
      "Certificate of Solo Parent",
    ];
    const docTypes = [
      "Barangay Clearance",
      "Business Permit Endorsement",
      "First Time Job Seeker",
      "Cedula Request",
      "Proof of Billing Request",
    ];
    const requestStatuses = ["Pending", "Processing", "Ready for Pickup", "Completed", "Rejected", "Returned for Completion"];

    const residentCols = await getResidentColumns(client);

    const mockResidentIds = [];
    for (let i = 0; i < 40; i += 1) {
      const id = await nextResidentId(client);
      const first = pick(firstNames);
      const middle = pick(middleNames);
      const last = pick(lastNames);
      const birth = new Date(rand(1965, 2004), rand(0, 11), rand(1, 28));
      const age = new Date().getFullYear() - birth.getFullYear();
      const gender = rand(0, 1) ? "Male" : "Female";
      const email = `mock.resident.${id.toLowerCase()}@example.com`;
      const contact = `09${rand(100000000, 999999999)}`;

      const columns = [
        `"ResidentID"`, `"FirstName"`, `"MiddleName"`, `"LastName"`, `"Age"`, `"Birthday"`, `"Gender"`,
        `"CivilStatus"`, `"ResidentType"`, `"VoterStatus"`, `"HouseNumber"`, `"StreetAddress"`, `"ContactNumber"`, `"Email"`,
        `"FatherName"`, `"MotherName"`, `"SpouseName"`, `"NoOfChildren"`, `"ContactPerson"`, `"ContactPersonNo"`, `"ContactPersonAddress"`,
        `"BarangayCard"`, `"ProfileImage"`, `"status"`,
      ];
      const values = [
        id, first, middle || null, last, age, ymd(birth), gender,
        pick(["Single", "Married", "Widowed"]), "RESIDENT", rand(0, 1), `${rand(1, 300)}`, pick(streets), contact, email,
        "N/A", "N/A", null, rand(0, 4), "EMERGENCY CONTACT", `09${rand(100000000, 999999999)}`, "MANILA CITY",
        "N/A", null, "Active",
      ];
      if (residentCols.religion) {
        columns.push(`"${residentCols.religion}"`);
        values.push(pick(["CATHOLIC", "CHRISTIAN", "IGLESIA NI CRISTO"]));
      }
      if (residentCols.nationality) {
        columns.push(`"${residentCols.nationality}"`);
        values.push("FILIPINO");
      }
      if (residentCols.city) {
        columns.push(`"${residentCols.city}"`);
        values.push("MANILA CITY");
      }
      if (residentCols.province) {
        columns.push(`"${residentCols.province}"`);
        values.push("NCR");
      }
      if (residentCols.zipcode) {
        columns.push(`"${residentCols.zipcode}"`);
        values.push("1013");
      }

      await client.query(
        `INSERT INTO resident (${columns.join(",")}) VALUES (${values.map((_, n) => `$${n + 1}`).join(",")})`,
        values
      );

      const hash = await bcrypt.hash("Resident@123", 10);
      await client.query(
        `INSERT INTO residentaccount ("ResidentID","Password","Role") VALUES ($1,$2,'Resident')`,
        [id, hash]
      );

      await client.query(
        `INSERT INTO transaction_history ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
         VALUES (NULL,$1,'Created Resident Account','Success','Resident Records',$2,NOW())`,
        [id, `Created resident: ${id}`]
      );
      mockResidentIds.push(id);
    }

    const superAdminRef = await client.query(`SELECT "SuperAdminID" FROM superadmin LIMIT 1`);
    const superAdminId = superAdminRef.rows[0]?.SuperAdminID || null;
    const mockOfficialIds = [];
    for (let i = 0; i < 10; i += 1) {
      const id = await nextOfficialId(client);
      const name = `${pick(firstNames)} ${pick(lastNames)}`;
      const email = `mock.official.${id.toLowerCase()}@example.com`;
      const contact = `09${rand(100000000, 999999999)}`;
      const hash = await bcrypt.hash("Official@123", 10);
      const termStart = new Date(2025, 0, 1);
      const termEnd = new Date(2028, 11, 31);

      await client.query(
        `INSERT INTO barangayadmin ("BarangayAdminID","AdminName","Position","Email","ContactNumber","Password","Status","DateCreated","SuperAdminID","TermStart","TermEnd","ProfileImage")
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),$7,$8,$9,NULL)`,
        [id, name, pick(positions), email, contact, hash, superAdminId, ymd(termStart), ymd(termEnd)]
      );
      await client.query(
        `INSERT INTO residentaccount ("BarangayAdminID","Password","Role") VALUES ($1,$2,'Admin')`,
        [id, hash]
      );
      await client.query(
        `INSERT INTO transaction_history ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
         VALUES (NULL,$1,'Created Official Account','Success','Barangay Officials',$2,NOW())`,
        [id, `Created official: ${name}`]
      );
      mockOfficialIds.push(id);
    }

    let nextAnnId = await nextAnnouncementId(client);
    for (let i = 0; i < 5; i += 1) {
      const postedBy = mockOfficialIds[i % mockOfficialIds.length];
      await client.query(
        `INSERT INTO announcement ("AnnouncementID","Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","IsScheduled","ScheduledPublishDate","PublishedDate","ExpirationDate","Images","IsPublished")
         VALUES ($1,$2,$3,'Admin',$4,$5,'Active',NOW(),false,NULL,NOW(),NULL,$6,true)`,
        [
          nextAnnId++,
          `Mock Announcement ${i + 1}`,
          `This is mock announcement #${i + 1} generated for dashboard testing.`,
          postedBy,
          ["All"],
          [],
        ]
      );
      await client.query(
        `INSERT INTO transaction_history ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
         VALUES (NULL,$1,'Created Announcement','Success','Announcements',$2,NOW())`,
        [postedBy, `Created announcement: Mock Announcement ${i + 1}`]
      );
    }

    const createdRequestIds = [];
    for (let i = 0; i < 50; i += 1) {
      const residentId = pick(mockResidentIds);
      const isCert = i < 25;
      const requestType = isCert ? pick(certTypes) : pick(docTypes);
      const requestPurpose = isCert ? "For school/employment requirement" : "For government transaction";
      const status = pick(requestStatuses);
      const reqDate = new Date();
      reqDate.setDate(reqDate.getDate() - rand(0, 30));

      const ins = await client.query(
        `INSERT INTO request ("ResidentID","RequestDate","RequestType","RequestStatus","RequestPurpose")
         VALUES ($1,$2,$3,$4,$5)
         RETURNING "RequestID"`,
        [residentId, reqDate.toISOString(), requestType, status, requestPurpose]
      );
      const requestId = ins.rows[0].RequestID;
      createdRequestIds.push(requestId);

      await client.query(
        `INSERT INTO transaction_history ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
         VALUES ($1,$2,'Created Request',$3,'Online Requests',$4,NOW())`,
        [requestId, residentId, status, `${requestType} - ${requestPurpose}`]
      );
    }

    await client.query("COMMIT");

    const counts = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS c FROM resident WHERE "Email" LIKE 'mock.resident.%@example.com'`),
      client.query(`SELECT COUNT(*)::int AS c FROM barangayadmin WHERE "Email" LIKE 'mock.official.%@example.com'`),
      client.query(`SELECT COUNT(*)::int AS c FROM request WHERE "RequestPurpose" IN ('For school/employment requirement','For government transaction')`),
      client.query(`SELECT COUNT(*)::int AS c FROM request WHERE "RequestPurpose" = 'For school/employment requirement'`),
      client.query(`SELECT COUNT(*)::int AS c FROM request WHERE "RequestPurpose" = 'For government transaction'`),
      client.query(`SELECT COUNT(*)::int AS c FROM announcement WHERE "Title" LIKE 'Mock Announcement %'`),
      client.query(`SELECT COUNT(*)::int AS c FROM transaction_history WHERE "Action" IN ('Created Resident Account','Created Official Account','Created Announcement','Created Request')`),
    ]);

    console.log("Seed complete:");
    console.log("Residents:", counts[0].rows[0].c);
    console.log("Officials:", counts[1].rows[0].c);
    console.log("Requests total:", counts[2].rows[0].c);
    console.log("Requests certificates:", counts[3].rows[0].c);
    console.log("Requests other docs:", counts[4].rows[0].c);
    console.log("Announcements:", counts[5].rows[0].c);
    console.log("Activity logs (mock actions):", counts[6].rows[0].c);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
