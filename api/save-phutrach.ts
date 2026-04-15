import { readSheet, updateSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, d, dd, e } = req.body;

  // Chuẩn hóa MM/YYYY
  if (thang && thang.includes('-')) {
    const [yyyy, mm] = thang.split('-');
    thang = `${mm}/${yyyy}`;
  }

  try {

    // =============================
    // 1. LƯU NHAP_DIEM_PHU_TRACH
    // =============================
    const ptData = await readSheet('NHAP_DIEM_PHU_TRACH');
    const headers = ptData[0];

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iD = idx('d');
    const iDD = idx('đ') !== -1 ? idx('đ') : idx('dd');
    const iE = idx('e');

    let foundIndex = ptData.findIndex((r: any[], i: number) =>
      i > 0 && String(r[iThang]).trim() === String(thang).trim()
    );

    if (foundIndex !== -1) {
      // UPDATE
      const row = [...ptData[foundIndex]];
      row[iD] = d;
      row[iDD] = dd;
      row[iE] = e;

      const rowNumber = foundIndex + 1;
      const range = `A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;
      await updateSheet('NHAP_DIEM_PHU_TRACH', range, [row]);
    } else {
      // ADD NEW
      const newRow = new Array(headers.length).fill('');
      newRow[iThang] = thang;
      newRow[iD] = d;
      newRow[iDD] = dd;
      newRow[iE] = e;

      const nextRow = ptData.length + 1;
      const range = `A${nextRow}:${String.fromCharCode(65 + headers.length - 1)}${nextRow}`;
      await updateSheet('NHAP_DIEM_PHU_TRACH', range, [newRow]);
    }

    // =============================
    // 2. TÍNH a, b, c (GIỐNG kpi-phutrach)
    // =============================
    const qdv = await readSheet('QDV');
    const qHeaders = qdv[0];
    const iMaNV_Q = qHeaders.findIndex(h => h.toLowerCase().includes('manhiemvu'));
    const iHS_Q = qHeaders.findIndex(h => h.toLowerCase().includes('quydoi'));

    const heSoMap: any = {};
    qdv.slice(1).forEach(r => {
      heSoMap[r[iMaNV_Q]] = parseFloat(r[iHS_Q]) || 0;
    });

    const nl = await readSheet('NHAP_LIEU');
    const nlHeaders = nl[0];

    const idxNL = (name: string) =>
      nlHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThangNL = idxNL('Thang');
    const iMaNV = idxNL('MaNhiemVu');
    const iGiao = idxNL('SoGiao');
    const iHT = idxNL('SoHoanThanh');
    const iLoi = idxNL('SoLoiChatLuong');
    const iCham = idxNL('SoCham');

    let tongGiaoQD = 0;
    let tongHTQD = 0;
    let tongCLQD = 0;
    let tongTDQD = 0;

    nl.slice(1).forEach(r => {
      if (String(r[iThangNL]).trim() !== String(thang).trim()) return;

      const heSo = heSoMap[r[iMaNV]] || 0;

      const giao = Number(r[iGiao]) || 0;
      const ht = Number(r[iHT]) || 0;
      const loi = Number(r[iLoi]) || 0;
      const cham = Number(r[iCham]) || 0;

      if (giao <= 0) return;

      const giaoQD = giao * heSo;
      const htQD = ht * heSo;

      let clQD = htQD - loi * heSo * 0.25;
      if (clQD < 0) clQD = 0;

      let tdQD = htQD - cham * heSo * 0.25;
      if (tdQD < 0) tdQD = 0;

      tongGiaoQD += giaoQD;
      tongHTQD += htQD;
      tongCLQD += clQD;
      tongTDQD += tdQD;
    });

    const a = tongGiaoQD === 0 ? 0 : (tongHTQD / tongGiaoQD) * 100;
    const b = tongGiaoQD === 0 ? 0 : (tongCLQD / tongGiaoQD) * 100;
    const c = tongGiaoQD === 0 ? 0 : (tongTDQD / tongGiaoQD) * 100;

    const kpi = ((a + b + c + d + dd + e) / 6) * 70 / 100;

    // =============================
    // 3. GHI KQ_PHU_TRACH
    // =============================
    const kq = await readSheet('KQ_PHU_TRACH');
    const kqHeaders = kq[0];

    const idxKQ = (name: string) =>
      kqHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThangKQ = idxKQ('Thang');
    const iA = idxKQ('a');
    const iB = idxKQ('b');
    const iC = idxKQ('c');
    const iDkq = idxKQ('d');
    const iDDkq = idxKQ('đ') !== -1 ? idxKQ('đ') : idxKQ('dd');
    const iEkq = idxKQ('e');
    const iKPI = idxKQ('kpi');

    let foundKQ = kq.findIndex((r: any[], i: number) =>
      i > 0 && String(r[iThangKQ]).trim() === String(thang).trim()
    );

    const newRow = new Array(kqHeaders.length).fill('');
    newRow[iThangKQ] = thang;
    newRow[iA] = a;
    newRow[iB] = b;
    newRow[iC] = c;
    newRow[iDkq] = d;
    newRow[iDDkq] = dd;
    newRow[iEkq] = e;
    newRow[iKPI] = kpi;

    if (foundKQ !== -1) {
      const rowNumber = foundKQ + 1;
      const range = `A${rowNumber}:${String.fromCharCode(65 + kqHeaders.length - 1)}${rowNumber}`;
      await updateSheet('KQ_PHU_TRACH', range, [newRow]);
    } else {
      const nextRow = kq.length + 1;
      const range = `A${nextRow}:${String.fromCharCode(65 + kqHeaders.length - 1)}${nextRow}`;
      await updateSheet('KQ_PHU_TRACH', range, [newRow]);
    }

    return res.status(200).json({
      success: true,
      a,
      b,
      c,
      d,
      dd,
      e,
      kpi
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
