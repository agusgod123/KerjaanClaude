import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { rupiah } from "@/domain/format";
import { PageHeader, Section } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getDb } from "@/server/db";
import { holdersOf, positionOf, positionsOf } from "@/server/org";
import { getViewer } from "@/server/session";

export const metadata: Metadata = { title: "Data induk" };

export default function PengaturanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Pengaturan />
    </Suspense>
  );
}

const th = "py-2.5 pr-4 text-sm font-medium text-ink-3 first:pl-5 last:pr-5";
const td = "py-3 pr-4 align-top first:pl-5 last:pr-5";

async function Pengaturan() {
  const viewer = await getViewer();
  if (!viewer.roles.has("admin")) notFound();
  const db = getDb();
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Data induk"
        description="Pegawai, unit, jabatan, dan pos RKA yang menentukan ke mana PR mengalir. Impor dari Excel HRIS dan pengelolaan akun dibangun di fase Fondasi."
      />
      <Section title="Unit dan atasan langsung" count={db.units.length} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Kode</th>
                <th className={th}>Unit</th>
                <th className={th}>Penanggung tahap Diketahui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {db.units.map((u) => (
                <tr key={u.id}>
                  <td className={`${td} font-semibold tabular`}>{u.code}</td>
                  <td className={td}>{u.name}</td>
                  <td className={td}>
                    {positionOf(db, u.headPositionId).title}
                    <span className="block text-sm text-ink-3">{holdersOf(db, u.headPositionId, now).map((x) => x.name).join(", ") || "Kosong"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Pegawai" count={db.users.length} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Nama</th>
                <th className={th}>NIP / ID pegawai</th>
                <th className={th}>Jabatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {db.users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    {u.name}
                    <span className="block text-sm text-ink-3">{u.email}</span>
                  </td>
                  <td className={`${td} text-ink-2 tabular`}>{u.nip}</td>
                  <td className={td}>{positionsOf(db, u.id, now).map((p) => p.title).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Pos RKA" count={db.budgetLines.length} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Kode</th>
                <th className={th}>Pos</th>
                <th className={`${th} text-right`}>Pagu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {db.budgetLines.map((l) => (
                <tr key={l.id}>
                  <td className={`${td} font-semibold tabular`}>{l.code}</td>
                  <td className={td}>
                    {l.name}
                    <span className="block text-sm text-ink-3">{db.units.find((u) => u.id === l.unitId)?.name} · {l.year}</span>
                  </td>
                  <td className={`${td} text-right tabular`}>{rupiah(l.pagu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
