import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await readSheet('DM_NHAN_SU');
    
    if (!data || data.length <= 1) {
      return res.status(200).json([]);
    }

    const headers = data[0];
    const rows = data.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
    
    const result = rows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error reading DM_NHAN_SU:', error);
    return res.status(500).json({ error: error.message });
  }
}
