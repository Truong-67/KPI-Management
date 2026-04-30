import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { thang, maNhanSu, d, dd, e } = req.body;

    if (!thang || !maNhanSu) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // ==============================
    // FORMAT THÁNG → MM/YYYY
    // ==============================
    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    // ==============================
    // PARSE SỐ AN TOÀN
    // ==============================
    d = Number(d) || 0;
    dd = Number(dd) || 0;
    e = Number(e) || 0;

    // ==============================
    // CHECK CHỨC VỤ (QUAN TRỌNG)
    // ==============================
    const nsData = await readSheet('DM_NHAN_SU');

    if (!nsData || nsData.length <= 1) {
      return res.status(400).json({ error: 'DM_NHAN_SU empty' });
    }

    const nsHeaders = nsData[0].map((h: string) => h.toLowerCase());
    const nsRows = nsData.slice(1);

    const iMa = nsHeaders.indexOf('manhansu');
    const iChucVu = nsHeaders.indexOf('chucvu');

    const user = nsRows.find(r =>
      String(r[iMa]).trim() === String(maNhanSu).trim()
    );

    const chucVu = user ? String(user[iChucVu]).trim() : '';

    if (chucVu !== 'Trưởng phòng' && chucVu !== 'Phó phòng') {
      return res.status(200).json({
        success: false,
        message: 'Không phải lãnh đạo → không lưu'
      });
    }

    // ==============================
    // ĐỌC SHEET NHAP_DIEM_PHU_TRACH
    // ==============================
    let data = await readSheet('NHAP_DIEM_PHU_TRACH');

    if (!data || data.length === 0) {
      // tạo mới nếu sheet rỗng
      data = [['Thang', 'MaNhanSu', 'd', 'đ', 'e']];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const h = headers.map((x: string) => x.toLowerCase());

    const iThang = h.indexOf('thang');
    const iMaNS = h.indexOf('manhansu');

    // ==============================
    // UPDATE / INSERT
    // ==============================
    let found = false;

    const newRows = rows.map(r => {
      if (
        String(r[iThang]).trim() === String(thang).trim() &&
        String(r[iMaNS]).trim() === String(maNhanSu).trim()
      ) {
        found = true;
        return [thang, maNhanSu, d, dd, e];
      }
      return r;
    });

    if (!found) {
      newRows.push([thang, maNhanSu, d, dd, e]);
    }

    // ==============================
    // GHI LẠI (GIỮ HEADER)
    // ==============================
    await writeSheet('NHAP_DIEM_PHU_TRACH', [headers, ...newRows]);

    return res.status(200).json({
      success: true,
      d,
      dd,
      e
    });

  } catch (err: any) {
    console.error('SAVE_PHUTRACH ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}
