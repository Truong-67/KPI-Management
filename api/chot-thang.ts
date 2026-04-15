import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.body;

  if (!thang) {
    return res.status(400).json({ error: 'Missing thang' });
  }

  try {
    const data = await readSheet('NHAP_LIEU');

    if (!data || data.length <= 1) {
      return res.status(200).json({ success: true, message: 'Không có dữ liệu' });
    }

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

    const rows = data
      .slice(1)
      .filter((r: any[]) => r.length > 0 && r.some(c => c !== ''));

    const map: any = {};

    // =========================
    // GOM DỮ LIỆU THEO NHÂN SỰ
    // =========================
    rows.forEach(r => {
      if (String(r[iThang]).trim() !== String(thang).trim()) return;

      const ma = r[iMaNS];
      const ten = r[iHoTen];

      if (!ma) return;

      if (!map[ma]) {
        map[ma] = {
          HoTen: ten,
          giao: 0,
          ht: 0,
          count: 0,
          tongB: 0,
          tongC: 0
        };
      }

      const soGiao = Number(r[iGiao]) || 0;
      const soHT = Number(r[iHT]) || 0;
      const soLoi = Number(r[iLoi]) || 0;
      const soCham = Number(r[iCham]) || 0;

      map[ma].giao += soGiao;
      map[ma].ht += soHT;

      // ===== TÍNH B (CHẤT LƯỢNG) =====
      let b_nv = 100 - soLoi * 25;
      if (b_nv < 0) b_nv = 0;

      // ===== TÍNH C (TIẾN ĐỘ) =====
      let c_nv = 100 - soCham * 25;
      if (c_nv < 0) c_nv = 0;

      map[ma].tongB += b_nv;
      map[ma].tongC += c_nv;
      map[ma].count += 1;
    });

    // =========================
    // TÍNH KPI
    // =========================
    const output: any[] = [];

    Object.keys(map).forEach(ma => {
      const d = map[ma];

      const a = d.giao === 0 ? 0 : (d.ht / d.giao) * 100;

      const b = d.count === 0 ? 0 : d.tongB / d.count;
      const c = d.count === 0 ? 0 : d.tongC / d.count;

      const kpi = ((a + b + c) / 3) * 0.7;

      output.push([
        thang,
        ma,
        d.HoTen,
        Number(a.toFixed(2)),
        Number(b.toFixed(2)),
        Number(c.toFixed(2)),
        Number(kpi.toFixed(2))
      ]);
    });

    // =========================
    // GHI KẾT QUẢ
    // =========================
    if (output.length > 0) {
      await writeSheet('KPI_LUU_TRU', output);
    }

    return res.status(200).json({
      success: true,
      message: `Đã chốt KPI tháng ${thang} (${output.length} nhân sự)`
    });

  } catch (err: any) {
    console.error('ERROR chot-thang:', err);
    return res.status(500).json({ error: err.message });
  }
}
