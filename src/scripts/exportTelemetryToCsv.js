// scripts/exportTelemetryToCsv.js
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  let s = String(value).replace(/\r?\n/g, " ").replace(/"/g, '""');
  if (/[",]/.test(s)) s = `"${s}"`;
  return s;
}

function tsToIso(ts) {
  try {
    if (!ts) return "";
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function exportSessions() {
  const outDir = "exports";
  ensureDir(outDir);

  const outPath = path.join(outDir, "telemetry_sessions.csv");
  const stream = fs.createWriteStream(outPath, { encoding: "utf8" });

  const headers = [
    "sessionId",
    "uid",
    "mode",
    "variant",
    "uiLevel",
    "startedAt",
    "endedAt",
    "lastSeenAt",
    "totalPlayMs",
    "totalClicks",
    "totalNavigations",
    "totalAnswers",
    "correctAnswers",
    "wrongAnswers",
    "appVersion",
    "clientId"
  ];
  stream.write(headers.join(",") + "\n");

  const col = db.collection("telemetrySessions");
  const pageSize = 500;

  let lastId = null;
  let total = 0;

  while (true) {
    let q = col.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (lastId) q = q.startAfter(lastId);

    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      const d = docSnap.data() || {};
      const row = [
        docSnap.id,
        d.uid || "",
        d.mode || "",
        d.variant || "",
        d.uiLevel || "",
        tsToIso(d.startedAt),
        tsToIso(d.endedAt),
        tsToIso(d.lastSeenAt),
        d.totalPlayMs ?? 0,
        d.totalClicks ?? 0,
        d.totalNavigations ?? 0,
        d.totalAnswers ?? 0,
        d.correctAnswers ?? 0,
        d.wrongAnswers ?? 0,
        d.appVersion || "",
        d.clientId || ""
      ].map(csvEscape);

      stream.write(row.join(",") + "\n");
      total++;
      lastId = docSnap.id;
    }
  }

  stream.end();
  console.log(`✅ Exported ${total} rows -> ${outPath}`);
}

exportSessions().catch((e) => {
  console.error("❌ Export failed:", e);
  process.exit(1);
});
