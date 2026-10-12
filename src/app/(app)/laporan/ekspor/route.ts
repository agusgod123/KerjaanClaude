import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { tanggalJam, tanggalWita } from "@/domain/format";
import { STATUS } from "@/domain/status";
import { totalEstimasi, totalRealisasi } from "@/domain/rules";
import { getDb } from "@/server/db";
import { buildViewer } from "@/server/org";
import { canReport, filterPrs, firstSubmit, type ReportFilter } from "@/server/report";
import { userName } from "@/server/views";

/** Ekspor .xlsx: satu baris per item, supaya bisa dijumlah ulang di Excel. */
export async function GET(request: Request) {
  const id = (await cookies()).get("pp_uid")?.value;
  const db = getDb();
  const viewer = id ? buildViewer(db, id, new Date()) : null;
  if (!viewer || !canReport(viewer)) return new Response("Tidak diizinkan", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams) as ReportFilter;
  const prs = filterPrs(db, params);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Pengadaan";
  const ws = wb.addWorksheet("PR");
  ws.columns = [
    { header: "Nomor PR", key: "nomor", width: 22 },
    { header: "Diajukan (WITA)", key: "diajukan", width: 20 },
    { header: "Unit", key: "unit", width: 30 },
    { header: "Pemohon", key: "pemohon", width: 24 },
    { header: "Status", key: "status", width: 26 },
    { header: "Pos RKA", key: "pos", width: 14 },
    { header: "Item", key: "item", width: 40 },
    { header: "Jenis", key: "jenis", width: 8 },
    { header: "Jumlah", key: "jumlah", width: 9 },
    { header: "Satuan", key: "satuan", width: 10 },
    { header: "Harga satuan", key: "harga", width: 15 },
    { header: "Subtotal estimasi", key: "subtotal", width: 17 },
    { header: "Harga beli", key: "beli", width: 15 },
    { header: "Total PR estimasi", key: "totalEst", width: 17 },
    { header: "Total PR beli", key: "totalBeli", width: 15 },
    { header: "Disetujui (WITA)", key: "disetujui", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const pr of prs) {
    const line = db.budgetLines.find((l) => l.id === pr.budgetLineId);
    for (const it of pr.items) {
      ws.addRow({
        nomor: pr.number,
        diajukan: tanggalJam(firstSubmit(pr)),
        unit: db.units.find((u) => u.id === pr.unitId)?.name,
        pemohon: userName(db, pr.requesterId),
        status: STATUS[pr.status].label,
        pos: pr.specialBudget ? "Khusus" : line?.code ?? "",
        item: it.description,
        jenis: it.kind === "jasa" ? "Jasa" : "Barang",
        jumlah: it.qty,
        satuan: it.unit,
        harga: it.unitPrice,
        subtotal: Math.round(it.qty * it.unitPrice),
        beli: it.realizedUnitPrice ?? null,
        totalEst: totalEstimasi(pr.items),
        totalBeli: pr.purchase?.recordedAt ? totalRealisasi(pr.items) : null,
        disetujui: pr.approvedAt ? tanggalJam(pr.approvedAt) : "",
      });
    }
  }
  for (const key of ["harga", "subtotal", "beli", "totalEst", "totalBeli"]) ws.getColumn(key).numFmt = '"Rp"#,##0';

  const buffer = await wb.xlsx.writeBuffer();
  const name = `pr-${tanggalWita(new Date().toISOString())}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
