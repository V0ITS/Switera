import "dotenv/config";
import { app } from "../index.js";
import prisma from "../db/prismaClient.js";

let exitCode = 0;

function report(label, ok, details) {
  console.log(`${label} ${ok}${details ? ` ${details}` : ""}`);
  if (!ok) exitCode = 1;
}

async function login(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  return { status: res.status, token: body.token };
}

async function main() {
  // Start the app on an ephemeral port so this script never collides with a
  // dev server already listening on PORT, and is safely re-runnable.
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const TEST_KOTA = "Pekanbaru";
  const TEST_TANGGAL = "2026-06-25";

  try {
    const admin = await login(baseUrl, "admin", "admin123");
    const logistik = await login(baseUrl, "logistik", "logistik123");

    report(
      "LOGIN_SETUP_OK",
      admin.status === 200 && Boolean(admin.token) && logistik.status === 200 && Boolean(logistik.token),
      `(admin status=${admin.status}, logistik status=${logistik.status})`
    );

    // (1) GET /permintaan with admin token -> 200 array
    const listRes = await fetch(`${baseUrl}/permintaan`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const listBody = await listRes.json();
    const listOk = listRes.status === 200 && Array.isArray(listBody);
    report("GET_PERMINTAAN_OK", listOk, listOk ? "" : `(status=${listRes.status})`);

    // (2) POST /permintaan with logistik token -> 403
    const forbiddenRes = await fetch(`${baseUrl}/permintaan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${logistik.token}` },
      body: JSON.stringify({
        kota: TEST_KOTA,
        tanggal_permintaan: TEST_TANGGAL,
        jumlah_permintaan: 5,
      }),
    });
    const forbiddenOk = forbiddenRes.status === 403;
    report("PERMINTAAN_RBAC_DENY_OK", forbiddenOk, forbiddenOk ? "" : `(status=${forbiddenRes.status})`);

    // (3) POST with admin token + jumlah_permintaan: -1 -> 400 with fields.jumlah_permintaan
    const badBodyRes = await fetch(`${baseUrl}/permintaan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        kota: TEST_KOTA,
        tanggal_permintaan: TEST_TANGGAL,
        jumlah_permintaan: -1,
      }),
    });
    const badBody = await badBodyRes.json();
    const badBodyOk = badBodyRes.status === 400 && Boolean(badBody?.fields?.jumlah_permintaan);
    report(
      "PERMINTAAN_VALIDATION_OK",
      badBodyOk,
      badBodyOk ? "" : `(status=${badBodyRes.status}, fields=${JSON.stringify(badBody?.fields)})`
    );

    // (4) POST valid -> 201, capture id
    const createRes = await fetch(`${baseUrl}/permintaan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        kota: TEST_KOTA,
        tanggal_permintaan: TEST_TANGGAL,
        tanggal_input: TEST_TANGGAL,
        jumlah_permintaan: 42,
        keterangan: "__PermintaanRoutesVerifyTemp__",
      }),
    });
    const createBody = await createRes.json();
    const createOk =
      createRes.status === 201 &&
      createBody.kota === TEST_KOTA &&
      createBody.jumlah_permintaan === 42 &&
      typeof createBody.id === "string" &&
      createBody.id.startsWith("PMT-");
    report("PERMINTAAN_CREATE_OK", createOk, createOk ? "" : `(status=${createRes.status}, body=${JSON.stringify(createBody)})`);
    const createdId = createBody.id;

    // (5) GET /permintaan/duplikat?kota=...&tanggal_permintaan=... -> 200 { duplikat: true }
    // (no excludeId passed, so the just-created row itself counts as the duplicate match)
    const dupRes = await fetch(
      `${baseUrl}/permintaan/duplikat?kota=${encodeURIComponent(TEST_KOTA)}&tanggal_permintaan=${encodeURIComponent(TEST_TANGGAL)}`,
      { headers: { Authorization: `Bearer ${admin.token}` } }
    );
    const dupBody = await dupRes.json();
    const dupOk = dupRes.status === 200 && dupBody.duplikat === true;
    report("PERMINTAAN_DUPLIKAT_OK", dupOk, dupOk ? "" : `(status=${dupRes.status}, body=${JSON.stringify(dupBody)})`);

    // PUT with logistik token -> 403
    const putForbiddenRes = await fetch(`${baseUrl}/permintaan/${encodeURIComponent(createdId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${logistik.token}` },
      body: JSON.stringify({ jumlah_permintaan: 99 }),
    });
    const putForbiddenOk = putForbiddenRes.status === 403;
    report("PERMINTAAN_PUT_RBAC_DENY_OK", putForbiddenOk, putForbiddenOk ? "" : `(status=${putForbiddenRes.status})`);

    // PUT with admin token -> 200, partial-merge confirmed (kota untouched)
    const putRes = await fetch(`${baseUrl}/permintaan/${encodeURIComponent(createdId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ jumlah_permintaan: 99 }),
    });
    const putBody = await putRes.json();
    const putOk = putRes.status === 200 && putBody.jumlah_permintaan === 99 && putBody.kota === TEST_KOTA;
    report("PERMINTAAN_UPDATE_OK", putOk, putOk ? "" : `(status=${putRes.status}, body=${JSON.stringify(putBody)})`);

    // (6) DELETE the created row with admin token -> 200 (self-clean)
    const deleteRes = await fetch(`${baseUrl}/permintaan/${encodeURIComponent(createdId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const deleteBody = await deleteRes.json();
    const deleteOk = deleteRes.status === 200 && deleteBody.id === createdId;
    report("PERMINTAAN_DELETE_OK", deleteOk, deleteOk ? "" : `(status=${deleteRes.status})`);

    // DELETE with logistik token -> 403 (RBAC on a different temp row, self-cleaning)
    const deleteForbiddenSetupRes = await fetch(`${baseUrl}/permintaan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        kota: TEST_KOTA,
        tanggal_permintaan: "2026-06-26",
        jumlah_permintaan: 1,
        keterangan: "__PermintaanRoutesVerifyTemp2__",
      }),
    });
    const deleteForbiddenSetupBody = await deleteForbiddenSetupRes.json();
    const deleteForbiddenRes = await fetch(`${baseUrl}/permintaan/${encodeURIComponent(deleteForbiddenSetupBody.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${logistik.token}` },
    });
    const deleteForbiddenOk = deleteForbiddenRes.status === 403;
    report("PERMINTAAN_DELETE_RBAC_DENY_OK", deleteForbiddenOk, deleteForbiddenOk ? "" : `(status=${deleteForbiddenRes.status})`);
    // Self-clean the second temp row with the admin token.
    await fetch(`${baseUrl}/permintaan/${encodeURIComponent(deleteForbiddenSetupBody.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${admin.token}` },
    });

    report(
      "PERMINTAAN_ROUTES_OK",
      listOk &&
        forbiddenOk &&
        badBodyOk &&
        createOk &&
        dupOk &&
        putForbiddenOk &&
        putOk &&
        deleteOk &&
        deleteForbiddenOk
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  process.exitCode = exitCode;
}

main();
