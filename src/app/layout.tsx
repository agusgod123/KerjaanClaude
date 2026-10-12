import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Pengadaan", template: "%s · Pengadaan" },
  description: "Pengajuan, persetujuan, dan pembelian barang dan jasa.",
  applicationName: "Pengadaan",
};

export const viewport: Viewport = {
  themeColor: "#f4f1eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
