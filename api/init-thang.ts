import { readSheet, writeSheet } from './_sheets.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { thang } = req.body;
  if (!thang) {
    return res.status(400).json({ error: 'Missing thang' });
  }

  // Convert "MM/YYYY" to "YYYY-MM"
  if (thang.includes('/')) {
    const [mm, yyyy] = thang.split('/');
    thang = `${yyyy}-${mm}`;
  }

  try {
    const nhapLieuData = await readSheet('NHAP_LIEU');
    const nhapLieuHeaders = nhapLieuData[0] || [];
    
    const hasDataForThang = nhapLieuData.slice(1).some((row: any[]) => {
      const thangIdx = nhapLieuHeaders.findIndex((h: string) => h.toLowerCase() === 'thang');
      return thangIdx !== -1 && String(row[thangIdx]) === String(thang);
    });

    if (hasDataForThang) {
      return res.status(200).json({ message: 'Dữ liệu tháng này đã tồn tại' });
    }

    const phanCongData = await readSheet('PHAN_CONG_NHIEM_VU');
    if (!phanCongData || phanCongData.length <= 1) {
      return res.status(404).json({ error: 'Không có dữ liệu trong PHAN_CONG_NHIEM_VU' });
    }

    const pcHeaders = phanCongData[0];
    const pcRows = phanCongData.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell !== ''));

    const newRows = pcRows.map((row: any[]) => {
      const newRow = new Array(nhapLieuHeaders.length).fill('');
      
      nhapLieuHeaders.forEach((nlHeader: string, idx: number) => {
        if (nlHeader.toLowerCase() === 'thang') {
          newRow[idx] = thang;
        } else if (nlHeader.toLowerCase() === 'keynhap') {
           const maNsIdx = pcHeaders.findIndex((h: string) => h.toLowerCase() === 'manhansu' || h.toLowerCase() === 'ma_nhan_su');
           const maNvIdx = pcHeaders.findIndex((h: string) => h.toLowerCase() === 'manhiemvu' || h.toLowerCase() === 'ma_nhiem_vu');
           const maNs = maNsIdx !== -1 ? row[maNsIdx] : '';
           const maNv = maNvIdx !== -1 ? row[maNvIdx] : '';
           newRow[idx] = `${thang}_${maNs}_${maNv}`;
        } else {
          const pcIdx = pcHeaders.findIndex((h: string) => h === nlHeader);
          if (pcIdx !== -1) {
            newRow[idx] = row[pcIdx] || '';
          }
        }
      });
      return newRow;
    });

    if (newRows.length > 0) {
      await writeSheet('NHAP_LIEU', newRows);
    }

    return res.status(200).json({ success: true, message: `Đã khởi tạo ${newRows.length} nhiệm vụ cho tháng ${thang}` });
  } catch (error: any) {
    console.error('Error init-thang:', error);
    return res.status(500).json({ error: error.message });
  }
}
