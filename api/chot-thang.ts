import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  let { thang, user } = req.body;

  if (!thang || !user) {
    return res.status(400).json({
      success: false,
      error: 'Missing thang or user'
    });
  }

  // YYYY-MM → MM/YYYY
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // =====================================================
    // HELPER
    // =====================================================
    const getIdx = (arr: any[], name: string) =>
      arr.findIndex(h =>
        String(h).trim().toLowerCase() === name.toLowerCase()
      );

    // =====================================================
    // LOAD DM_NHAN_SU
    // =====================================================
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
      return res.status(403).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    const role = String(currentUser[iRole]).trim();
    const phongBan = String(currentUser[iPhong]).trim();

    // Chỉ lãnh đạo được chốt
    if (
      role !== 'TRUONG_PHONG' &&
      role !== 'PHO_PHONG'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ lãnh đạo phòng được chốt'
      });
    }

    // =====================================================
    // LOAD NHAP_LIEU
    // =====================================================
    const data = await readSheet('NHAP_LIEU');

    const headers = data[0];
    const rows = data.slice(1);

    const idx = (name: string) =>
      headers.findIndex(h =>
        String(h).trim().toLowerCase() === name.toLowerCase()
      );

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iHoTen = idx('HoTen');
    const iMaNV = idx('MaNhiemVu');

    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // =====================================================
    // LOAD QDV
    // =====================================================
    const qdv = await readSheet('QDV');

    const qHeaders = qdv[0];

    const iMaNV_Q = getIdx(qHeaders, 'MaNhiemVu');
    const iHS_Q = getIdx(qHeaders, 'QuyDoi');

    const heSoMap: any = {};

    qdv.slice(1).forEach(r => {

      const maNV = String(r[iMaNV_Q]).trim();

      heSoMap[maNV] = Number(r[iHS_Q]) || 0;

    });

    // =====================================================
    // LOAD TIÊU CHÍ CHUNG
    // =====================================================
    const tc = await readSheet('TIEU_CHI_CHUNG');

    const tcHeaders = tc[0];
    const tcRows = tc.slice(1);

    const iTC_Thang = getIdx(tcHeaders, 'Thang');
    const iTC_Ma = getIdx(tcHeaders, 'MaNhanSu');
    const iTC_Diem = getIdx(tcHeaders, 'Diem');

    // =====================================================
    // LOAD KPI_LUU_TRU
    // =====================================================
    const kpiOld = await readSheet('KPI_LUU_TRU');

    const kHeaders = kpiOld[0];
    const kRows = kpiOld.slice(1);

    const iK_Thang = getIdx(kHeaders, 'Thang');
    const iK_Ma = getIdx(kHeaders, 'MaNhanSu');

    // =====================================================
    // NHÂN SỰ TRONG PHÒNG
    // =====================================================
    const dsPhong = dmRows.filter(
      r => String(r[iPhong]).trim() === phongBan
    );

    // =====================================================
    // TẠO USER MAP
    // =====================================================
    const userMap: any = {};

    rows.forEach(r => {

      if (String(r[iThang]).trim() !== thang) return;

      const ma = String(r[iMaNS]).trim();

      const inPhong = dsPhong.find(
        x => String(x[iMa]).trim() === ma
      );

      if (!inPhong) return;

      if (!userMap[ma]) {

        userMap[ma] = {
          hoTen: String(r[iHoTen]).trim()
        };

      }

    });

    // =====================================================
    // TÍNH KPI
    // =====================================================
    const newRows: any[] = [];

    Object.keys(userMap).forEach(ma => {

      // =================================================
      // TRÁNH CHỐT TRÙNG
      // =================================================
      const exists = kRows.find(r =>
        String(r[iK_Thang]).trim() === thang &&
        String(r[iK_Ma]).trim() === ma
      );

      if (exists) return;

      let tongGiaoQD = 0;
      let tongHTQD = 0;
      let tongCLQD = 0;
      let tongTDQD = 0;

      // =================================================
      // QUÉT NHẬP LIỆU
      // =================================================
      rows.forEach(r => {

        if (
          String(r[iThang]).trim() !== thang ||
          String(r[iMaNS]).trim() !== ma
        ) return;

        const soGiao = Number(r[iGiao]) || 0;
        const soHT = Number(r[iHT]) || 0;
        const soLoi = Number(r[iLoi]) || 0;
        const soCham = Number(r[iCham]) || 0;

        const maNV = String(r[iMaNV]).trim();

        const heSo = heSoMap[maNV] || 0;

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

      // =================================================
      // KPI A B C
      // =================================================
      const a =
        tongGiaoQD === 0
          ? 0
          : (tongHTQD / tongGiaoQD) * 100;

      const b =
        tongGiaoQD === 0
          ? 0
          : (tongCLQD / tongGiaoQD) * 100;

      const c =
        tongGiaoQD === 0
          ? 0
          : (tongTDQD / tongGiaoQD) * 100;

      // =================================================
      // ROLE
      // =================================================
      const userInfo = dsPhong.find(
        x => String(x[iMa]).trim() === ma
      );

      const userRole = String(userInfo?.[iRole] || '').trim();

      let d = 0;
      let dd = 0;
      let e = 0;

      let kpi = 0;

      // =================================================
      // KPI LÃNH ĐẠO
      // =================================================
      if (
        userRole === 'TRUONG_PHONG' ||
        userRole === 'PHO_PHONG'
      ) {

        d = 100;
        dd = 100;
        e = 100;

        kpi =
          ((a + b + c + d + dd + e) / 6) *
          70 / 100;

      } else {

        kpi =
          ((a + b + c) / 3) *
          70 / 100;

      }

      // =================================================
      // TIÊU CHÍ CHUNG
      // =================================================
      let tongTieuChi = 0;

      tcRows.forEach(t => {

        if (
          String(t[iTC_Thang]).trim() === thang &&
          String(t[iTC_Ma]).trim() === ma
        ) {

          tongTieuChi += Number(t[iTC_Diem]) || 0;

        }

      });

      // =================================================
      // TỔNG ĐIỂM
      // =================================================
      const tongDiem = kpi + tongTieuChi;

      // =================================================
      // PUSH
      // =================================================
      newRows.push([

        thang,
        ma,
        userMap[ma].hoTen,

        Number(a.toFixed(4)),
        Number(b.toFixed(4)),
        Number(c.toFixed(4)),

        Number(kpi.toFixed(4)),
        Number(tongDiem.toFixed(4)),

        'DA_CHOT',

        d,
        dd,
        e

      ]);

    });

    // =====================================================
    // APPEND KPI_LUU_TRU
    // =====================================================
    if (newRows.length > 0) {

      const startRow = kRows.length + 2;

      const range =
        `A${startRow}:L${startRow + newRows.length - 1}`;

      await updateSheet(
        'KPI_LUU_TRU',
        range,
        newRows
      );

    }

    // =====================================================
    // SUCCESS
    // =====================================================
    return res.status(200).json({

      success: true,

      message:
        `Đã chốt ${newRows.length} nhân sự phòng ${phongBan}`

    });

  } catch (err: any) {

    console.error('ERROR CHOT:', err);

    return res.status(500).json({

      success: false,

      error: String(err?.message || err)

    });

  }

}
