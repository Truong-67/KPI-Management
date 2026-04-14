import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, data: updates } = req.body;

  // MM/YYYY → YYYY-MM
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    const headers = data[0];

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iKey = idx('KeyNhap');
    const iMaNV = idx('MaNhiemVu');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // 👉 đọc hệ số
    const qdv = await readSheet('QDV');
    const qHeaders = qdv[0];
    const iMaNV_Q = qHeaders.findIndex(h => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex(h => h.toLowerCase().includes('quydoi'));

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[r[iMaNV_Q]] = parseFloat(r[iHS_Q]) || 0;
    });

    // ===== UPDATE DỮ LIỆU =====
    for (const u of updates) {
      const rowIndex = data.findIndex((r: any, i: number) =>
        i > 0 && r[iKey] === u.KeyNhap
      );
      if (rowIndex === -1) continue;

      const row = [...data[rowIndex]];

      if (u.SoGiao !== undefined) row[iGiao] = Number(u.SoGiao);
      if (u.SoHoanThanh !== undefined) row[iHT] = Number(u.SoHoanThanh);
      if (u.SoLoiChatLuong !== undefined) row[iLoi] = Number(u.SoLoiChatLuong);
      if (u.SoCham !== undefined) row[iCham] = Number(u.SoCham);

      const rowNumber = rowIndex + 1;
      const range = `A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;

      await updateSheet('NHAP_LIEU', range, [row]);
      data[rowIndex] = row;
    }

    // ===== TÍNH KPI QUY ĐỔI =====
    const rows = data.slice(1);

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');

    let tongGiaoQD = 0;
    let tongHTQD = 0;
    let tongCLQD = 0;
    let tongTDQD = 0;

    rows.forEach(r => {
      if (r[iThang] !== thang || r[iMaNS] !== maNhanSu) return;

      const soGiao = Number(r[iGiao]) || 0;
      const soHT = Number(r[iHT]) || 0;
      const soLoi = Number(r[iLoi]) || 0;
      const soCham = Number(r[iCham]) || 0;

      const heSo = heSoMap[r[iMaNV]] || 0;

      const giaoQD = soGiao * heSo;
      const htQD = soHT * heSo;

      let clQD = htQD - soLoi * heSo * 0.25;
      if (clQD < 0) clQD = 0;

      let tdQD = htQD - soCham * heSo * 0.25;
      if (tdQD < 0) tdQD = 0;

      tongGiaoQD += giaoQD;
      tongHTQD += htQD;
      tongCLQD += clQD;
      tongTDQD += tdQD;
    });

    const a = tongGiaoQD === 0 ? 0 : (tongHTQD / tongGiaoQD) * 100;
    const b = tongGiaoQD === 0 ? 0 : (tongCLQD / tongGiaoQD) * 100;
    const c = tongGiaoQD === 0 ? 0 : (tongTDQD / tongGiaoQD) * 100;

    const kpi = ((a + b + c) / 3) * 70 / 100;

    return res.status(200).json({
      success: true,
      a,
      b,
      c,
      kpi
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
