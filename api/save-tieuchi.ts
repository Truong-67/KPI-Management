import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { thang, maNhanSu, data } = req.body;

  if (!thang || !maNhanSu || !data) {
    return res.status(400).json({ error: 'Thiếu dữ liệu' });
  }

  try {
    const rowsToSave = data.map((item: any) => [
      thang,
      maNhanSu,
      item.id,
      item.diem
    ]);

    await writeSheet('TIEU_CHI_CHUNG', rowsToSave);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
