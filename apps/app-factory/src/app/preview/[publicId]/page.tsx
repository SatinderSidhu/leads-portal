"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PrototypePreview from "@/components/PrototypePreview";

const DEFAULT_THEME = { id: "default", name: "KITLabs Blue", primary: "#01358d", accent: "#f9556d", nav: "#01358d", button: "#01358d", bg: "#ffffff" };

export default function PublicPreviewPage() {
  const { publicId } = useParams() as { publicId: string };
  const [screens, setScreens] = useState<[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${publicId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Project not found");
        return r.json();
      })
      .then((project) => {
        if (project.flows?.length > 0 && Array.isArray(project.flows[0].screens)) {
          setScreens(project.flows[0].screens);
        } else {
          setError("No screens to preview yet");
        }
      })
      .catch(() => setError("Project not found"))
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading prototype...</p>
      </div>
    );
  }

  if (error || screens.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">{error || "No screens to preview"}</p>
        <a href={`/project/${publicId}`} className="text-sm text-[#01358d] font-medium hover:underline">
          Go to project →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center py-8">
      <PrototypePreview
        screens={screens}
        theme={DEFAULT_THEME}
        fullScreen
      />
    </div>
  );
}
