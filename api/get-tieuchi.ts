import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { thang, maNhanSu } = req.query;

  if (!thang || !maNhanSu) {
    return res.status(400).json({ error: 'Thiếu tham số' });
  }

  try {
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

    const result: Record<string, string> = {};

    rows.forEach(r => {
      if (
        String(r[iThang]) === String(thang) &&
        String(r[iMaNS]) === String(maNhanSu)
      ) {
        result[r[iID]] = r[iDiem];
      }
    });

    return res.status(200).json(result);

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
