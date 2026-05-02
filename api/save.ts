import { readSheet, updateSheet } from './_sheets.js';

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

// ===============================
// ===== MAIN ====================
// ===============================
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu, data: updates, user } = req.body;

  // ===== CHUẨN HÓA THÁNG =====
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    const kpi = await readSheet('KPI_LUU_TRU');
  if (kpi && kpi.length > 1) {
  const kHeaders = kpi[0];

  const getIdx = (name: string) =>
    kHeaders.findIndex(h => String(h).toLowerCase().includes(name.toLowerCase()));

  const iK_Thang = getIdx('Thang');
  const iK_Ma = getIdx('MaNhanSu');

  const kRows = kpi.slice(1);

  const isLocked = kRows.find(r =>
    String(r[iK_Thang]).trim() === String(thang).trim() &&
    String(r[iK_Ma]).trim() === String(maNhanSu).trim()
  );

  if (isLocked) {
    return res.status(403).json({
      error: 'Tháng này đã được chốt, không thể chỉnh sửa'
    });
  }
}
    const dmNhanSu = await getDMNhanSu();

    if (!checkPermission(user, maNhanSu, dmNhanSu)) {
      return res.status(403).json({ error: 'Không có quyền lưu dữ liệu nhân sự này' });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ success: true, a: 0, b: 0, c: 0, kpi: 0 });
    }

    const headers = data[0];

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iKey = idx('KeyNhap');
    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iMaNV = idx('MaNhiemVu');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // 🔥 THÊM CHỈ SỐ CHỐNG GHI ĐÈ
    const iLastUpdated = idx('LastUpdated');

    // ===== LOAD HỆ SỐ =====
    const qdv = await readSheet('QDV');
    const qHeaders = qdv[0];

    const iMaNV_Q = qHeaders.findIndex(h => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex(h => h.toLowerCase().includes('quydoi'));

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[r[iMaNV_Q]] = parseFloat(r[iHS_Q]) || 0;
    });

    // ===============================
    // ===== UPDATE / INSERT =========
    // ===============================
    for (const u of updates) {

      let rowIndex = data.findIndex((r: any, i: number) =>
        i > 0 && String(r[iKey]).trim() === String(u.KeyNhap).trim()
      );

      // ===== CHECK QUYỀN TRÊN TỪNG DÒNG =====
      if (rowIndex !== -1) {
        const oldRow = data[rowIndex];
        const rowMaNS = oldRow[iMaNS];

        if (!checkPermission(user, rowMaNS, dmNhanSu)) {
          throw new Error(`Không có quyền sửa KeyNhap: ${u.KeyNhap}`);
        }

        // 🔥 CHỐNG GHI ĐÈ
        const serverTime = String(oldRow[iLastUpdated] || '');
        const clientTime = String(u.LastUpdated || '');

        if (serverTime && clientTime && serverTime !== clientTime) {
  return res.status(409).json({
    error: 'Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại!',
    conflictKeys: [u.KeyNhap]
  });
}
      }

      // ===============================
      // ===== CASE 1: INSERT ==========
      // ===============================
      if (rowIndex === -1) {

        if (!checkPermission(user, maNhanSu, dmNhanSu)) {
          throw new Error('Không có quyền tạo dữ liệu');
        }

        const newRow = new Array(headers.length).fill('');

        newRow[iKey] = u.KeyNhap;
        newRow[iThang] = thang;
        newRow[iMaNS] = maNhanSu;
        newRow[iMaNV] = u.MaNhiemVu;

        newRow[iGiao] = Number(u.SoGiao) || 0;
        newRow[iHT] = Number(u.SoHoanThanh) || 0;
        newRow[iLoi] = Number(u.SoLoiChatLuong) || 0;
        newRow[iCham] = Number(u.SoCham) || 0;

        // 🔥 GHI TIME
        newRow[iLastUpdated] = new Date().toISOString();

        const newRowNumber = data.length + 1;

        const range = `A${newRowNumber}:${String.fromCharCode(65 + headers.length - 1)}${newRowNumber}`;

        await updateSheet('NHAP_LIEU', range, [newRow]);

        data.push(newRow);
        continue;
      }

      // ===============================
      // ===== CASE 2: UPDATE ==========
      // ===============================
      const row = [...data[rowIndex]];

      if (u.SoGiao !== undefined) row[iGiao] = Number(u.SoGiao);
      if (u.SoHoanThanh !== undefined) row[iHT] = Number(u.SoHoanThanh);
      if (u.SoLoiChatLuong !== undefined) row[iLoi] = Number(u.SoLoiChatLuong);
      if (u.SoCham !== undefined) row[iCham] = Number(u.SoCham);

      // 🔥 UPDATE TIME MỚI
      row[iLastUpdated] = new Date().toISOString();

      const rowNumber = rowIndex + 1;

      const range = `A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;

      await updateSheet('NHAP_LIEU', range, [row]);

      data[rowIndex] = row;
    }

    // ===============================
    // ===== TÍNH KPI ================
    // ===============================
    const rows = data.slice(1);

    let tongGiaoQD = 0;
    let tongHTQD = 0;
    let tongCLQD = 0;
    let tongTDQD = 0;

    rows.forEach(r => {

      if (
        String(r[iThang]).trim() !== String(thang).trim() ||
        String(r[iMaNS]).trim() !== String(maNhanSu).trim()
      ) return;

      const soGiao = Number(r[iGiao]) || 0;
      const soHT = Number(r[iHT]) || 0;
      const soLoi = Number(r[iLoi]) || 0;
      const soCham = Number(r[iCham]) || 0;

      const heSo = heSoMap[r[iMaNV]] || 0;

      const giaoQD = soGiao * heSo;
      const htQD = soHT * heSo;

      let clQD = htQD - soLoi * heSo * 0.25;
      if (clQD < 0) clQD = 0;

      let tdQD = htQD - soCham * heSo * 0.25;
      if (tdQD < 0) tdQD = 0;

      tongGiaoQD += giaoQD;
      tongHTQD += htQD;
      tongCLQD += clQD;
      tongTDQD += tdQD;
    });

    const a = tongGiaoQD === 0 ? 0 : (tongHTQD / tongGiaoQD) * 100;
    const b = tongGiaoQD === 0 ? 0 : (tongCLQD / tongGiaoQD) * 100;
    const c = tongGiaoQD === 0 ? 0 : (tongTDQD / tongGiaoQD) * 100;

    const kpi = ((a + b + c) / 3) * 70 / 100;

    return res.status(200).json({
      success: true,
      a,
      b,
      c,
      kpi
    });

  } catch (err: any) {
    console.error('SAVE ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}
