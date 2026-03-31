"use client";

import { useEffect } from "react";

export default function VisitTracker({ leadId, page }: { leadId: string; page?: string }) {
  useEffect(() => {
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, page }),
    }).catch(() => {});
  }, [leadId, page]);

  return null;
}
