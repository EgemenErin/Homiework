"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";

export function PrintZineButton() {
  function handlePrint() {
    triggerHaptic("light");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 print:hidden"
    >
      <Printer aria-hidden className="size-4" />
      <span>Print / Save as PDF</span>
    </Button>
  );
}
