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

  // YYYY-MM -> MM/YYYY
  if (thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // =====================================================
    // HELPER
    // =====================================================

    const getIdx = (arr: any[], name: string) =>
      arr.findIndex(
        h => String(h).trim().toLowerCase() === name.toLowerCase()
      );

    // =====================================================
    // LOAD DM_NHAN_SU
    // =====================================================

    const dm = await readSheet('DM_NHAN_SU');

    const dmHeaders = dm[0];
    const dmRows = dm.slice(1);

    const iDM_Ma = getIdx(dmHeaders, 'MaNhanSu');
    const iDM_Ten = getIdx(dmHeaders, 'HoTen');
    const iDM_Phong = getIdx(dmHeaders, 'Phong');
    const iDM_Role = getIdx(dmHeaders, 'VaiTro');

    const currentUser = dmRows.find(
      r => String(r[iDM_Ma]).trim() === String(user.maNhanSu).trim()
    );

    if (!currentUser) {
      return res.status(403).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    const role = String(currentUser[iDM_Role]).trim();
    const phongBan = String(currentUser[iDM_Phong]).trim();

    if (
      role !== 'TRUONG_PHONG' &&
      role !== 'PHO_PHONG'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ lãnh đạo được chốt'
      });
    }

    // =====================================================
    // LOAD NHAP_LIEU
    // =====================================================

    const data = await readSheet('NHAP_LIEU');

    const headers = data[0];
    const rows = data.slice(1);

    const idx = (name: string) =>
      headers.findIndex(
        h => String(h).trim().toLowerCase() === name.toLowerCase()
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

    const iQ_Ma = qHeaders.findIndex((h: any) =>
  String(h).trim().toLowerCase().includes('manhiemvu')
);

const iQ_HS = qHeaders.findIndex((h: any) =>
  String(h).trim().toLowerCase().includes('quydoi')
);

    const heSoMap: any = {};

    qdv.slice(1).forEach(r => {

      const ma = String(r[iQ_Ma]).trim();

      heSoMap[ma] = Number(r[iQ_HS]) || 0;

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
    // LOAD NHAP_DIEM_PHU_TRACH
    // =====================================================

    const pt = await readSheet('NHAP_DIEM_PHU_TRACH');

    const ptHeaders = pt[0];
    const ptRows = pt.slice(1);

    const iPT_Thang = getIdx(ptHeaders, 'Thang');
    const iPT_Ma = getIdx(ptHeaders, 'MaNhanSu');

    const iPT_d = getIdx(ptHeaders, 'd');
    const iPT_dd = getIdx(ptHeaders, 'dd');
    const iPT_e = getIdx(ptHeaders, 'e');

    // =====================================================
    // LOAD KPI_LUU_TRU
    // =====================================================

    const kpiSheet = await readSheet('KPI_LUU_TRU');

    const kHeaders = kpiSheet[0];
    const kRows = kpiSheet.slice(1);

    const iK_Thang = getIdx(kHeaders, 'Thang');
    const iK_Ma = getIdx(kHeaders, 'MaNhanSu');

    // =====================================================
    // DS PHÒNG
    // =====================================================

    const dsPhong = dmRows.filter(
      r => String(r[iDM_Phong]).trim() === phongBan
    );

    // =====================================================
    // NEW ROWS
    // =====================================================

    const newRows: any[] = [];

    dsPhong.forEach(nv => {

      const ma = String(nv[iDM_Ma]).trim();
      const hoTen = String(nv[iDM_Ten]).trim();
      const vaiTro = String(nv[iDM_Role]).trim();

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

        const hs = heSoMap[maNV] || 0;

        const giaoQD = soGiao * hs;
        const htQD = soHT * hs;

        let clQD = htQD - soLoi * hs * 0.25;
        if (clQD < 0) clQD = 0;

        let tdQD = htQD - soCham * hs * 0.25;
        if (tdQD < 0) tdQD = 0;

        tongGiaoQD += giaoQD;
        tongHTQD += htQD;
        tongCLQD += clQD;
        tongTDQD += tdQD;

      });

      // =================================================
      // KPI ABC
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
      // PHỤ TRÁCH
      // =================================================

      let d = 0;
      let dd = 0;
      let e = 0;

      if (
        vaiTro === 'TRUONG_PHONG' ||
        vaiTro === 'PHO_PHONG'
      ) {

        const ptRow = ptRows.find(
          r =>
            String(r[iPT_Thang]).trim() === thang &&
            String(r[iPT_Ma]).trim() === ma
        );

        if (ptRow) {

          d = Number(ptRow[iPT_d]) || 0;
          dd = Number(ptRow[iPT_dd]) || 0;
          e = Number(ptRow[iPT_e]) || 0;

        }

      }

      // =================================================
      // KPI
      // =================================================

      let kpi = 0;

      if (
        vaiTro === 'TRUONG_PHONG' ||
        vaiTro === 'PHO_PHONG'
      ) {

        kpi =
          ((a + b + c + d + dd + e) / 6) *
          70 / 100;

      } else {

        kpi =
          ((a + b + c) / 3) *
          70 / 100;

      }

      // =================================================
      // TIÊU CHÍ
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
      // TỔNG
      // =================================================

      const tongDiem = kpi + tongTieuChi;

      // =================================================
      // PUSH
      // =================================================

      newRows.push([

        thang,
        ma,
        hoTen,

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
    // GHI SHEET
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
