import { BarChart3, Bell, FileText, Home, Inbox, Settings2, ShoppingBag, Wallet, type LucideIcon } from "lucide-react";

export type NavKey = "beranda" | "menunggu" | "pr" | "pembelian" | "anggaran" | "laporan" | "notifikasi" | "pengaturan";

export interface NavEntry {
  key: NavKey;
  count?: number;
  /** Hitungan yang menuntut tindakan diberi warna merah; yang informatif tidak. */
  urgent?: boolean;
}

export const NAV: Record<NavKey, { href: string; label: string; icon: LucideIcon }> = {
  beranda: { href: "/", label: "Beranda", icon: Home },
  menunggu: { href: "/menunggu", label: "Menunggu saya", icon: Inbox },
  pr: { href: "/pr", label: "PR saya", icon: FileText },
  pembelian: { href: "/pembelian", label: "Pembelian", icon: ShoppingBag },
  anggaran: { href: "/anggaran", label: "Anggaran", icon: Wallet },
  laporan: { href: "/laporan", label: "Laporan", icon: BarChart3 },
  notifikasi: { href: "/notifikasi", label: "Notifikasi", icon: Bell },
  pengaturan: { href: "/pengaturan", label: "Data induk", icon: Settings2 },
};

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  // Detail PR (/pr/…) dibuka dari banyak tempat; jangan tandai "PR saya".
  if (href === "/pr") return pathname === "/pr";
  return pathname === href || pathname.startsWith(`${href}/`);
}
