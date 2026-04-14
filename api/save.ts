import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, data: updates } = req.body;

  // Convert MM/YYYY -> YYYY-MM
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
    const iSoGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');
    const iQD = idx('QuyDoi');
    const iA = idx('DiemSoLuong');
    const iB = idx('DiemChatLuong');
    const iC = idx('DiemTienDo');

    // 👉 đọc QDV
    const qdv = await readSheet('QDV');
    const qHeaders = qdv[0];
    const iMaNV_Q = qHeaders.findIndex(h => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex(h => h.toLowerCase().includes('quydoi'));

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[r[iMaNV_Q]] = parseFloat(r[iHS_Q]) || 0;
    });

    // ===== UPDATE =====
    for (const u of updates) {
      const rowIndex = data.findIndex((r: any, i: number) =>
        i > 0 && r[iKey] === u.KeyNhap
      );
      if (rowIndex === -1) continue;

      const row = [...data[rowIndex]];

      if (u.SoGiao !== undefined) row[iSoGiao] = Number(u.SoGiao);
      if (u.SoHoanThanh !== undefined) row[iHT] = Number(u.SoHoanThanh);
      if (u.SoLoiChatLuong !== undefined) row[iLoi] = Number(u.SoLoiChatLuong);
      if (u.SoCham !== undefined) row[iCham] = Number(u.SoCham);

      const heSo = heSoMap[row[iMaNV]] || 0;

      const soGiao = Number(row[iSoGiao]) || 0;
      const ht = Number(row[iHT]) || 0;
      const loi = Number(row[iLoi]) || 0;
      const cham = Number(row[iCham]) || 0;

      // ===== GIỐNG GAS =====
      const quyDoi = ht * heSo;

      const a = soGiao === 0 ? 0 : (ht / soGiao) * 100;

      let b_raw = ht - (loi * heSo * 0.25);
      if (b_raw < 0) b_raw = 0;
      const b = soGiao === 0 ? 0 : (b_raw / soGiao) * 100;

      let c_raw = ht - (cham * heSo * 0.25);
      if (c_raw < 0) c_raw = 0;
      const c = soGiao === 0 ? 0 : (c_raw / soGiao) * 100;

      row[iQD] = quyDoi;
      row[iA] = a;
      row[iB] = b;
      row[iC] = c;

      // update 1 dòng
      const rowNumber = rowIndex + 1;
      const range = `A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;
      await updateSheet('NHAP_LIEU', range, [row]);

      data[rowIndex] = row;
    }

    // ===== KPI CÁ NHÂN (GIỐNG GAS) =====
    const rows = data.slice(1);

    let sumA = 0, sumB = 0, sumC = 0, count = 0;

    rows.forEach(r => {
      if (r[idx('Thang')] === thang && r[idx('MaNhanSu')] === maNhanSu) {
        sumA += Number(r[iA]) || 0;
        sumB += Number(r[iB]) || 0;
        sumC += Number(r[iC]) || 0;
        count++;
      }
    });

    const avgA = count ? sumA / count : 0;
    const avgB = count ? sumB / count : 0;
    const avgC = count ? sumC / count : 0;
    const kpi = count ? ((avgA + avgB + avgC) / 3) * 70 / 100 : 0;

    return res.status(200).json({
      success: true,
      a: avgA,
      b: avgB,
      c: avgC,
      kpi
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
