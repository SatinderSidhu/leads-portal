import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2870a8 0%, #01358d 50%, #101b63 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "bold",
              color: "#01358d",
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "white" }}>
              App Factory
            </span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
              by KITLabs
            </span>
          </div>
        </div>

        {/* Main text */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: "bold",
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "800px",
            marginBottom: "24px",
          }}
        >
          Turn Your App Idea Into Reality
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "rgba(255,255,255,0.8)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
          }}
        >
          Describe your concept • AI designs screens • Submit for building
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
          }}
        >
          {[
            { icon: "💡", label: "Ideate" },
            { icon: "🎨", label: "Design" },
            { icon: "🔨", label: "Build" },
            { icon: "🚀", label: "Launch" },
          ].map((step) => (
            <div
              key={step.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                }}
              >
                {step.icon}
              </div>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
