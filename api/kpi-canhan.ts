import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  // Convert "MM/YYYY" to "YYYY-MM"
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
    const rows = data.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
    
    // Read QDV to get heSo
    const qdvData = await readSheet('QDV');
    const heSoMap: Record<string, number> = {};
    if (qdvData && qdvData.length > 1) {
      const qdvHeaders = qdvData[0];
      const maNvIdx = qdvHeaders.findIndex((h: string) => h.toLowerCase() === 'manhiemvu' || h.toLowerCase() === 'ma_nhiem_vu');
      const quyDoiIdx = qdvHeaders.findIndex((h: string) => h.toLowerCase() === 'quydoidexuat' || h.toLowerCase() === 'quy_doi_de_xuat');
      
      if (maNvIdx !== -1 && quyDoiIdx !== -1) {
        qdvData.slice(1).forEach((r: any[]) => {
          heSoMap[r[maNvIdx]] = parseFloat(r[quyDoiIdx]) || 0;
        });
      }
    }

    const allRowsForUser = rows.filter((r: any[]) => {
      const tIdx = headers.findIndex((h: string) => h.toLowerCase() === 'thang');
      const mIdx = headers.findIndex((h: string) => h.toLowerCase() === 'manhansu' || h.toLowerCase() === 'ma_nhan_su');
      return r[tIdx] === thang && r[mIdx] === maNhanSu;
    });

    let sumA = 0, sumB = 0, sumC = 0;
    let count = 0;
    
    allRowsForUser.forEach((r: any[]) => {
      const getRVal = (colName: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
        return idx !== -1 ? parseFloat(r[idx]) || 0 : 0;
      };
      const getRStr = (colName: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
        return idx !== -1 ? r[idx] : '';
      };

      const rMaNhiemVu = getRStr('MaNhiemVu');
      const rHeSo = heSoMap[rMaNhiemVu] || 0;
      const rSoGiao = getRVal('SoGiao');
      const rSoHoanThanh = getRVal('SoHoanThanh');
      const rSoLoi = getRVal('SoLoiChatLuong');
      const rSoCham = getRVal('SoCham');

      const rA = rSoGiao === 0 ? 0 : (rSoHoanThanh / rSoGiao) * 100;
      
      let rGiaTriB = rSoHoanThanh - (rSoLoi * rHeSo * 0.25);
      if (rGiaTriB < 0) rGiaTriB = 0;
      const rB = rSoGiao === 0 ? 0 : (rGiaTriB / rSoGiao) * 100;

      let rGiaTriC = rSoHoanThanh - (rSoCham * rHeSo * 0.25);
      if (rGiaTriC < 0) rGiaTriC = 0;
      const rC = rSoGiao === 0 ? 0 : (rGiaTriC / rSoGiao) * 100;

      sumA += rA;
      sumB += rB;
      sumC += rC;
      count++;
    });

    const avgA = count > 0 ? sumA / count : 0;
    const avgB = count > 0 ? sumB / count : 0;
    const avgC = count > 0 ? sumC / count : 0;
    const kpi = count > 0 ? ((avgA + avgB + avgC) / 3) * 70 / 100 : 0;

    return res.status(200).json({
      a: avgA,
      b: avgB,
      c: avgC,
      kpi: kpi
    });

  } catch (error: any) {
    console.error('Error reading NHAP_LIEU for KPI:', error);
    return res.status(500).json({ error: error.message });
  }
}
