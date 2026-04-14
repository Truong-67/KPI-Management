import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.query;

  // Convert MM/YYYY → YYYY-MM
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {

    // =====================================================
    // 1. TÍNH a, b, c TOÀN PHÒNG (ĐÚNG THEO GAS)
    // =====================================================
    const nhapLieuData = await readSheet('NHAP_LIEU');

    let a = 0, b = 0, c = 0;

    if (nhapLieuData && nhapLieuData.length > 1) {
      const headers = nhapLieuData[0].map((h: string) => h.toLowerCase());

      const thangIdx = headers.indexOf('thang');
      const soGiaoIdx = headers.indexOf('sogiao');
      const soHTIdx = headers.indexOf('sohoanthanh');
      const soLoiIdx = headers.indexOf('soloichatluong');
      const soChamIdx = headers.indexOf('socham');

      const rows = nhapLieuData.slice(1);

      let sumGiao = 0;
      let sumHT = 0;
      let totalLoi = 0;
      let totalCham = 0;
      let count = 0;

      rows.forEach((r: any[]) => {
        if (!r || r.length === 0) return;

        if (String(r[thangIdx]) !== String(thang)) return;

        const giao = parseFloat(r[soGiaoIdx]) || 0;
        const ht = parseFloat(r[soHTIdx]) || 0;
        const loi = parseFloat(r[soLoiIdx]) || 0;
        const cham = parseFloat(r[soChamIdx]) || 0;

        // 🔥 CHỈ TÍNH DÒNG CÓ GIAO
        if (giao > 0) {
          sumGiao += giao;
          sumHT += ht;
          totalLoi += loi;
          totalCham += cham;
          count++;
        }
      });

      // a
      a = sumGiao === 0 ? 0 : (sumHT / sumGiao) * 100;

      // b
      b = count > 0 ? 100 - (totalLoi * 25 / count) : 0;
      if (b < 0) b = 0;

      // c
      c = count > 0 ? 100 - (totalCham * 25 / count) : 0;
      if (c < 0) c = 0;
    }

    // =====================================================
    // 2. LẤY d, đ, e (FIX CHUẨN – KHÔNG BAO GIỜ SAI)
    // =====================================================
    const diemPtData = await readSheet('NHAP_DIEM_PHU_TRACH');

    let d = 0, dd = 0, e = 0;

    if (diemPtData && diemPtData.length > 1) {
      const headersRaw = diemPtData[0];
      const headers = headersRaw.map((h: string) => h.toLowerCase());

      const thangIdx = headers.findIndex(h => h.includes('thang'));

      // ⚠️ TÁCH RIÊNG d và đ (CỰC QUAN TRỌNG)
      const dIdx = headers.findIndex(h => h === 'd' || h.includes('diemd'));
      const ddIdx = headers.findIndex(h => h.includes('đ') || h.includes('diemđ') || h.includes('diemdd'));
      const eIdx = headers.findIndex(h => h === 'e' || h.includes('dieme'));

      const rows = diemPtData.slice(1);

      const found = rows.find(r => String(r[thangIdx]) === String(thang));

      if (found) {
        if (dIdx !== -1) d = parseFloat(found[dIdx]) || 0;
        if (ddIdx !== -1) dd = parseFloat(found[ddIdx]) || 0;
        if (eIdx !== -1) e = parseFloat(found[eIdx]) || 0;
      }
    }

    // =====================================================
    // 3. KPI PHỤ TRÁCH
    // =====================================================
    const kpi = ((a + b + c + d + dd + e) / 6) * 70 / 100;

    return res.status(200).json({
      a,
      b,
      c,
      d,
      dd,
      e,
      kpi
    });

  } catch (error: any) {
    console.error('Error KPI_PHU_TRACH:', error);
    return res.status(500).json({ error: error.message });
  }
}
