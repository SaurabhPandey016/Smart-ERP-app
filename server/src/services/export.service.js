import ExcelJS from 'exceljs';

const applyHeaderStyle = (row, color) => {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
};

export const exportService = {
  async exportLedgers(ledgers, res) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ledgers');
    ws.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Opening Balance', key: 'openingBalance', width: 20 },
      { header: 'Current Balance', key: 'balance', width: 20 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'GST Number', key: 'gstNumber', width: 20 },
    ];
    applyHeaderStyle(ws.getRow(1), 'FF0f172a');
    ledgers.forEach((l) => ws.addRow(l));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ledgers.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  },

  async exportVouchers(vouchers, type, res) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`${type} Vouchers`);
    ws.columns = [
      { header: 'Voucher No', key: 'number', width: 18 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Party', key: 'party', width: 30 },
      { header: 'Sub Total', key: 'totalAmount', width: 18 },
      { header: 'GST', key: 'taxAmount', width: 15 },
      { header: 'Net Amount', key: 'netAmount', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    applyHeaderStyle(ws.getRow(1), 'FF6366f1');
    vouchers.forEach((v) => ws.addRow({
      number: v.number,
      date: new Date(v.date).toLocaleDateString('en-IN'),
      party: v.partyLedger?.name || '-',
      totalAmount: Number(v.totalAmount),
      taxAmount: Number(v.taxAmount),
      netAmount: Number(v.netAmount),
      status: v.status,
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}-vouchers.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  },

  async exportStockSummary(items, res) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Stock Summary');
    ws.columns = [
      { header: 'Item Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 18 },
      { header: 'Selling Price', key: 'sellingPrice', width: 18 },
      { header: 'Current Stock', key: 'currentStock', width: 18 },
      { header: 'Damaged', key: 'damagedStock', width: 15 },
      { header: 'GST %', key: 'gstPercent', width: 10 },
    ];
    applyHeaderStyle(ws.getRow(1), 'FF059669');
    items.forEach((i) => ws.addRow({
      name: i.name,
      sku: i.sku || '-',
      unit: i.unit?.symbol || '-',
      purchasePrice: Number(i.purchasePrice),
      sellingPrice: Number(i.sellingPrice),
      currentStock: Number(i.currentStock),
      damagedStock: Number(i.damagedStock),
      gstPercent: Number(i.gstPercent),
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-summary.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  },
};
