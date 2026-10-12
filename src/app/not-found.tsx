import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Mark } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <Mark className="mx-auto size-10" />
        <h1 className="mt-5 text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-2">PR ini mungkin sudah dihapus, atau Anda tidak punya akses untuk membukanya.</p>
        <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
