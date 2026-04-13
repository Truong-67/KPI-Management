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
    const keyNhapIndex = headers.findIndex((h: string) => h.toLowerCase() === 'keynhap' || h.toLowerCase() === 'key_nhap');
    
    if (keyNhapIndex === -1) {
      return res.status(500).json({ error: 'Column KeyNhap not found in sheet' });
    }

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

    // Process each update
    for (const update of updates) {
      const { KeyNhap, SoGiao, SoHoanThanh, SoLoiChatLuong, SoCham } = update;
      if (!KeyNhap) continue;

      const rowIndex = data.findIndex((row: any[], idx: number) => idx > 0 && row[keyNhapIndex] === KeyNhap);
      if (rowIndex === -1) continue;

      const rowToUpdate = [...data[rowIndex]];

      // Helper to get/set values by column name
      const getVal = (colName: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
        return idx !== -1 ? parseFloat(rowToUpdate[idx]) || 0 : 0;
      };
      const setVal = (colName: string, val: any) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
        if (idx !== -1) rowToUpdate[idx] = val;
      };
      const getStr = (colName: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
        return idx !== -1 ? rowToUpdate[idx] : '';
      };

      // Update input fields
      if (SoGiao !== undefined) setVal('SoGiao', SoGiao);
      if (SoHoanThanh !== undefined) setVal('SoHoanThanh', SoHoanThanh);
      if (SoLoiChatLuong !== undefined) setVal('SoLoiChatLuong', SoLoiChatLuong);
      if (SoCham !== undefined) setVal('SoCham', SoCham);

      const maNhiemVu = getStr('MaNhiemVu');
      const heSo = heSoMap[maNhiemVu] || 0;

      const soGiaoVal = getVal('SoGiao');
      const soHoanThanhVal = getVal('SoHoanThanh');
      const soLoiVal = getVal('SoLoiChatLuong');
      const soChamVal = getVal('SoCham');

      // 2. Quy đổi
      const quyDoi = soHoanThanhVal * heSo;
      setVal('QuyDoi', quyDoi);

      // 3. Điểm số lượng (a)
      const a = soGiaoVal === 0 ? 0 : (soHoanThanhVal / soGiaoVal) * 100;
      setVal('DiemSoLuong', a);

      // 4. Điểm chất lượng (b)
      let giaTriB = soHoanThanhVal - (soLoiVal * heSo * 0.25);
      if (giaTriB < 0) giaTriB = 0;
      const b = soGiaoVal === 0 ? 0 : (giaTriB / soGiaoVal) * 100;
      setVal('DiemChatLuong', b);

      // 5. Điểm tiến độ (c)
      let giaTriC = soHoanThanhVal - (soChamVal * heSo * 0.25);
      if (giaTriC < 0) giaTriC = 0;
      const c = soGiaoVal === 0 ? 0 : (giaTriC / soGiaoVal) * 100;
      setVal('DiemTienDo', c);

      // Calculate column letter for the range
      let endColLetter = '';
      let temp = headers.length;
      while (temp > 0) {
        let modulo = (temp - 1) % 26;
        endColLetter = String.fromCharCode(65 + modulo) + endColLetter;
        temp = Math.floor((temp - modulo) / 26);
      }
      
      const sheetRowNumber = rowIndex + 1;
      const range = `A${sheetRowNumber}:${endColLetter}${sheetRowNumber}`;
      
      await updateSheet('NHAP_LIEU', range, [rowToUpdate]);
      data[rowIndex] = rowToUpdate; // Update local data array for calculation
    }

    // 6. KPI cá nhân: Lấy trung bình a, b, c theo MaNhanSu và Thang
    const allRowsForUser = data.slice(1).filter((r: any[]) => {
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
    const diem70 = count > 0 ? ((avgA + avgB + avgC) / 3) * 70 / 100 : 0;

    // Update KET_QUA_CA_NHAN
    const kqData = await readSheet('KET_QUA_CA_NHAN');
    if (kqData && kqData.length > 0) {
      const kqHeaders = kqData[0];
      const kqThangIdx = kqHeaders.findIndex((h: string) => h.toLowerCase() === 'thang');
      const kqMaNsIdx = kqHeaders.findIndex((h: string) => h.toLowerCase() === 'manhansu' || h.toLowerCase() === 'ma_nhan_su');
      
      const kqRowIndex = kqData.findIndex((r: any[], idx: number) => idx > 0 && r[kqThangIdx] === thang && r[kqMaNsIdx] === maNhanSu);
      
      if (kqRowIndex !== -1) {
        const kqRowToUpdate = [...kqData[kqRowIndex]];
        const setKqVal = (colName: string, val: any) => {
          const idx = kqHeaders.findIndex((h: string) => h.toLowerCase() === colName.toLowerCase());
          if (idx !== -1) kqRowToUpdate[idx] = val;
        };
        
        setKqVal('DiemSoLuong', avgA);
        setKqVal('DiemChatLuong', avgB);
        setKqVal('DiemTienDo', avgC);
        setKqVal('Diem70', diem70);
        
        let kqEndColLetter = '';
        let kqTemp = kqHeaders.length;
        while (kqTemp > 0) {
          let modulo = (kqTemp - 1) % 26;
          kqEndColLetter = String.fromCharCode(65 + modulo) + kqEndColLetter;
          kqTemp = Math.floor((kqTemp - modulo) / 26);
        }
        
        const kqSheetRowNumber = kqRowIndex + 1;
        const kqRange = `A${kqSheetRowNumber}:${kqEndColLetter}${kqSheetRowNumber}`;
        await updateSheet('KET_QUA_CA_NHAN', kqRange, [kqRowToUpdate]);
      }
    }

    return res.status(200).json({ 
      success: true, 
      a: avgA,
      b: avgB,
      c: avgC,
      kpi: diem70
    });
  } catch (error: any) {
    console.error('Error updating NHAP_LIEU:', error);
    return res.status(500).json({ error: error.message });
  }
}
