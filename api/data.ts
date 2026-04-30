import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, action } =
    req.method === 'GET' ? req.query : req.body;

  // ===== CHUẨN HÓA THÁNG =====
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // ==================================================
    // ===== GET TIÊU CHÍ ================================
    // ==================================================
    if (action === 'get-tieuchi') {
      if (!thang || !maNhanSu) {
        return res.status(200).json({});
      }

      const data = await readSheet('TIEU_CHI_CHUNG');

      if (!data || data.length <= 1) {
        return res.status(200).json({});
      }

      const rows = data.slice(1);

      const result: Record<string, number> = {};

      rows.forEach((r: any[]) => {
        if (
          String(r[0]).trim() === String(thang).trim() &&
          String(r[1]).trim() === String(maNhanSu).trim()
        ) {
          result[r[2]] = Number(r[3]) || 0;
        }
      });

      return res.status(200).json(result);
    }

    // ==================================================
    // ===== SAVE TIÊU CHÍ (UPSERT CHUẨN) ================
    // ==================================================
    if (action === 'save-tieuchi' && req.method === 'POST') {

      let { thang: thangBody, maNhanSu: maNSBody, data } = req.body;

      if (!thangBody || !maNSBody || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Missing or invalid data' });
      }

      // chuẩn hóa tháng
      if (thangBody.includes('-')) {
        const [yyyy, mm] = thangBody.split('-');
        thangBody = `${mm}/${yyyy}`;
      }

      let sheet = await readSheet('TIEU_CHI_CHUNG');

      // 👉 nếu chưa có sheet → tạo header
      if (!sheet || sheet.length === 0) {
        await updateSheet('TIEU_CHI_CHUNG', 'A1:D1', [[
          'Thang', 'MaNhanSu', 'TieuChiID', 'Diem'
        ]]);

        sheet = [['Thang', 'MaNhanSu', 'TieuChiID', 'Diem']];
      }

      const rows = sheet.slice(1);

      for (const item of data) {
        const tcId = item.id;
        const diem = Number(item.diem) || 0;

        let rowIndex = -1;

        rows.forEach((r: any[], idx: number) => {
          if (
            String(r[0]).trim() === thangBody &&
            String(r[1]).trim() === maNSBody &&
            String(r[2]).trim() === tcId
          ) {
            rowIndex = idx + 2;
          }
        });

        const newRow = [thangBody, maNSBody, tcId, diem];

        if (rowIndex === -1) {
          rowIndex = rows.length + 2;
        }

        await updateSheet(
          'TIEU_CHI_CHUNG',
          `A${rowIndex}:D${rowIndex}`,
          [newRow]
        );
      }

      return res.status(200).json({ success: true });
    }

    // ==================================================
    // ===== LOAD NHẬP LIỆU ==============================
    // ==================================================
    if (action === 'get-nhiemvu') {

      if (!thang || !maNhanSu) {
        return res.status(200).json([]);
      }

      const data = await readSheet('NHAP_LIEU');

      if (!data || data.length <= 1) {
        return res.status(200).json([]);
      }

      const headers = data[0];
      const rows = data.slice(1);

      const result = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      const filtered = result.filter((item: any) => {
        const itemThang = item.Thang || item.thang;
        const itemMaNS = item.MaNhanSu || item.maNhanSu;

        return (
          String(itemThang).trim() === String(thang).trim() &&
          String(itemMaNS).trim() === String(maNhanSu).trim()
        );
      });

      return res.status(200).json(filtered);
    }

    // ==================================================
    // ===== DEFAULT =====================================
    // ==================================================
    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error('API ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
