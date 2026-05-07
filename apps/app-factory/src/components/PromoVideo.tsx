"use client";

import { useState } from "react";

interface PromoVideoProps {
  src: string;
}

type Orientation = "portrait" | "landscape";

/**
 * Embeds a looping promo video, automatically adapting its frame to the
 * source aspect ratio. Reels (taller-than-wide) render in a centered phone-
 * shaped container; widescreen footage renders in a 16:9 card.
 *
 * Orientation is detected from the video's actual `videoWidth` /
 * `videoHeight` once metadata loads — we don't have to know it ahead of
 * time, and swapping the source URL works without code changes.
 */
export default function PromoVideo({ src }: PromoVideoProps) {
  // Default to "portrait" so the initial render is more conservative on
  // viewport width — if the video turns out to be landscape, we'll widen on
  // metadata load. (Going the other way would briefly show a huge black
  // bar, which is uglier.)
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      setOrientation(v.videoWidth >= v.videoHeight ? "landscape" : "portrait");
    }
  }

  if (orientation === "portrait") {
    // Phone-style frame — centered, narrow, with a soft gradient backdrop
    // to fill the otherwise-empty horizontal space gracefully on desktop.
    return (
      <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-gradient-to-br from-[#01358d]/10 via-[#2870a8]/5 to-transparent">
        <div className="flex justify-center py-8 md:py-12">
          <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-[2rem] overflow-hidden bg-black ring-1 ring-white/10 shadow-xl">
            <video
              src={src}
              autoPlay
              loop
              muted
              playsInline
              controls
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-black aspect-video">
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        controls
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
