import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.query;

  // Convert "MM/YYYY" to "YYYY-MM"
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    // 1. Calculate a, b, c from NHAP_LIEU
    const nhapLieuData = await readSheet('NHAP_LIEU');
    let a = 0, b = 0, c = 0;
    
    if (nhapLieuData && nhapLieuData.length > 1) {
      const nlHeaders = nhapLieuData[0];
      const nlRows = nhapLieuData.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
      
      const nlResult = nlRows.map((row: any[]) => {
        const obj: any = {};
        nlHeaders.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      let filteredNl = nlResult;
      if (thang) {
        filteredNl = filteredNl.filter((item: any) => String(item.Thang || item.thang || item.THANG) === String(thang));
      }

      let sumGiao = 0;
      let sumHT = 0;
      let totalLoi = 0;
      let totalCham = 0;
      let count = 0;

      filteredNl.forEach((item: any) => {
        const soGiao = parseFloat(item.SoGiao || item.soGiao || item.SO_GIAO) || 0;
        const soHT = parseFloat(item.SoHoanThanh || item.soHoanThanh || item.SO_HOAN_THANH) || 0;
        const soLoi = parseFloat(item.SoLoiChatLuong || item.soLoiChatLuong || item.SO_LOI_CHAT_LUONG) || 0;
        const soCham = parseFloat(item.SoCham || item.soCham || item.SO_CHAM) || 0;

        sumGiao += soGiao;
        sumHT += soHT;
        totalLoi += soLoi;
        totalCham += soCham;

        if (soGiao > 0) {
          count++;
        }
      });

      // Tính a
      a = sumGiao === 0 ? 0 : (sumHT / sumGiao) * 100;

      // Tính b
      if (count > 0) {
        b = 100 - (totalLoi * 25 / count);
        if (b < 0) b = 0;
      } else {
        b = 0;
      }

      // Tính c
      if (count > 0) {
        c = 100 - (totalCham * 25 / count);
        if (c < 0) c = 0;
      } else {
        c = 0;
      }
    }

    // 2. Get d, dd, e from NHAP_DIEM_PHU_TRACH
    const diemPtData = await readSheet('NHAP_DIEM_PHU_TRACH');
    let d = 0, dd = 0, e = 0;

    if (diemPtData && diemPtData.length > 1) {
      const ptHeaders = diemPtData[0];
      const ptRows = diemPtData.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
      
      const ptResult = ptRows.map((row: any[]) => {
        const obj: any = {};
        ptHeaders.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      let filteredPt = ptResult;
      if (thang) {
        filteredPt = filteredPt.filter((item: any) => String(item.Thang || item.thang || item.THANG) === String(thang));
      }

      if (filteredPt.length > 0) {
        const item = filteredPt[0];
        d = parseFloat(item.DiemD || item.d || item.D) || 0;
        dd = parseFloat(item.DiemDD || item.dd || item.DD || item.DiemĐ || item.đ || item.Đ) || 0;
        e = parseFloat(item.DiemE || item.e || item.E) || 0;
      }
    }

    // 3. Calculate KPI
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
    console.error('Error calculating KPI_PHU_TRACH:', error);
    return res.status(500).json({ error: error.message });
  }
}
