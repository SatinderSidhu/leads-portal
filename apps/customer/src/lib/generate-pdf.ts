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

  // Create container — html2pdf will move this into its own visible overlay for capture
  const container = document.createElement("div");
  container.style.fontFamily = "'Segoe UI', Arial, Helvetica, sans-serif";
  container.style.fontSize = "14px";
  container.style.lineHeight = "1.7";
  container.style.color = "#1a1a1a";
  container.innerHTML = htmlContent;

  // Constrain logo/images to reasonable size for PDF
  container.querySelectorAll("img").forEach((img) => {
    img.style.maxWidth = "250px";
    img.style.height = "auto";
  });

  // Wait for images to load
  document.body.appendChild(container);
  const images = container.querySelectorAll("img");
  if (images.length > 0) {
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 5000);
          })
      )
    );
  }
  document.body.removeChild(container);

  const fileName = `SOW-v${version}-${projectName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;

  await html2pdf()
    .set({
      margin: [15, 15, 15, 15],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .save();
}
