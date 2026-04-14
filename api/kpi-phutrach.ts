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
    // =========================
    // 1. TÍNH a, b, c (TOÀN PHÒNG)
    // =========================
    const nhapLieuData = await readSheet('NHAP_LIEU');

    let a = 0, b = 0, c = 0;

    if (nhapLieuData && nhapLieuData.length > 1) {
      const headers = nhapLieuData[0];

      const thangIdx = headers.findIndex(h => h.toLowerCase() === 'thang');
      const soGiaoIdx = headers.findIndex(h => h.toLowerCase() === 'sogiao');
      const soHTIdx = headers.findIndex(h => h.toLowerCase() === 'sohoanthanh');
      const soLoiIdx = headers.findIndex(h => h.toLowerCase() === 'soloichatluong');
      const soChamIdx = headers.findIndex(h => h.toLowerCase() === 'socham');

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
      if (count > 0) {
        b = 100 - (totalLoi * 25 / count);
        if (b < 0) b = 0;
      }

      // c
      if (count > 0) {
        c = 100 - (totalCham * 25 / count);
        if (c < 0) c = 0;
      }
    }

    // =========================
    // 2. LẤY d, đ, e
    // =========================
    const diemPtData = await readSheet('NHAP_DIEM_PHU_TRACH');

    let d = 0, dd = 0, e = 0;

    if (diemPtData && diemPtData.length > 1) {
      const headers = diemPtData[0];

      const thangIdx = headers.findIndex(h => h.toLowerCase() === 'thang');
      const dIdx = headers.findIndex(h => h.toLowerCase().includes('d'));
      const ddIdx = headers.findIndex(h => h.toLowerCase().includes('dd') || h.toLowerCase().includes('đ'));
      const eIdx = headers.findIndex(h => h.toLowerCase().includes('e'));

      const rows = diemPtData.slice(1);

      const found = rows.find(r => String(r[thangIdx]) === String(thang));

      if (found) {
        d = parseFloat(found[dIdx]) || 0;
        dd = parseFloat(found[ddIdx]) || 0;
        e = parseFloat(found[eIdx]) || 0;
      }
    }

    // =========================
    // 3. KPI PHỤ TRÁCH
    // =========================
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
