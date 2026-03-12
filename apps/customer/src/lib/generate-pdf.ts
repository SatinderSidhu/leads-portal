import jsPDF from "jspdf";

export function downloadNdaPdf(content: string, projectName: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  const bottomMargin = 20;

  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content, maxWidth);

  let y = margin;

  for (const line of lines) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(`NDA-${projectName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}

export function downloadSowPdf(htmlContent: string, projectName: string, version: number) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  const bottomMargin = 20;

  // Strip HTML tags and decode entities for plain text PDF
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;
  const plainText = tempDiv.textContent || tempDiv.innerText || "";

  doc.setFontSize(11);
  const lines = doc.splitTextToSize(plainText, maxWidth);

  let y = margin;

  // Title
  doc.setFontSize(16);
  doc.text(`Scope of Work — v${version}`, margin, y);
  y += 12;
  doc.setFontSize(12);
  doc.text(projectName, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(11);
  for (const line of lines) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(`SOW-v${version}-${projectName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}
