import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { thang, maNhanSu, hoTen, a, b, c, d, dd, e, kpi } = req.body;

    if (!thang || !maNhanSu) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // ===== FORMAT THÁNG =====
    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    // ===== PARSE SỐ =====
    a = Number(a) || 0;
    b = Number(b) || 0;
    c = Number(c) || 0;
    d = Number(d) || 0;
    dd = Number(dd) || 0;
    e = Number(e) || 0;
    kpi = Number(kpi) || 0;

    // ===== ĐỌC SHEET =====
    let data = await readSheet('KPI_LUU_TRU');

    if (!data || data.length === 0) {
      data = [['Thang','MaNhanSu','HoTen','a','b','c','d','đ','e','KPI']];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const h = headers.map((x: string) => x.toLowerCase());

    const iThang = h.indexOf('thang');
    const iMaNS = h.indexOf('manhansu');

    let found = false;

    const newRows = rows.map(r => {
      if (
        String(r[iThang]).trim() === String(thang).trim() &&
        String(r[iMaNS]).trim() === String(maNhanSu).trim()
      ) {
        found = true;
        return [thang, maNhanSu, hoTen, a, b, c, d, dd, e, kpi];
      }
      return r;
    });

    if (!found) {
      newRows.push([thang, maNhanSu, hoTen, a, b, c, d, dd, e, kpi]);
    }

    await writeSheet('KPI_LUU_TRU', [headers, ...newRows]);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error('SAVE KPI ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}
