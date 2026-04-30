import { readSheet, updateSheet } from './_sheets.js';

// ===============================
// ===== HELPER ==================
// ===============================

// Lấy user từ request
function getUser(req: any) {
  if (req.method === 'GET') return null;
  return req.body?.user || null;
}

// Load DM_NHAN_SU
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

// Kiểm tra quyền
function checkPermission(user: any, targetMaNhanSu: string, dmNhanSu: any[]) {

  if (!user) return false;

  if (user.role === 'ADMIN') return true;

  if (user.role === 'CAN_BO') {
    return user.maNhanSu === targetMaNhanSu;
  }

  if (user.role === 'LANH_DAO_PHONG') {
    const ns = dmNhanSu.find(x => x.MaNhanSu === targetMaNhanSu);
    return ns?.PhongBan === user.phongBan;
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

    if (!users || users.length <= 1) {
      return res.status(500).json({ error: 'USERS sheet empty' });
    }

    const headers = users[0];
    const rows = users.slice(1);

    const data = rows.map((r: any[]) => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = r[i];
      });
      return obj;
    });

    const user = data.find(u =>
      String(u.Username).trim() === username &&
      String(u.Password).trim() === password &&
      String(u.Active).toUpperCase() === 'TRUE'
    );

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
// ===== MAIN ====================
// ===============================
export default async function handler(req: any, res: any) {

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, action } =
    req.method === 'GET' ? req.query : req.body;

  // chuẩn hóa tháng
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // ================= LOGIN =================
    if (action === 'login') {
      return handleLogin(req, res);
    }

    const user = getUser(req);
    const dmNhanSu = await getDMNhanSu();

    // ==================================================
    // ===== GET TIÊU CHÍ ================================
    // ==================================================
    if (action === 'get-tieuchi') {

      if (!thang || !maNhanSu) {
        return res.status(200).json({});
      }

      // 🔐 check quyền
      if (!checkPermission(user, maNhanSu, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      const data = await readSheet('TIEU_CHI_CHUNG');

      if (!data || data.length <= 1) {
        return res.status(200).json({});
      }

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

    // ==================================================
    // ===== SAVE TIÊU CHÍ ===============================
    // ==================================================
    if (action === 'save-tieuchi' && req.method === 'POST') {

      let { thang: thangBody, maNhanSu: maNSBody, data } = req.body;

      if (!thangBody || !maNSBody || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Missing or invalid data' });
      }

      // 🔐 check quyền
      if (!checkPermission(user, maNSBody, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      if (thangBody.includes('-')) {
        const [yyyy, mm] = thangBody.split('-');
        thangBody = `${mm}/${yyyy}`;
      }

      const oldData = await readSheet('TIEU_CHI_CHUNG');

      let headers = ['Thang', 'MaNhanSu', 'TieuChiID', 'Diem'];
      let oldRows: any[] = [];

      if (oldData && oldData.length > 0) {
        headers = oldData[0];
        oldRows = oldData.slice(1);
      }

      const filtered = oldRows.filter(r => {
        if (String(r[0]).toLowerCase().trim() === 'thang') return false;

        return !(
          String(r[0]).trim() === thangBody &&
          String(r[1]).trim() === maNSBody
        );
      });

      const newRows = data.map((item: any) => [
        thangBody,
        maNSBody,
        item.id,
        Number(item.diem) || 0
      ]);

      const finalData = [
        headers,
        ...filtered,
        ...newRows
      ];

      await updateSheet(
        'TIEU_CHI_CHUNG',
        `A1:D${finalData.length}`,
        finalData
      );

      return res.status(200).json({ success: true });
    }

    // ==================================================
    // ===== LOAD NHẬP LIỆU ==============================
    // ==================================================
    if (action === 'get-nhiemvu') {

      if (!thang || !maNhanSu) {
        return res.status(200).json([]);
      }

      // 🔐 check quyền
      if (!checkPermission(user, maNhanSu, dmNhanSu)) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      const data = await readSheet('NHAP_LIEU');

      if (!data || data.length <= 1) {
        return res.status(200).json([]);
      }

      const headers = data[0];
      const rows = data.slice(1);

      const result = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      const filtered = result.filter((item: any) => {
        const itemThang = item.Thang || item.thang;
        const itemMaNS = item.MaNhanSu || item.maNhanSu;

        return (
          String(itemThang).trim() === String(thang).trim() &&
          String(itemMaNS).trim() === String(maNhanSu).trim()
        );
      });

      return res.status(200).json(filtered);
    }

    // ==================================================
    // ===== DEFAULT =====================================
    // ==================================================
    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error('API ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
