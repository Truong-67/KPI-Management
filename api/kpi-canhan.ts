import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  // Convert "MM/YYYY" → "YYYY-MM"
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');

    if (!data || data.length <= 1) {
      return res.status(200).json({ a: 0, b: 0, c: 0, kpi: 0 });
    }

    const headers = data[0];

    const rows = data.slice(1).filter(
      (row: any[]) =>
        row.length > 0 && row.some((cell: any) => cell !== '')
    );

    // =========================
    // MAP HỆ SỐ TỪ QDV
    // =========================
    const qdvData = await readSheet('QDV');
    const heSoMap: Record<string, number> = {};

    if (qdvData && qdvData.length > 1) {
      const qdvHeaders = qdvData[0];

      const maNvIdx = qdvHeaders.findIndex(
        (h: string) =>
          h.toLowerCase() === 'manhiemvu' ||
          h.toLowerCase() === 'ma_nhiem_vu'
      );

      const quyDoiIdx = qdvHeaders.findIndex(
        (h: string) =>
          h.toLowerCase() === 'quydoidexuat' ||
          h.toLowerCase() === 'quy_doi_de_xuat'
      );

      if (maNvIdx !== -1 && quyDoiIdx !== -1) {
        qdvData.slice(1).forEach((r: any[]) => {
          heSoMap[r[maNvIdx]] = parseFloat(r[quyDoiIdx]) || 0;
        });
      }
    }

    // =========================
    // LỌC DỮ LIỆU THEO NGƯỜI + THÁNG
    // =========================
    const thangIdx = headers.findIndex((h: string) => h.toLowerCase() === 'thang');
    const maNsIdx = headers.findIndex(
      (h: string) =>
        h.toLowerCase() === 'manhansu' ||
        h.toLowerCase() === 'ma_nhan_su'
    );

    const allRowsForUser = rows.filter(
      (r: any[]) => r[thangIdx] === thang && r[maNsIdx] === maNhanSu
    );

    if (allRowsForUser.length === 0) {
      return res.status(200).json({ a: 0, b: 0, c: 0, kpi: 0 });
    }

    // =========================
    // TÍNH KPI CHUẨN (GIỐNG GAS)
    // =========================
    let totalGiao = 0;
    let totalHT = 0;
    let totalGiaTriB = 0;
    let totalGiaTriC = 0;

    const getVal = (row: any[], colName: string) => {
      const idx = headers.findIndex(
        (h: string) => h.toLowerCase() === colName.toLowerCase()
      );
      return idx !== -1 ? parseFloat(row[idx]) || 0 : 0;
    };

    const getStr = (row: any[], colName: string) => {
      const idx = headers.findIndex(
        (h: string) => h.toLowerCase() === colName.toLowerCase()
      );
      return idx !== -1 ? row[idx] : '';
    };

    allRowsForUser.forEach((r: any[]) => {
      const maNhiemVu = getStr(r, 'MaNhiemVu');
      const heSo = heSoMap[maNhiemVu] || 0;

      const soGiao = getVal(r, 'SoGiao');
      const soHT = getVal(r, 'SoHoanThanh');
      const soLoi = getVal(r, 'SoLoiChatLuong');
      const soCham = getVal(r, 'SoCham');

      totalGiao += soGiao;
      totalHT += soHT;

      // b (chất lượng)
      let giaTriB = soHT - soLoi * heSo * 0.25;
      if (giaTriB < 0) giaTriB = 0;
      totalGiaTriB += giaTriB;

      // c (tiến độ)
      let giaTriC = soHT - soCham * heSo * 0.25;
      if (giaTriC < 0) giaTriC = 0;
      totalGiaTriC += giaTriC;
    });

    // =========================
    // CÔNG THỨC CHUẨN GAS
    // =========================
    const a = totalGiao === 0 ? 0 : (totalHT / totalGiao) * 100;
    const b = totalGiao === 0 ? 0 : (totalGiaTriB / totalGiao) * 100;
    const c = totalGiao === 0 ? 0 : (totalGiaTriC / totalGiao) * 100;

    const kpi = ((a + b + c) / 3) * 70 / 100;

    return res.status(200).json({
      a,
      b,
      c,
      kpi
    });

  } catch (error: any) {
    console.error('Error reading NHAP_LIEU for KPI:', error);
    return res.status(500).json({ error: error.message });
  }
}
