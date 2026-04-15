import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  if (!thang || !maNhanSu) {
    return res.status(400).json({ error: 'Missing thang or maNhanSu parameter' });
  }

  // ✅ FIX FORMAT
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    
    if (!data || data.length <= 1) {
      return res.status(200).json([]);
    }

    const headers = data[0];
    const rows = data
      .slice(1)
      .filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));
    
    const result = rows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const filtered = result.filter((item: any) => {
      const itemThang = item.Thang || item.thang || item.THANG;
      const itemMaNhanSu = item.MaNhanSu || item.maNhanSu || item.MA_NHAN_SU || item.ma_nhan_su;
      
      return String(itemThang).trim() === String(thang).trim() 
          && String(itemMaNhanSu).trim() === String(maNhanSu).trim();
    });

    return res.status(200).json(filtered);
  } catch (error: any) {
    console.error('Error reading NHAP_LIEU:', error);
    return res.status(500).json({ error: error.message });
  }
}
