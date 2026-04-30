import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  if (!thang || !maNhanSu) {
    return res.status(400).json({ error: 'Missing thang or maNhanSu' });
  }

  // =========================
  // FORMAT THÁNG
  // =========================
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // =====================================================
    // 1. LOAD QDV (HỆ SỐ)
    // =====================================================
    const qdvData = await readSheet('QDV');
    const heSoMap: Record<string, number> = {};

    if (qdvData && qdvData.length > 1) {
      const headers = qdvData[0].map((h: string) => h.toLowerCase());

      const maIdx = headers.findIndex(h => h.includes('manhiemvu'));
      const hsIdx = headers.findIndex(h => h.includes('quydoi'));

      qdvData.slice(1).forEach((r: any[]) => {
        const ma = r[maIdx];
        const hs = parseFloat(r[hsIdx]) || 0;
        heSoMap[ma] = hs;
      });
    }

    // =====================================================
    // 2. TÍNH a, b, c (THEO CÁ NHÂN)
    // =====================================================
    const nhapLieuData = await readSheet('NHAP_LIEU');

    let a = 0, b = 0, c = 0;

    if (nhapLieuData && nhapLieuData.length > 1) {
      const headers = nhapLieuData[0].map((h: string) => h.toLowerCase());

      const thangIdx = headers.indexOf('thang');
      const maNSIdx = headers.indexOf('manhansu');
      const maNvIdx = headers.indexOf('manhiemvu');
      const soGiaoIdx = headers.indexOf('sogiao');
      const soHTIdx = headers.indexOf('sohoanthanh');
      const soLoiIdx = headers.indexOf('soloichatluong');
      const soChamIdx = headers.indexOf('socham');

      const rows = nhapLieuData.slice(1);

      let sumGiaoQD = 0;
      let sumHTQD = 0;
      let sumCLQD = 0;
      let sumTDQD = 0;

      rows.forEach((r: any[]) => {
        if (!r || r.length === 0) return;

        if (String(r[thangIdx]).trim() !== String(thang).trim()) return;
        if (String(r[maNSIdx]).trim() !== String(maNhanSu).trim()) return;

        const maNV = r[maNvIdx];
        const heSo = heSoMap[maNV] || 0;

        const giao = parseFloat(r[soGiaoIdx]) || 0;
        const ht = parseFloat(r[soHTIdx]) || 0;
        const loi = parseFloat(r[soLoiIdx]) || 0;
        const cham = parseFloat(r[soChamIdx]) || 0;

        if (giao <= 0) return;

        const giaoQD = giao * heSo;
        const htQD = ht * heSo;

        let clQD = htQD - (loi * heSo * 0.25);
        if (clQD < 0) clQD = 0;

        let tdQD = htQD - (cham * heSo * 0.25);
        if (tdQD < 0) tdQD = 0;

        sumGiaoQD += giaoQD;
        sumHTQD += htQD;
        sumCLQD += clQD;
        sumTDQD += tdQD;
      });

      if (sumGiaoQD > 0) {
        a = (sumHTQD / sumGiaoQD) * 100;
        b = (sumCLQD / sumGiaoQD) * 100;
        c = (sumTDQD / sumGiaoQD) * 100;
      }
    }

    // =====================================================
    // 3. LẤY d, đ, e THEO NGƯỜI
    // =====================================================
    const diemData = await readSheet('NHAP_DIEM_PHU_TRACH');

    let d = 0, dd = 0, e = 0;

    if (diemData && diemData.length > 1) {
      const headers = diemData[0].map((h: string) => h.toLowerCase());

      const thangIdx = headers.indexOf('thang');
      const maNSIdx = headers.indexOf('manhansu');
      const dIdx = headers.findIndex(h => h === 'd');
      const ddIdx = headers.findIndex(h => h === 'đ' || h === 'dd');
      const eIdx = headers.findIndex(h => h === 'e');

      const rows = diemData.slice(1);

      const found = rows.find(r =>
        String(r[thangIdx]).trim() === String(thang).trim() &&
        String(r[maNSIdx]).trim() === String(maNhanSu).trim()
      );

      if (found) {
        if (dIdx !== -1) d = parseFloat(found[dIdx]) || 0;
        if (ddIdx !== -1) dd = parseFloat(found[ddIdx]) || 0;
        if (eIdx !== -1) e = parseFloat(found[eIdx]) || 0;
      }
    }

    // =====================================================
    // 4. KPI THEO CHỨC VỤ
    // =====================================================
    const nhanSu = await readSheet('DM_NHAN_SU');

    let isLanhDao = false;

    if (nhanSu && nhanSu.length > 1) {
      const headers = nhanSu[0].map((h: string) => h.toLowerCase());
      const maIdx = headers.indexOf('manhansu');
      const cvIdx = headers.indexOf('chucvu');

      const found = nhanSu.slice(1).find(r =>
        String(r[maIdx]).trim() === String(maNhanSu).trim()
      );

      if (found) {
        const cv = String(found[cvIdx]).toLowerCase();
        isLanhDao = cv.includes('trưởng') || cv.includes('phó');
      }
    }

    let kpi = 0;

    if (isLanhDao) {
      // lãnh đạo
      kpi = ((a + b + c + d + dd + e) / 6) * 70 / 100;
    } else {
      // cán bộ
      kpi = ((a + b + c) / 3) * 70 / 100;
    }

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
    console.error('ERROR KPI:', error);
    return res.status(500).json({ error: error.message });
  }
}
