import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.query;

  // Convert "MM/YYYY" to "YYYY-MM"
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    const data = await readSheet('KET_QUA_CA_NHAN');
    
    if (!data || data.length <= 1) {
      return res.status(200).json([]);
    }

    const headers = data[0];
    const rows = data.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
    
    let result = rows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (thang) {
      result = result.filter((item: any) => String(item.thang || item.Thang || item.THANG) === String(thang));
    }

    // Sort by Diem70 descending
    result.sort((a: any, b: any) => {
      const diemA = parseFloat(a.Diem70 || a.diem70 || a.DIEM_70) || 0;
      const diemB = parseFloat(b.Diem70 || b.diem70 || b.DIEM_70) || 0;
      return diemB - diemA;
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error reading KET_QUA_CA_NHAN:', error);
    return res.status(500).json({ error: error.message });
  }
}
