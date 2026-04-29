import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, action } =
    req.method === 'GET' ? req.query : req.body;

  // ===== FIX FORMAT THÁNG =====
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

      const headers = data[0];
      const rows = data.slice(1);

      const iThang = headers.findIndex(h => h.toLowerCase() === 'thang');
      const iMaNS = headers.findIndex(h => h.toLowerCase() === 'manhansu');
      const iID = headers.findIndex(h => h.toLowerCase() === 'tieuchiid');
      const iDiem = headers.findIndex(h => h.toLowerCase() === 'diem');

      const result: Record<string, number> = {};

      rows.forEach(r => {
        if (
          String(r[iThang]).trim() === String(thang).trim() &&
          String(r[iMaNS]).trim() === String(maNhanSu).trim()
        ) {
          result[r[iID]] = Number(r[iDiem]) || 0;
        }
      });

      return res.status(200).json(result);
    }

    // ==================================================
    // ===== SAVE TIÊU CHÍ (UPSERT CHUẨN) ================
    // ==================================================
    if (action === 'save-tieuchi' && req.method === 'POST') {
      const { thang: thangBody, maNhanSu: maNSBody, data } = req.body;

      if (!thangBody || !maNSBody || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Missing or invalid data' });
      }

      const oldData = await readSheet('TIEU_CHI_CHUNG');

      let headers: any[] = ['Thang', 'MaNhanSu', 'TieuChiID', 'Diem'];
      let oldRows: any[] = [];

      if (oldData && oldData.length > 0) {
        headers = oldData[0];
        oldRows = oldData.slice(1);
      }

      // ❌ Xóa dữ liệu cũ cùng tháng + nhân sự
      const filteredOld = oldRows.filter(r => {
        return !(
          String(r[0]).trim() === String(thangBody).trim() &&
          String(r[1]).trim() === String(maNSBody).trim()
        );
      });

      // ✅ Tạo dữ liệu mới
      const newRows = data.map((item: any) => [
        thangBody,
        maNSBody,
        item.id,
        Number(item.diem) || 0
      ]);

      const finalData = [
        headers,
        ...filteredOld,
        ...newRows
      ];

      await writeSheet('TIEU_CHI_CHUNG', finalData);

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
      const rows = data
        .slice(1)
        .filter((row: any[]) => row.length > 0 && row.some(c => c !== ''));

      const result = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      const filtered = result.filter((item: any) => {
        const itemThang = item.Thang || item.thang || item.THANG;
        const itemMaNhanSu =
          item.MaNhanSu ||
          item.maNhanSu ||
          item.MA_NHAN_SU ||
          item.ma_nhan_su;

        return (
          String(itemThang).trim() === String(thang).trim() &&
          String(itemMaNhanSu).trim() === String(maNhanSu).trim()
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
