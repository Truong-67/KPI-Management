import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.body;
  if (!thang) {
    return res.status(400).json({ error: 'Missing thang' });
  }

  // ✅ DÙNG THẲNG MM/YYYY – KHÔNG CONVERT

  try {
    // =====================================================
    // 1. ĐỌC NHAP_LIEU → LẤY DANH SÁCH KEY ĐÃ CÓ
    // =====================================================
    const nhapLieuData = await readSheet('NHAP_LIEU');
    const nhapLieuHeaders = nhapLieuData[0] || [];

    const keyIdx = nhapLieuHeaders.findIndex((h: string) => h.toLowerCase() === 'keynhap');

    const existingKeys = new Set(
      nhapLieuData
        .slice(1)
        .map((row: any[]) => String(row[keyIdx] || '').trim())
        .filter((k: string) => k !== '')
    );

    // =====================================================
    // 2. ĐỌC PHÂN CÔNG
    // =====================================================
    const phanCongData = await readSheet('PHAN_CONG_NHIEM_VU');

    if (!phanCongData || phanCongData.length <= 1) {
      return res.status(404).json({ error: 'Không có dữ liệu trong PHAN_CONG_NHIEM_VU' });
    }

    const pcHeaders = phanCongData[0];

    const pcRows = phanCongData
      .slice(1)
      .filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));

    const maNsIdx = pcHeaders.findIndex((h: string) =>
      h.toLowerCase().includes('manhansu')
    );

    const maNvIdx = pcHeaders.findIndex((h: string) =>
      h.toLowerCase().includes('manhiemvu')
    );

    // =====================================================
    // 3. TẠO DÒNG MỚI (CHỈ THÊM NHỮNG KEY CHƯA CÓ)
    // =====================================================
    const newRows: any[] = [];

    pcRows.forEach((row: any[]) => {
      const maNs = maNsIdx !== -1 ? row[maNsIdx] : '';
      const maNv = maNvIdx !== -1 ? row[maNvIdx] : '';

      const key = `${thang}_${maNs}_${maNv}`;

      // ❗ CHẶN TRÙNG – CỐT LÕI
      if (existingKeys.has(key)) return;

      const newRow = new Array(nhapLieuHeaders.length).fill('');

      nhapLieuHeaders.forEach((nlHeader: string, idx: number) => {
        const header = nlHeader.toLowerCase();

        if (header === 'thang') {
          newRow[idx] = thang;
        } 
        else if (header === 'keynhap') {
          newRow[idx] = key;
        } 
        else {
          const pcIdx = pcHeaders.findIndex((h: string) => h === nlHeader);
          if (pcIdx !== -1) {
            newRow[idx] = row[pcIdx] || '';
          }
        }
      });

      newRows.push(newRow);
    });

    // =====================================================
    // 4. GHI VÀO SHEET (CHỈ GHI PHẦN THIẾU)
    // =====================================================
    if (newRows.length > 0) {
      await writeSheet('NHAP_LIEU', newRows);
    }

    return res.status(200).json({
      success: true,
      added: newRows.length,
      message:
        newRows.length > 0
          ? `Đã bổ sung ${newRows.length} nhiệm vụ còn thiếu cho tháng ${thang}`
          : `Tháng ${thang} đã đầy đủ dữ liệu`
    });

  } catch (error: any) {
    console.error('Error init-thang:', error);
    return res.status(500).json({ error: error.message });
  }
}
