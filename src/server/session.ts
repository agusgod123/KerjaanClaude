import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./db";
import { buildViewer, type Viewer } from "./org";

/**
 * Sesi prototipe: cookie berisi id pengguna. Cukup untuk uji coba alur,
 * BUKAN untuk produksi. Fase Fondasi menggantinya dengan Better Auth
 * (sesi di database, sandi di-hash, batas percobaan login).
 */
const COOKIE = "pp_uid";

export const getViewer = cache(async (): Promise<Viewer> => {
  // Data PR berubah tiap saat dan bergantung pada jam (lama menunggu, tenggat):
  // selalu dirender saat diminta, tidak ikut prefetch.
  await connection();
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) redirect("/masuk");
  const viewer = buildViewer(getDb(), id, new Date());
  if (!viewer) redirect("/masuk");
  return viewer;
});

export async function hasSession(): Promise<boolean> {
  await connection();
  const id = (await cookies()).get(COOKIE)?.value;
  return Boolean(id && buildViewer(getDb(), id, new Date()));
}

export async function startSession(userId: string) {
  (await cookies()).set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
