import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { thang, maNhanSu, hoTen, a, b, c, d, dd, e, kpi } = req.body;

    if (!thang || !maNhanSu) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    a = Number(a) || 0;
    b = Number(b) || 0;
    c = Number(c) || 0;
    d = Number(d) || 0;
    dd = Number(dd) || 0;
    e = Number(e) || 0;
    kpi = Number(kpi) || 0;

    let data = await readSheet('KPI_LUU_TRU');

    if (!data || data.length === 0) {
      await updateSheet('KPI_LUU_TRU', 'A1:J1', [[
        'Thang', 'MaNhanSu', 'HoTen', 'a', 'b', 'c', 'd', 'đ', 'e', 'KPI'
      ]]);

      data = [['Thang', 'MaNhanSu', 'HoTen', 'a', 'b', 'c', 'd', 'đ', 'e', 'KPI']];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const iThang = headers.findIndex((h: string) => h.toLowerCase() === 'thang');
    const iMaNS = headers.findIndex((h: string) => h.toLowerCase() === 'manhansu');

    const newRow = [
      thang,
      maNhanSu,
      hoTen || '',
      a,
      b,
      c,
      d,
      dd,
      e,
      kpi
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

    if (rowNumber === -1) {
      rowNumber = data.length + 1;
    }

    await updateSheet('KPI_LUU_TRU', `A${rowNumber}:J${rowNumber}`, [newRow]);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error('SAVE_KPI_ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}
