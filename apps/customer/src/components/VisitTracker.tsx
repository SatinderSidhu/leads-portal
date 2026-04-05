"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function VisitTracker({ leadId, page }: { leadId: string; page?: string }) {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview");

  useEffect(() => {
    // Skip tracking in admin preview mode
    if (preview) return;

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, page }),
    }).catch(() => {});
  }, [leadId, page, preview]);

  return null;
}
