import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { thang } = req.body;

  try {
    const data = await readSheet('NHAP_LIEU');
    const headers = data[0];

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iHoTen = idx('HoTen');
    const iGiao = idx('SoGiao');
    const iHT = idx('SoHoanThanh');
    const iLoi = idx('SoLoiChatLuong');
    const iCham = idx('SoCham');

    const rows = data.slice(1);

    const map: any = {};

    rows.forEach(r => {
      if (String(r[iThang]) !== thang) return;

      const ma = r[iMaNS];
      const ten = r[iHoTen];

      if (!map[ma]) {
        map[ma] = {
          HoTen: ten,
          giao: 0,
          ht: 0,
          loi: 0,
          cham: 0
        };
      }

      map[ma].giao += Number(r[iGiao]) || 0;
      map[ma].ht += Number(r[iHT]) || 0;
      map[ma].loi += Number(r[iLoi]) || 0;
      map[ma].cham += Number(r[iCham]) || 0;
    });

    const output: any[] = [];

    Object.keys(map).forEach(ma => {
      const d = map[ma];

      const a = d.giao === 0 ? 0 : (d.ht / d.giao) * 100;
      const b = 100 - d.loi * 25;
      const c = 100 - d.cham * 25;

      const kpi = ((a + b + c) / 3) * 0.7;

      output.push([
        thang,
        ma,
        d.HoTen,
        a,
        b,
        c,
        kpi
      ]);
    });

    await writeSheet('KPI_LUU_TRU', output);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
