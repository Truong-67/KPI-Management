import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { thang, maNhanSu, d, dd, e } = req.body;

    if (!thang || !maNhanSu) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // chuẩn hóa tháng
    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    d = Number(d) || 0;
    dd = Number(dd) || 0;
    e = Number(e) || 0;

    let data = await readSheet('NHAP_DIEM_PHU_TRACH');

    // 👉 Nếu sheet chưa có header → tạo 1 lần duy nhất
    if (!data || data.length === 0) {
      await updateSheet('NHAP_DIEM_PHU_TRACH', 'A1:E1', [[
        'Thang', 'MaNhanSu', 'd', 'đ', 'e'
      ]]);

      data = [['Thang', 'MaNhanSu', 'd', 'đ', 'e']];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const iThang = headers.findIndex((h: string) => h.toLowerCase() === 'thang');
    const iMaNS = headers.findIndex((h: string) => h.toLowerCase() === 'manhansu');

    const newRow = [
      thang,
      maNhanSu,
      d,
      dd,
      e
    ];

    let rowNumber = -1;

    rows.forEach((r: any[], idx: number) => {
      if (
        String(r[iThang]).trim() === String(thang).trim() &&
        String(r[iMaNS]).trim() === String(maNhanSu).trim()
      ) {
        rowNumber = idx + 2;
      }
    });

    // 👉 Nếu chưa có → thêm dòng mới
    if (rowNumber === -1) {
      rowNumber = data.length + 1;
    }

    // 👉 Ghi đúng 1 dòng duy nhất
    await updateSheet('NHAP_DIEM_PHU_TRACH', `A${rowNumber}:E${rowNumber}`, [newRow]);

    return res.status(200).json({
      success: true,
      d,
      dd,
      e
    });

  } catch (err: any) {
    console.error('SAVE_PT_ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}
