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

  try {
    const admin = await login(baseUrl, "admin", "admin123");
    const logistik = await login(baseUrl, "logistik", "logistik123");

    report(
      "LOGIN_SETUP_OK",
      admin.status === 200 && Boolean(admin.token) && logistik.status === 200 && Boolean(logistik.token),
      `(admin status=${admin.status}, logistik status=${logistik.status})`
    );

    // 401: no Authorization header
    const noAuthRes = await fetch(`${baseUrl}/protected/me`);
    const noAuthOk = noAuthRes.status === 401;

    // 401: malformed token
    const malformedRes = await fetch(`${baseUrl}/protected/me`, {
      headers: { Authorization: "Bearer not.a.jwt" },
    });
    const malformedOk = malformedRes.status === 401;

    report(
      "AUTH_REQUIRED_OK",
      noAuthOk && malformedOk,
      noAuthOk && malformedOk ? "" : `(noAuth=${noAuthRes.status}, malformed=${malformedRes.status})`
    );

    // 200: valid token, any role, GET /protected/me
    const meRes = await fetch(`${baseUrl}/protected/me`, {
      headers: { Authorization: `Bearer ${logistik.token}` },
    });
    const meOk = meRes.status === 200;

    // 403: valid token, wrong role for admin-only
    const denyRes = await fetch(`${baseUrl}/protected/admin-only`, {
      method: "POST",
      headers: { Authorization: `Bearer ${logistik.token}` },
    });
    const denyOk = denyRes.status === 403;
    report("RBAC_DENY_OK", denyOk, denyOk ? "" : `(status=${denyRes.status})`);

    // 200: valid token, right role for admin-only
    const allowRes = await fetch(`${baseUrl}/protected/admin-only`, {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const allowOk = allowRes.status === 200;
    report("RBAC_ALLOW_OK", meOk && allowOk, meOk && allowOk ? "" : `(me=${meRes.status}, allow=${allowRes.status})`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  process.exitCode = exitCode;
}

main();
