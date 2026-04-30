import { readSheet } from './_sheets.js';
// ===============================
// ===== HELPER PHÂN QUYỀN ======
// ===============================
async function getDMNhanSu() {
  const data = await readSheet('DM_NHAN_SU');
  if (!data || data.length <= 1) return [];

  const headers = data[0];

  return data.slice(1).map((row: any[]) => {
    const obj: any = {};
    headers.forEach((h: string, i: number) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

function getUserFromReq(req: any) {
  if (!req.query.user) return null;
  try {
    return JSON.parse(req.query.user);
  } catch {
    return null;
  }
}

function checkPermission(user: any, targetMaNhanSu: string, dmNhanSu: any[]) {
  if (!user) return false;

  if (user.role === 'ADMIN') return true;

  if (user.role === 'CAN_BO') {
    return String(user.maNhanSu).trim() === String(targetMaNhanSu).trim();
  }

  if (user.role === 'LANH_DAO_PHONG') {
    const ns = dmNhanSu.find(
      x => String(x.MaNhanSu).trim() === String(targetMaNhanSu).trim()
    );

    return String(ns?.PhongBan || '').trim() === String(user.phongBan || '').trim();
  }

  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;
  const user = getUserFromReq(req);
  if (!thang || !maNhanSu) {
    return res.status(400).json({ error: 'Missing thang or maNhanSu parameter' });
  }

  // Convert "YYYY-MM" → "MM/YYYY" (đúng với sheet)
if (thang.includes('-')) {
  const [yyyy, mm] = thang.split('-');
  thang = `${mm}/${yyyy}`;
}

  try {
    const data = await readSheet('NHAP_LIEU');
    const dmNhanSu = await getDMNhanSu();

if (!checkPermission(user, maNhanSu, dmNhanSu)) {
  return res.status(403).json({ error: 'Không có quyền xem dữ liệu nhân sự này' });
}
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
