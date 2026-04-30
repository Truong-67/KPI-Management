import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.body;

  if (!thang) {
    return res.status(400).json({ error: 'Missing thang' });
  }

  try {
    // =====================================================
    // 1. ĐỌC NHAP_LIEU
    // =====================================================
    const nhapLieuData = await readSheet('NHAP_LIEU');

    if (!nhapLieuData || nhapLieuData.length === 0) {
      return res.status(500).json({ error: 'Sheet NHAP_LIEU chưa có header' });
    }

    const nhapLieuHeaders = nhapLieuData[0];

    const keyIdx = nhapLieuHeaders.findIndex(
      (h: string) => h.toLowerCase() === 'keynhap'
    );

    if (keyIdx === -1) {
      return res.status(500).json({ error: 'Không tìm thấy cột KeyNhap' });
    }

    // 👉 Lấy toàn bộ key đã tồn tại
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
      return res.status(404).json({ error: 'PHAN_CONG_NHIEM_VU không có dữ liệu' });
    }

    const pcHeaders = phanCongData[0];

    const pcRows = phanCongData
      .slice(1)
      .filter((row: any[]) => row.length > 0 && row.some(c => c !== ''));

    const maNsIdx = pcHeaders.findIndex((h: string) =>
      h.toLowerCase().includes('manhansu')
    );

    const maNvIdx = pcHeaders.findIndex((h: string) =>
      h.toLowerCase().includes('manhiemvu')
    );

    if (maNsIdx === -1 || maNvIdx === -1) {
      return res.status(500).json({ error: 'Thiếu cột MaNhanSu hoặc MaNhiemVu' });
    }

    // =====================================================
    // 3. TẠO DỮ LIỆU MỚI (KHÔNG TRÙNG)
    // =====================================================
    const newRows: any[] = [];

    pcRows.forEach((row: any[]) => {
      const maNs = row[maNsIdx];
      const maNv = row[maNvIdx];

      const key = `${thang}_${maNs}_${maNv}`;

      // ❗ CHẶN TRÙNG
      if (existingKeys.has(key)) return;

      const newRow = new Array(nhapLieuHeaders.length).fill('');

      nhapLieuHeaders.forEach((header: string, idx: number) => {
        const h = header.toLowerCase();

        if (h === 'keynhap') {
          newRow[idx] = key;
        } else if (h === 'thang') {
          newRow[idx] = thang;
        } else {
          const pcIdx = pcHeaders.findIndex(pcH => pcH === header);
          if (pcIdx !== -1) {
            newRow[idx] = row[pcIdx] || '';
          }
        }
      });

      newRows.push(newRow);
    });

    // =====================================================
    // 4. APPEND (KHÔNG BAO GIỜ GHI ĐÈ)
    // =====================================================
    if (newRows.length > 0) {
      const startRow = nhapLieuData.length + 1;

      const endCol = String.fromCharCode(65 + nhapLieuHeaders.length - 1);

      await updateSheet(
        'NHAP_LIEU',
        `A${startRow}:${endCol}${startRow + newRows.length - 1}`,
        newRows
      );
    }

    // =====================================================
    // DONE
    // =====================================================
    return res.status(200).json({
      success: true,
      added: newRows.length,
      message:
        newRows.length > 0
          ? `Đã thêm ${newRows.length} dòng cho tháng ${thang}`
          : `Tháng ${thang} đã đủ dữ liệu`
    });

  } catch (error: any) {
    console.error('init-thang error:', error);
    return res.status(500).json({ error: error.message });
  }
}
