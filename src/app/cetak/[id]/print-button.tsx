"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="primary" icon={<Printer />} onClick={() => window.print()}>
      Cetak atau simpan PDF
    </Button>
  );
}
