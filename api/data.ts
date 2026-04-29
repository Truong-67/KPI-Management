import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
 if (req.method !== 'GET' && req.method !== 'POST') {
  return res.status(405).json({ error: 'Method not allowed' });
}

  let { thang, maNhanSu } = req.query;
  const action = req.query.action;

  if (!thang) {
  return res.status(400).json({ error: 'Missing thang' });
}

  // ✅ FIX FORMAT
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    // ===== GET TIÊU CHÍ =====
if (action === 'get-tieuchi') {
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

  const result: any = {};

  rows.forEach(r => {
    if (
      String(r[iThang]).trim() === String(thang).trim() &&
      String(r[iMaNS]).trim() === String(maNhanSu).trim()
    ) {
      result[r[iID]] = r[iDiem];
    }
  });

  return res.status(200).json(result);
}

// ===== SAVE TIÊU CHÍ =====
if (action === 'save-tieuchi' && req.method === 'POST') {
  const { thang: thangBody, maNhanSu: maNSBody, data } = req.body;

  const newRows = data.map((item: any) => [
  thangBody,
  maNSBody,
  item.id,
  item.diem
]);

  const { writeSheet } = await import('./_sheets.js');
  await writeSheet('TIEU_CHI_CHUNG', newRows);

  return res.status(200).json({ success: true });
}
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
