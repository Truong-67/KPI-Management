import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, user } = req.body;

  if (!thang || !user) {
    return res.status(400).json({ error: 'Missing thang or user' });
  }

  // YYYY-MM → MM/YYYY
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    const getIdx = (arr: any[], name: string) =>
      arr.findIndex(h => String(h).toLowerCase().includes(name.toLowerCase()));

    // =========================
    // 🔐 LOAD DM_NHAN_SU
    // =========================
    const dm = await readSheet('DM_NHAN_SU');
    const dmHeaders = dm[0];
    const dmRows = dm.slice(1);

    const iMa = getIdx(dmHeaders, 'MaNhanSu');
    const iTen = getIdx(dmHeaders, 'HoTen');
    const iPhong = getIdx(dmHeaders, 'Phong');
    const iRole = getIdx(dmHeaders, 'VaiTro');

    const currentUser = dmRows.find(
      r => String(r[iMa]).trim() === String(user.maNhanSu).trim()
    );

    if (!currentUser) {
      return res.status(403).json({ error: 'User không tồn tại' });
    }

    const role = String(currentUser[iRole]).trim();
    const phongBan = String(currentUser[iPhong]).trim();

    if (role !== 'TRUONG_PHONG' && role !== 'PHO_PHONG') {
      return res.status(403).json({ error: 'Chỉ lãnh đạo phòng được chốt' });
    }

    // =========================
    // 📌 LOAD NHAP_LIEU
    // =========================
    const data = await readSheet('NHAP_LIEU');
    const headers = data[0];
    const rows = data.slice(1);

    const idx = (name: string) =>
      headers.findIndex(h => String(h).toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iHoTen = idx('HoTen');
    const iMaNV = idx('MaNhiemVu');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // =========================
    // 📌 LOAD QDV
    // =========================
    const qdv = await readSheet('QDV');
    const qHeaders = qdv[0];

    const iMaNV_Q = getIdx(qHeaders, 'manhiemvu');
    const iHS_Q = getIdx(qHeaders, 'quydoi');

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[String(r[iMaNV_Q]).trim()] = Number(r[iHS_Q]) || 0;
    });

    // =========================
    // 📌 LOAD TIÊU CHÍ CHUNG
    // =========================
    const tc = await readSheet('TIEU_CHI_CHUNG');
    const tcHeaders = tc[0];

    const iTC_Thang = getIdx(tcHeaders, 'Thang');
    const iTC_Ma = getIdx(tcHeaders, 'MaNhanSu');
    const iTC_Diem = getIdx(tcHeaders, 'Diem');

    const tcRows = tc.slice(1);

    // =========================
    // 📌 LOAD KPI_LUU_TRU
    // =========================
    const kpiOld = await readSheet('KPI_LUU_TRU');
    const kHeaders = kpiOld?.[0] || [];

    const iK_Thang = getIdx(kHeaders, 'Thang');
    const iK_Ma = getIdx(kHeaders, 'MaNhanSu');

    const kRows = kpiOld?.slice(1) || [];

    // =========================
    // 📌 LỌC NHÂN SỰ TRONG PHÒNG
    // =========================
    const dsPhong = dmRows.filter(
      r => String(r[iPhong]).trim() === phongBan
    );

    const userMap: any = {};

    rows.forEach(r => {
      if (String(r[iThang]).trim() !== thang) return;

      const ma = String(r[iMaNS]).trim();

      const inPhong = dsPhong.find(x => String(x[iMa]).trim() === ma);
      if (!inPhong) return;

      if (!userMap[ma]) {
        userMap[ma] = {
          hoTen: String(r[iHoTen]).trim()
        };
      }
    });

    // =========================
    // 📌 TÍNH KPI + TIÊU CHÍ
    // =========================
    const newRows: any[] = [];

    Object.keys(userMap).forEach(ma => {

      // ❌ tránh trùng
      const exists = kRows.find(r =>
        String(r[iK_Thang]).trim() === thang &&
        String(r[iK_Ma]).trim() === ma
      );
      if (exists) return;

      let tongGiaoQD = 0;
      let tongHTQD = 0;
      let tongCLQD = 0;
      let tongTDQD = 0;

      rows.forEach(r => {
        if (
          String(r[iThang]).trim() !== thang ||
          String(r[iMaNS]).trim() !== ma
        ) return;

        const soGiao = Number(r[iGiao]) || 0;
        const soHT = Number(r[iHT]) || 0;
        const soLoi = Number(r[iLoi]) || 0;
        const soCham = Number(r[iCham]) || 0;

        const heSo = heSoMap[String(r[iMaNV]).trim()] || 0;

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

      // 🔥 TÍNH TIÊU CHÍ
      let tongTieuChi = 0;
      tcRows.forEach(t => {
        if (
          String(t[iTC_Thang]).trim() === thang &&
          String(t[iTC_Ma]).trim() === ma
        ) {
          tongTieuChi += Number(t[iTC_Diem]) || 0;
        }
      });

      const tongDiem = kpi + tongTieuChi;

      newRows.push([
        thang,
        ma,
        userMap[ma].hoTen,
        Number(a.toFixed(4)),
        Number(b.toFixed(4)),
        Number(c.toFixed(4)),
        Number(kpi.toFixed(4)),
        Number(tongDiem.toFixed(4))
      ]);
    });

    // =========================
    // 📌 APPEND
    // =========================
    if (newRows.length > 0) {
      const startRow = kRows.length + 2;
      const range = `A${startRow}:H${startRow + newRows.length - 1}`;
      await updateSheet('KPI_LUU_TRU', range, newRows);
    }

    return res.status(200).json({
      success: true,
      message: `Đã chốt ${newRows.length} nhân sự phòng ${phongBan}`
    });

  } catch (err: any) {
    console.error('ERROR CHOT:', err);
    return res.status(500).json({ error: err.message });
  }
}
