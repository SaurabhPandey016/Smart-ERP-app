import PDFDocument from 'pdfkit';

export const invoiceService = {
  generatePDF(data, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="INV-${data.voucher.number}.pdf"`);
    doc.pipe(res);

    const W = 515;
    const darkBg = '#0f172a';
    const accent = '#6366f1';
    const textDark = '#1e293b';
    const textGray = '#64748b';
    const white = '#ffffff';

    // ── Header
    doc.rect(40, 40, W, 90).fill(darkBg);
    doc.fillColor(white).fontSize(20).font('Helvetica-Bold').text(data.company.name, 55, 55);
    doc.fontSize(9).font('Helvetica').fillColor('#a5b4fc');
    let cy = 80;
    if (data.company.address) { doc.text(data.company.address, 55, cy); cy += 12; }
    if (data.company.gstNumber) doc.text(`GSTIN: ${data.company.gstNumber}`, 55, cy);

    // ── Invoice badge
    doc.fillColor(accent).fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 350, 55, { width: 155, align: 'right' });
    doc.fillColor(white).fontSize(9).font('Helvetica');
    doc.text(`#${data.voucher.number}`, 350, 76, { width: 155, align: 'right' });
    doc.text(`Date: ${new Date(data.voucher.date).toLocaleDateString('en-IN')}`, 350, 89, { width: 155, align: 'right' });

    // ── Bill To
    let y = 150;
    doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold').text('BILL TO', 40, y);
    y += 12;
    if (data.voucher.partyLedger) {
      doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text(data.voucher.partyLedger.name, 40, y);
      y += 14;
      if (data.voucher.partyLedger.address) {
        doc.font('Helvetica').fontSize(9).fillColor(textGray).text(data.voucher.partyLedger.address, 40, y);
        y += 12;
      }
      if (data.voucher.partyLedger.gstNumber) {
        doc.text(`GSTIN: ${data.voucher.partyLedger.gstNumber}`, 40, y);
        y += 12;
      }
    }

    // ── Table Header
    y = Math.max(y + 20, 215);
    doc.rect(40, y, W, 22).fill(accent);
    doc.fillColor(white).fontSize(8).font('Helvetica-Bold');
    doc.text('#', 48, y + 7, { width: 18 });
    doc.text('Description', 68, y + 7, { width: 195 });
    doc.text('Qty', 265, y + 7, { width: 45, align: 'right' });
    doc.text('Rate', 312, y + 7, { width: 55, align: 'right' });
    doc.text('GST%', 369, y + 7, { width: 38, align: 'right' });
    doc.text('GST Amt', 409, y + 7, { width: 55, align: 'right' });
    doc.text('Total', 466, y + 7, { width: 68, align: 'right' });
    y += 22;

    // ── Table Rows
    data.voucher.items.forEach((item, idx) => {
      doc.rect(40, y, W, 20).fill(idx % 2 === 0 ? '#f8fafc' : white);
      doc.fillColor(textDark).fontSize(8).font('Helvetica');
      doc.text(String(idx + 1), 48, y + 6, { width: 18 });
      doc.text(item.stockItem?.name || item.description || '-', 68, y + 6, { width: 195 });
      doc.text(String(Number(item.quantity)), 265, y + 6, { width: 45, align: 'right' });
      doc.text(`₹${Number(item.rate).toFixed(2)}`, 312, y + 6, { width: 55, align: 'right' });
      doc.text(`${item.gstPercent}%`, 369, y + 6, { width: 38, align: 'right' });
      doc.text(`₹${Number(item.gstAmount).toFixed(2)}`, 409, y + 6, { width: 55, align: 'right' });
      doc.text(`₹${Number(item.totalAmount).toFixed(2)}`, 466, y + 6, { width: 68, align: 'right' });
      y += 20;
    });

    // ── Totals
    y += 12;
    const fmt = (n) => `₹${Number(n).toFixed(2)}`;
    const tx = 370, vx = 470;

    doc.fillColor(textGray).fontSize(9).font('Helvetica').text('Subtotal:', tx, y);
    doc.fillColor(textDark).text(fmt(data.voucher.totalAmount), vx, y, { width: 80, align: 'right' }); y += 16;
    doc.fillColor(textGray).text('GST Total:', tx, y);
    doc.fillColor(textDark).text(fmt(data.voucher.taxAmount), vx, y, { width: 80, align: 'right' }); y += 8;
    doc.moveTo(370, y).lineTo(555, y).strokeColor(accent).lineWidth(1.5).stroke(); y += 8;
    doc.fillColor(darkBg).fontSize(12).font('Helvetica-Bold').text('GRAND TOTAL:', tx, y);
    doc.text(fmt(data.voucher.netAmount), vx, y, { width: 80, align: 'right' }); y += 28;

    // ── Footer
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke(); y += 8;
    doc.fillColor(textGray).fontSize(8).font('Helvetica').text('Thank you for your business!', 40, y, { align: 'center', width: W });

    doc.end();
  },
};
