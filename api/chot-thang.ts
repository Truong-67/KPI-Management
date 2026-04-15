import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.body;

  if (!thang) {
    return res.status(400).json({ error: 'Missing thang' });
  }

  // YYYY-MM → MM/YYYY (đồng bộ toàn hệ thống)
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    if (!data || data.length <= 1) {
      return res.status(200).json({ success: true, message: 'Không có dữ liệu NHAP_LIEU' });
    }

    const headers = data[0];
    const rows = data
      .slice(1)
      .filter((row: any[]) => row.length > 0 && row.some((cell: any) => String(cell).trim() !== ''));

    const idx = (name: string) =>
      headers.findIndex((h: string) => h.toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iHoTen = idx('HoTen');
    const iMaNV = idx('MaNhiemVu');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    // Đọc hệ số từ QDV
    const qdv = await readSheet('QDV');
    if (!qdv || qdv.length <= 1) {
      return res.status(200).json({ success: true, message: 'Không có dữ liệu QDV' });
    }

    const qHeaders = qdv[0];
    const iMaNV_Q = qHeaders.findIndex((h: string) => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex((h: string) => h.toLowerCase().includes('quydoi'));

    const heSoMap: Record<string, number> = {};
    qdv.slice(1).forEach((r: any[]) => {
      heSoMap[String(r[iMaNV_Q]).trim()] = parseFloat(r[iHS_Q]) || 0;
    });

    // Lấy danh sách nhân sự có dữ liệu trong tháng
    const userMap: Record<string, { hoTen: string }> = {};
    rows.forEach((r: any[]) => {
      if (String(r[iThang]).trim() !== String(thang).trim()) return;

      const ma = String(r[iMaNS] ?? '').trim();
      const ten = String(r[iHoTen] ?? '').trim();

      if (!ma) return;
      if (!userMap[ma]) {
        userMap[ma] = { hoTen: ten };
      }
    });

    const output: any[] = [];

    Object.keys(userMap).forEach((maNhanSu) => {
      let tongGiaoQD = 0;
      let tongHTQD = 0;
      let tongCLQD = 0;
      let tongTDQD = 0;

      rows.forEach((r: any[]) => {
        if (
          String(r[iThang]).trim() !== String(thang).trim() ||
          String(r[iMaNS]).trim() !== String(maNhanSu).trim()
        ) return;

        const soGiao = Number(r[iGiao]) || 0;
        const soHT = Number(r[iHT]) || 0;
        const soLoi = Number(r[iLoi]) || 0;
        const soCham = Number(r[iCham]) || 0;

        const maNhiemVu = String(r[iMaNV] ?? '').trim();
        const heSo = heSoMap[maNhiemVu] || 0;

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

      output.push([
        thang,
        maNhanSu,
        userMap[maNhanSu].hoTen,
        Number(a.toFixed(8)),
        Number(b.toFixed(8)),
        Number(c.toFixed(8)),
        Number(kpi.toFixed(8))
      ]);
    });

    if (output.length > 0) {
      await writeSheet('KPI_LUU_TRU', output);
    }

    return res.status(200).json({
      success: true,
      message: `Đã chốt tháng ${thang} cho ${output.length} nhân sự`
    });
  } catch (err: any) {
    console.error('ERROR chot-thang:', err);
    return res.status(500).json({ error: err.message });
  }
}
