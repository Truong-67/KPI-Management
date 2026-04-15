import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  try {
    const data = await readSheet('NHAP_LIEU');
    const headers = data[0];

    // giữ header, xóa hết data
    await updateSheet('NHAP_LIEU', 'A2:Z10000', []);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
