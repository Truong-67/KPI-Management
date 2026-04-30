import { readSheet, appendRow, updateRow } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { thang, maNhanSu, hoTen, a, b, c, d, dd, e, kpi } = req.body;

    if (!thang || !maNhanSu) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // chuẩn hóa tháng
    if (thang.includes('-')) {
      const [yyyy, mm] = thang.split('-');
      thang = `${mm}/${yyyy}`;
    }

    const data = await readSheet('KPI_LUU_TRU');
    const headers = data[0];
    const rows = data.slice(1);

    const iThang = headers.findIndex(h => h.toLowerCase() === 'thang');
    const iMaNS = headers.findIndex(h => h.toLowerCase() === 'manhansu');

    let foundIndex = -1;

    rows.forEach((r, idx) => {
      if (
        String(r[iThang]).trim() === thang &&
        String(r[iMaNS]).trim() === maNhanSu
      ) {
        foundIndex = idx;
      }
    });

    const newRow = [
      thang,
      maNhanSu,
      hoTen,
      a, b, c,
      d, dd, e,
      kpi
    ];

    if (foundIndex !== -1) {
      // 🔁 UPDATE dòng cũ
      const rowNumber = foundIndex + 2;

      const range = `A${rowNumber}:J${rowNumber}`;

      await updateRow('KPI_LUU_TRU', range, [newRow]);

    } else {
      // ➕ THÊM mới (KHÔNG động vào header)
      await appendRow('KPI_LUU_TRU', newRow);
    }

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
