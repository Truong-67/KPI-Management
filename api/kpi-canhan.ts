import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  // YYYY-MM → MM/YYYY (đồng bộ toàn hệ thống)
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    if (!data || data.length <= 1) {
      return res.status(200).json({ a: 0, b: 0, c: 0, kpi: 0 });
    }

    const headers = data[0];
    const rows = data.slice(1);

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iMaNV = idx('MaNhiemVu');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // 👉 đọc hệ số
    const qdv = await readSheet('QDV');
    if (!qdv || qdv.length <= 1) {
      return res.status(200).json({ a: 0, b: 0, c: 0, kpi: 0 });
    }
    const qHeaders = qdv[0];
    const iMaNV_Q = qHeaders.findIndex(h => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex(h => h.toLowerCase().includes('quydoi'));

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[r[iMaNV_Q]] = parseFloat(r[iHS_Q]) || 0;
    });

    let tongGiaoQD = 0;
    let tongHTQD = 0;
    let tongCLQD = 0;
    let tongTDQD = 0;

    rows.forEach(r => {
      if (
        String(r[iThang]).trim() !== String(thang).trim() ||
        String(r[iMaNS]).trim() !== String(maNhanSu).trim()
      ) return;

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

    return res.status(200).json({ a, b, c, kpi });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
