import jsPDF from "jspdf";

export interface PdfBranding {
  companyName: string;
  logoPath: string | null;
  website: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  footerText: string | null;
  copyrightText: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function addFooter(doc: jsPDF, branding?: PdfBranding) {
  if (!branding) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Divider line
  if (branding.accentColor) {
    const [r, g, b] = hexToRgb(branding.accentColor);
    doc.setDrawColor(r, g, b);
  } else {
    doc.setDrawColor(200);
  }
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

  doc.setFontSize(8);
  doc.setTextColor(130);

  if (branding.footerText) {
    doc.text(branding.footerText, pageWidth / 2, pageHeight - 13, { align: "center" });
  }
  if (branding.copyrightText) {
    doc.text(branding.copyrightText, pageWidth / 2, pageHeight - 9, { align: "center" });
  }

  // Reset text color
  doc.setTextColor(0);
}

function addBrandedHeader(doc: jsPDF, title: string, subtitle: string, branding?: PdfBranding) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  if (branding?.companyName) {
    // Company name
    if (branding.primaryColor) {
      const [r, g, b] = hexToRgb(branding.primaryColor);
      doc.setTextColor(r, g, b);
    }
    doc.setFontSize(10);
    doc.text(branding.companyName, pageWidth - margin, y, { align: "right" });
    if (branding.website) {
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(branding.website, pageWidth - margin, y, { align: "right" });
    }
    doc.setTextColor(0);
    y = margin;
  }

  // Title
  if (branding?.primaryColor) {
    const [r, g, b] = hexToRgb(branding.primaryColor);
    doc.setTextColor(r, g, b);
  }
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 12;

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(subtitle, margin, y);
  y += 10;

  // Divider
  if (branding?.accentColor) {
    const [r, g, b] = hexToRgb(branding.accentColor);
    doc.setDrawColor(r, g, b);
  } else {
    doc.setDrawColor(200);
  }
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setDrawColor(0);
  return y;
}

export function downloadNdaPdf(content: string, projectName: string, branding?: PdfBranding) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  const bottomMargin = branding ? 25 : 20;

  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content, maxWidth);

  let y = margin;

  for (const line of lines) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      if (branding) addFooter(doc, branding);
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  if (branding) addFooter(doc, branding);
  doc.save(`NDA-${projectName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}

export async function downloadSowPdf(htmlContent: string, projectName: string, version: number, _branding?: PdfBranding) {
  const html2pdf = (await import("html2pdf.js")).default;

  const container = document.createElement("div");
  container.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a1a; max-width: 700px; margin: 0 auto;">
      <style>
        h1 { font-size: 24px; font-weight: 700; margin: 24px 0 12px; color: #01358d; }
        h2 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: #01358d; }
        h3 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; color: #01358d; }
        p { margin: 8px 0; }
        ul, ol { margin: 8px 0; padding-left: 24px; }
        li { margin: 4px 0; }
        strong, b { font-weight: 700; }
        em, i { font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 700; }
        hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
        img { max-width: 100%; height: auto; }
      </style>
      ${htmlContent}
    </div>
  `;
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.opacity = "0";
  container.style.zIndex = "-1";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  // Wait for images to load
  const images = container.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const fileName = `SOW-v${version}-${projectName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: fileName,
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}
