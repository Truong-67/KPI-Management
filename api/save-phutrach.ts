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

    // format tháng
    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    // đọc dữ liệu cũ
    const data = await readSheet('NHAP_DIEM_PHU_TRACH');
    const headers = data[0];
    const rows = data.slice(1);

    const iThang = headers.findIndex(h => h.toLowerCase() === 'thang');
    const iMaNS = headers.findIndex(h => h.toLowerCase() === 'manhansu');

    let found = false;

    const newRows = rows.map(r => {
      if (
        String(r[iThang]).trim() === thang &&
        String(r[iMaNS]).trim() === maNhanSu
      ) {
        found = true;
        return [thang, maNhanSu, d, dd, e];
      }
      return r;
    });

    if (!found) {
      newRows.push([thang, maNhanSu, d, dd, e]);
    }

    await writeSheet('NHAP_DIEM_PHU_TRACH', newRows);

    return res.status(200).json({
      success: true,
      d,
      dd,
      e
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
