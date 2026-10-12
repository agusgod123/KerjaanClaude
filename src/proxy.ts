import { NextResponse, type NextRequest } from "next/server";

/**
 * Pemeriksaan cepat: tanpa cookie sesi, langsung ke halaman masuk sebelum
 * halaman dirender. Hak akses yang sebenarnya tetap dicek di server.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("pp_uid")) {
    const url = new URL("/masuk", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Halaman publik: masuk, verifikasi QR, aset.
  matcher: ["/((?!masuk|v/|_next/|icon.svg|favicon.ico).*)"],
};
