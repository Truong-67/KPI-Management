import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { thang, maNhanSu, data: updates } = req.body;

  if (!thang || !maNhanSu || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Missing thang, maNhanSu, or data array' });
  }

  try {
    const data = await readSheet('NHAP_LIEU');

    if (!data || data.length <= 1) {
      return res.status(404).json({ error: 'Sheet NHAP_LIEU is empty' });
    }

    const headers = data[0];

    const keyNhapIndex = headers.findIndex(
      (h: string) =>
        h.toLowerCase() === 'keynhap' ||
        h.toLowerCase() === 'key_nhap'
    );

    if (keyNhapIndex === -1) {
      return res.status(500).json({ error: 'Column KeyNhap not found' });
    }

    // =========================
    // LOAD HỆ SỐ QDV
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
    // UPDATE TỪNG DÒNG
    // =========================
    for (const update of updates) {
      const { KeyNhap, SoGiao, SoHoanThanh, SoLoiChatLuong, SoCham } = update;
      if (!KeyNhap) continue;

      const rowIndex = data.findIndex(
        (row: any[], idx: number) =>
          idx > 0 && row[keyNhapIndex] === KeyNhap
      );

      if (rowIndex === -1) continue;

      const rowToUpdate = [...data[rowIndex]];

      const getVal = (colName: string) => {
        const idx = headers.findIndex(
          (h: string) => h.toLowerCase() === colName.toLowerCase()
        );
        return idx !== -1 ? parseFloat(rowToUpdate[idx]) || 0 : 0;
      };

      const setVal = (colName: string, val: any) => {
        const idx = headers.findIndex(
          (h: string) => h.toLowerCase() === colName.toLowerCase()
        );
        if (idx !== -1) rowToUpdate[idx] = val;
      };

      const getStr = (colName: string) => {
        const idx = headers.findIndex(
          (h: string) => h.toLowerCase() === colName.toLowerCase()
        );
        return idx !== -1 ? rowToUpdate[idx] : '';
      };

      // INPUT
      if (SoGiao !== undefined) setVal('SoGiao', SoGiao);
      if (SoHoanThanh !== undefined) setVal('SoHoanThanh', SoHoanThanh);
      if (SoLoiChatLuong !== undefined) setVal('SoLoiChatLuong', SoLoiChatLuong);
      if (SoCham !== undefined) setVal('SoCham', SoCham);

      const maNhiemVu = getStr('MaNhiemVu');
      const heSo = heSoMap[maNhiemVu] || 0;

      const soGiaoVal = getVal('SoGiao');
      const soHT = getVal('SoHoanThanh');
      const soLoi = getVal('SoLoiChatLuong');
      const soCham = getVal('SoCham');

      // QUY ĐỔI
      const quyDoi = soHT * heSo;
      setVal('QuyDoi', quyDoi);

      // a
      const a = soGiaoVal === 0 ? 0 : (soHT / soGiaoVal) * 100;
      setVal('DiemSoLuong', a);

      // b
      let giaTriB = soHT - soLoi * heSo * 0.25;
      if (giaTriB < 0) giaTriB = 0;
      const b = soGiaoVal === 0 ? 0 : (giaTriB / soGiaoVal) * 100;
      setVal('DiemChatLuong', b);

      // c
      let giaTriC = soHT - soCham * heSo * 0.25;
      if (giaTriC < 0) giaTriC = 0;
      const c = soGiaoVal === 0 ? 0 : (giaTriC / soGiaoVal) * 100;
      setVal('DiemTienDo', c);

      // RANGE UPDATE
      let endCol = '';
      let temp = headers.length;
      while (temp > 0) {
        let mod = (temp - 1) % 26;
        endCol = String.fromCharCode(65 + mod) + endCol;
        temp = Math.floor((temp - mod) / 26);
      }

      const rowNumber = rowIndex + 1;
      const range = `A${rowNumber}:${endCol}${rowNumber}`;

      await updateSheet('NHAP_LIEU', range, [rowToUpdate]);

      data[rowIndex] = rowToUpdate;
    }

    // =========================
    // KPI CHUẨN (GAS)
    // =========================
    const thangIdx = headers.findIndex(h => h.toLowerCase() === 'thang');
    const maNsIdx = headers.findIndex(h =>
      h.toLowerCase() === 'manhansu' || h.toLowerCase() === 'ma_nhan_su'
    );

    const rowsUser = data.slice(1).filter(
      (r: any[]) => r[thangIdx] === thang && r[maNsIdx] === maNhanSu
    );

    let totalGiao = 0;
    let totalHT = 0;
    let totalGiaTriB = 0;
    let totalGiaTriC = 0;

    rowsUser.forEach((r: any[]) => {
      const getVal = (col: string) => {
        const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
        return idx !== -1 ? parseFloat(r[idx]) || 0 : 0;
      };

      const getStr = (col: string) => {
        const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
        return idx !== -1 ? r[idx] : '';
      };

      const maNV = getStr('MaNhiemVu');
      const heSo = heSoMap[maNV] || 0;

      const giao = getVal('SoGiao');
      const ht = getVal('SoHoanThanh');
      const loi = getVal('SoLoiChatLuong');
      const cham = getVal('SoCham');

      totalGiao += giao;
      totalHT += ht;

      let giaTriB = ht - loi * heSo * 0.25;
      if (giaTriB < 0) giaTriB = 0;
      totalGiaTriB += giaTriB;

      let giaTriC = ht - cham * heSo * 0.25;
      if (giaTriC < 0) giaTriC = 0;
      totalGiaTriC += giaTriC;
    });

    const a = totalGiao === 0 ? 0 : (totalHT / totalGiao) * 100;
    const b = totalGiao === 0 ? 0 : (totalGiaTriB / totalGiao) * 100;
    const c = totalGiao === 0 ? 0 : (totalGiaTriC / totalGiao) * 100;

    const kpi = ((a + b + c) / 3) * 70 / 100;

    return res.status(200).json({
      success: true,
      a,
      b,
      c,
      kpi
    });

  } catch (error: any) {
    console.error('Error updating NHAP_LIEU:', error);
    return res.status(500).json({ error: error.message });
  }
}
