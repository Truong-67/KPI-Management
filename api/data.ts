import { readSheet, updateSheet } from './_sheets.js';
import crypto from 'crypto';

// ===============================
// ===== HASH ====================
// ===============================
function hashPassword(password: string) {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

// ===============================
// ===== HELPER ==================
// ===============================
function getUser(req: any) {
  if (req.method === 'GET') {
    if (!req.query.user) return null;
    try {
      return JSON.parse(req.query.user);
    } catch {
      return null;
    }
  }
  return req.body?.user || null;
}

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

function checkPermission(user: any, targetMaNhanSu: string, dmNhanSu: any[]) {
  if (!user) return false;

  if (user.role === 'ADMIN') return true;

  if (user.role === 'CAN_BO') {
    return String(user.maNhanSu).trim().toUpperCase() === 
           String(targetMaNhanSu).trim().toUpperCase();
  }

  if (user.role === 'LANH_DAO_PHONG') {
    const ns = dmNhanSu.find(
      x => String(x.MaNhanSu).trim().toUpperCase() === 
           String(targetMaNhanSu).trim().toUpperCase()
    );

    return String(ns?.PhongBan || '').trim().toUpperCase() === 
           String(user.phongBan || '').trim().toUpperCase();
  }

  return false;
}

// ===============================
// ===== LOGIN ===================
// ===============================
async function handleLogin(req: any, res: any) {
  try {
    const { username, password } = req.body;

    const users = await readSheet('USERS');
    const headers = users[0];
    const rows = users.slice(1);

    const data = rows.map((r: any[]) => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = r[i];
      });
      return obj;
    });

    const hash = hashPassword(password);

    const user = data.find(u => {
      const usernameDB = String(u.Username || '').trim().toUpperCase();
      const pass = String(u.Password || '').trim();
      const passHash = String(u.PasswordHash || '').trim();
      const active = String(u.Active || '').toUpperCase();

      if (usernameDB !== String(username).trim().toUpperCase() || active !== 'TRUE') return false;

      if (passHash) {
        return passHash === hash;
      }

      return pass === password;
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Sai tài khoản hoặc mật khẩu'
      });
    }

    return res.json({
      success: true,
      user: {
        username: user.Username,
        maNhanSu: user.MaNhanSu,
        hoTen: user.HoTen,
        phongBan: user.PhongBan,
        role: user.Role
      }
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ===============================
// ===== CHANGE PASSWORD =========
// ===============================
async function handleChangePassword(req: any, res: any) {
  try {
    const { username, oldPassword, newPassword } = req.body;

    const users = await readSheet('USERS');
    const headers = users[0];
    const rows = users.slice(1);

    const iUsername = headers.indexOf('Username');
    const iPassword = headers.indexOf('Password');
    const iPasswordHash = headers.indexOf('PasswordHash');

    let foundIndex = -1;

    rows.forEach((r, idx) => {
      const usernameDB = String(r[iUsername] || '').trim().toUpperCase();
      const pass = String(r[iPassword] || '').trim();
      const passHash = String(r[iPasswordHash] || '').trim();

      const oldHash = hashPassword(oldPassword);

      const isValid = passHash
        ? passHash === oldHash
        : pass === oldPassword;

      if (usernameDB === String(username).trim().toUpperCase() && isValid) {
        foundIndex = idx + 1;
      }
    });

    if (foundIndex === -1) {
      return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
    }

    const newHash = hashPassword(newPassword);

    const rowNumber = foundIndex + 1;
    const colLetter = String.fromCharCode(65 + iPasswordHash);
    const range = `${colLetter}${rowNumber}`;

    await updateSheet('USERS', range, [[newHash]]);

    return res.json({ success: true });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ===============================
// ===== MAIN ====================
// ===============================
export default async function handler(req: any, res: any) {

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, action } =
    req.method === 'GET' ? req.query : req.body;

  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    if (action === 'login') {
      return handleLogin(req, res);
    }

    if (action === 'change-password') {
      return handleChangePassword(req, res);
    }

    const user = getUser(req);
    const dmNhanSu = await getDMNhanSu();

    // ===== GET TIÊU CHÍ =====
    if (action === 'get-tieuchi') {

      if (!thang || !maNhanSu) return res.status(200).json({});

      if (!checkPermission(user, maNhanSu, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      const data = await readSheet('TIEU_CHI_CHUNG');
      if (!data || data.length <= 1) return res.status(200).json({});

      const rows = data.slice(1);
      const result: Record<string, number> = {};

      rows.forEach((r: any[]) => {
        if (
          String(r[0]).trim() === String(thang).trim() &&
          String(r[1]).trim() === String(maNhanSu).trim()
        ) {
          result[r[2]] = Number(r[3]) || 0;
        }
      });

      return res.status(200).json(result);
    }
  // =======================================
// ===== THỐNG KÊ THEO PHÒNG ============
// =======================================
if (action === 'get-thongke') {
  if (!thang || !user) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const dmNhanSu = await readSheet('DM_NHAN_SU');
  const kpiData = await readSheet('KPI_LUU_TRU');

  const dmHeaders = dmNhanSu[0];
  const kpiHeaders = kpiData[0];

  const getIdx = (arr: string[], name: string) =>
    arr.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const iMaNS = getIdx(dmHeaders, 'MaNhanSu');
  const iHoTen = getIdx(dmHeaders, 'HoTen');
  const iPhong = getIdx(dmHeaders, 'PhongBan');

  const iKPI_MaNS = getIdx(kpiHeaders, 'MaNhanSu');
  const iKPI_Thang = getIdx(kpiHeaders, 'Thang');
  const iTong = getIdx(kpiHeaders, 'TONG_DIEM');

  const rowsNS = dmNhanSu.slice(1);
  const rowsKPI = kpiData.slice(1);

  // 🔥 LỌC THEO PHÒNG
  const result = rowsNS
    .filter(r => {
      const phong = String(r[iPhong] || '').trim();
      return phong === String(user.phongBan).trim();
    })
    .map(r => {
      const ma = r[iMaNS];
      const ten = r[iHoTen];

      const kpiRow = rowsKPI.find(k =>
        String(k[iKPI_MaNS]).trim() === String(ma).trim() &&
        String(k[iKPI_Thang]).trim() === String(thang).trim()
      );

      return {
        MaNhanSu: ma,
        HoTen: ten,
        TongDiem: Number(String(kpiRow?.[iTong] || 0).replace(',', '.'))
      };
    })
    .sort((a, b) => b.TongDiem - a.TongDiem);

  return res.status(200).json(result);
}
    // ===== SAVE TIÊU CHÍ =====
    if (action === 'save-tieuchi' && req.method === 'POST') {

      let { thang: thangBody, maNhanSu: maNSBody, data } = req.body;

      if (!thangBody || !maNSBody || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (!checkPermission(user, maNSBody, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      if (thangBody.includes('-')) {
        const [yyyy, mm] = thangBody.split('-');
        thangBody = `${mm}/${yyyy}`;
      }

      const oldData = await readSheet('TIEU_CHI_CHUNG');

      const headers = oldData[0];
      const oldRows = oldData.slice(1).filter(r =>
        !(String(r[0]).trim() === thangBody && String(r[1]).trim() === maNSBody)
      );

      const newRows = data.map((item: any) => [
        thangBody,
        maNSBody,
        item.id,
        Number(item.diem) || 0
      ]);

      await updateSheet('TIEU_CHI_CHUNG', `A1:D${oldRows.length + newRows.length + 1}`, [
        headers,
        ...oldRows,
        ...newRows
      ]);

      return res.json({ success: true });
    }

    // ===== LOAD NHIỆM VỤ =====
    if (action === 'get-nhiemvu') {

      if (!thang || !maNhanSu) return res.status(200).json([]);

      if (!checkPermission(user, maNhanSu, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      const data = await readSheet('NHAP_LIEU');
      if (!data || data.length <= 1) return res.status(200).json([]);

      const headers = data[0];
      const rows = data.slice(1);

      const result = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      return res.status(200).json(
        result.filter((item: any) =>
          String(item.Thang).trim() === String(thang).trim() &&
          String(item.MaNhanSu).trim() === String(maNhanSu).trim()
        )
      );
    }
// =============================
// 🔒 CHECK ĐÃ CHỐT
// =============================
if (action === 'check-locked') {

  const { thang, user } = req.query;

  const kpi = await readSheet('KPI_LUU_TRU');
  const headers = kpi[0];

  const getIdx = (name: string) =>
    headers.findIndex(h => String(h).toLowerCase().includes(name.toLowerCase()));

  const iThang = getIdx('Thang');
  const iMa = getIdx('MaNhanSu');

  const rows = kpi.slice(1);

  const found = rows.find(r =>
    String(r[iThang]).trim() === String(thang).trim()
  );

  return res.status(200).json({
    locked: !!found
  });
}
    
    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error('API ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
