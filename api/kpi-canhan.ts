import { readSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang, maNhanSu } = req.query;

  // Convert MM/YYYY -> YYYY-MM
  if (thang && thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    const data = await readSheet('NHAP_LIEU');
    if (!data || data.length <= 1) {
      return res.status(200).json({ a: 0, b: 0, c: 0, kpi: 0 });
    }

    const headers = data[0];
    const rows = data.slice(1).filter(r => r && r.length > 0);

    const idx = (name: string) =>
      headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iThang = idx('Thang');
    const iMaNS = idx('MaNhanSu');
    const iA = idx('DiemSoLuong');
    const iB = idx('DiemChatLuong');
    const iC = idx('DiemTienDo');

    let sumA = 0, sumB = 0, sumC = 0, count = 0;

    rows.forEach(r => {
      if (r[iThang] === thang && r[iMaNS] === maNhanSu) {
        const a = parseFloat(r[iA]) || 0;
        const b = parseFloat(r[iB]) || 0;
        const c = parseFloat(r[iC]) || 0;

        sumA += a;
        sumB += b;
        sumC += c;
        count++;
      }
    });

    const avgA = count ? sumA / count : 0;
    const avgB = count ? sumB / count : 0;
    const avgC = count ? sumC / count : 0;

    const kpi = count ? ((avgA + avgB + avgC) / 3) * 70 / 100 : 0;

    return res.status(200).json({
      a: avgA,
      b: avgB,
      c: avgC,
      kpi
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
