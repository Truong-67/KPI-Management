import React, { useState, useEffect } from 'react';
import { Calendar, User, Save, Loader2, Activity, Target, CheckCircle, Clock, Award, AlertCircle, CheckCircle2, Star, Shield, FileText } from 'lucide-react';

// Helper functions for date conversion
const toYYYYMM = (thangUI: string) => {
  if (!thangUI) return '';
  const [mm, yyyy] = thangUI.split('/');
  return `${yyyy}-${mm}`;
};

const toMMYYYY = (thangAPI: string) => {
  if (!thangAPI) return '';
  const [yyyy, mm] = thangAPI.split('-');
  return `${mm}/${yyyy}`;
};

const PHU_TRACH_VALUE = 'PHU_TRACH';

export default function App() {
  const [nhanSuList, setNhanSuList] = useState<any[]>([]);
  const [thang, setThang] = useState<string>(''); // Stores "MM/YYYY"
  const [maNhanSu, setMaNhanSu] = useState<string>('');
  
  const [nhiemVu, setNhiemVu] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [kpiData, setKpiData] = useState<{a: number, b: number, c: number, kpi: number} | null>(null);
  const [kpiPhuTrachData, setKpiPhuTrachData] = useState<{a: number, b: number, c: number, d: number, dd: number, e: number, kpi: number} | null>(null);

  const [ptInputs, setPtInputs] = useState<{ d: string; dd: string; e: string }>({
    d: '',
    dd: '',
    e: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const isPhuTrachMode = maNhanSu === PHU_TRACH_VALUE;

  // 1. Load danh sách nhân sự khi khởi tạo
  useEffect(() => {
    const fetchNhanSu = async () => {
      try {
        const res = await fetch('/api/nhansu');
        if (!res.ok) throw new Error('Lỗi khi tải danh sách nhân sự');
        const data = await res.json();
        setNhanSuList(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchNhanSu();
  }, []);

  // Fetch KPI cá nhân khi chọn tháng và nhân sự
  useEffect(() => {
    if (thang && maNhanSu && maNhanSu !== PHU_TRACH_VALUE) {
      const apiThang = toYYYYMM(thang);
      fetch(`/api/kpi-canhan?thang=${apiThang}&maNhanSu=${maNhanSu}`)
        .then(res => res.json())
        .then(data => {
          setKpiData({
            a: data.a || 0,
            b: data.b || 0,
            c: data.c || 0,
            kpi: data.kpi || 0
          });
        })
        .catch(err => console.error('Lỗi khi tải KPI cá nhân:', err));
    } else {
      setKpiData(null);
    }
  }, [thang, maNhanSu]);

  // Fetch KPI phụ trách khi chọn tháng
  useEffect(() => {
    if (thang) {
      const apiThang = toYYYYMM(thang);
      fetch(`/api/kpi-phutrach?thang=${apiThang}`)
        .then(res => res.json())
        .then(data => {
          const mapped = {
            a: data.a || 0,
            b: data.b || 0,
            c: data.c || 0,
            d: data.d || 0,
            dd: data.dd || 0,
            e: data.e || 0,
            kpi: data.kpi || 0
          };

          setKpiPhuTrachData(mapped);

          setPtInputs({
            d: String(mapped.d ?? 0),
            dd: String(mapped.dd ?? 0),
            e: String(mapped.e ?? 0)
          });
        })
        .catch(err => console.error('Lỗi khi tải KPI phụ trách:', err));
    } else {
      setKpiPhuTrachData(null);
      setPtInputs({ d: '', dd: '', e: '' });
    }
  }, [thang]);

  const loadNhiemVu = async (t: string, m: string) => {
    const apiThang = toYYYYMM(t);
    const res = await fetch(`/api/nhiemvu?thang=${apiThang}&maNhanSu=${m}`);
    if (!res.ok) throw new Error('Lỗi khi tải nhiệm vụ');
    const data = await res.json();
    setNhiemVu(data);
    setEdits({});
  };

  // 2. Khi chọn tháng -> gọi init-thang
  const handleThangChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newThang = e.target.value;
    setThang(newThang);
    setSuccessMsg('');
    
    if (!newThang) {
      setNhiemVu([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Gọi init-thang trước
      const apiThang = toYYYYMM(newThang);
      const initRes = await fetch('/api/init-thang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thang: apiThang })
      });
      
      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Lỗi khi khởi tạo tháng');
      }

      // Nếu đã chọn nhân sự từ trước, load lại nhiệm vụ
      if (maNhanSu && maNhanSu !== PHU_TRACH_VALUE) {
        await loadNhiemVu(newThang, maNhanSu);
      } else {
        setNhiemVu([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Khi chọn nhân sự -> load nhiệm vụ
  const handleNhanSuChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newMa = e.target.value;
  setMaNhanSu(newMa);
  setSuccessMsg('');

  // luôn reset bảng trước
  setNhiemVu([]);

  if (!thang || !newMa) return;

  // 👉 nếu là PHỤ TRÁCH → KHÔNG load nhiệm vụ (đúng logic)
  if (newMa === PHU_TRACH_VALUE) return;

  setLoading(true);
  setError('');

  try {
    await loadNhiemVu(thang, newMa);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // 4. Cho phép nhập số liệu
  const handleEdit = (keyNhap: string, field: string, value: string) => {
    setEdits(prev => ({
      ...prev,
      [keyNhap]: {
        ...prev[keyNhap],
        [field]: value
      }
    }));
  };

  const handlePtInputChange = (field: 'd' | 'dd' | 'e', value: string) => {
    setPtInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 5. Lưu lại -> gọi API save
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    if (isPhuTrachMode) {
      try {
        const apiThang = toYYYYMM(thang).includes('-')
          ? (() => {
              const [yyyy, mm] = toYYYYMM(thang).split('-');
              return `${mm}/${yyyy}`;
            })()
          : thang;

        const res = await fetch('/api/save-phutrach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thang: apiThang,
            d: Math.max(0, parseFloat(ptInputs.d || '0') || 0),
            dd: Math.max(0, parseFloat(ptInputs.dd || '0') || 0),
            e: Math.max(0, parseFloat(ptInputs.e || '0') || 0)
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Lỗi khi lưu dữ liệu phụ trách');
        }

        setSuccessMsg('Lưu dữ liệu phụ trách thành công!');

        setKpiPhuTrachData({
          a: data.a || 0,
          b: data.b || 0,
          c: data.c || 0,
          d: data.d || 0,
          dd: data.dd || 0,
          e: data.e || 0,
          kpi: data.kpi || 0
        });

        setPtInputs({
          d: String(data.d ?? 0),
          dd: String(data.dd ?? 0),
          e: String(data.e ?? 0)
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }
    
    try {
      const payloadData = nhiemVu.map(nv => {
        const keyNhap = nv.KeyNhap || nv.KEY_NHAP;
        return {
          KeyNhap: keyNhap,
          SoGiao: Math.max(0, parseFloat(edits[keyNhap]?.SoGiao ?? nv.SoGiao ?? 0) || 0),
          SoHoanThanh: Math.max(0, parseFloat(edits[keyNhap]?.SoHoanThanh ?? nv.SoHoanThanh ?? 0) || 0),
          SoLoiChatLuong: Math.max(0, parseFloat(edits[keyNhap]?.SoLoiChatLuong ?? nv.SoLoiChatLuong ?? 0) || 0),
          SoCham: Math.max(0, parseFloat(edits[keyNhap]?.SoCham ?? nv.SoCham ?? 0) || 0)
        };
      });

      const apiThang = toYYYYMM(thang);
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang: apiThang,
          maNhanSu: maNhanSu,
          data: payloadData
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi lưu dữ liệu');
      }

      setSuccessMsg('Lưu dữ liệu thành công!');
      
      // Cập nhật lại KPI cá nhân
      setKpiData({
        a: data.a,
        b: data.b,
        c: data.c,
        kpi: data.kpi
      });

      // Gọi lại API KPI phụ trách để cập nhật
      const ptRes = await fetch(`/api/kpi-phutrach?thang=${apiThang}`);
      if (ptRes.ok) {
        const ptData = await ptRes.json();
        setKpiPhuTrachData({
          a: ptData.a || 0,
          b: ptData.b || 0,
          c: ptData.c || 0,
          d: ptData.d || 0,
          dd: ptData.dd || 0,
          e: ptData.e || 0,
          kpi: ptData.kpi || 0
        });

        setPtInputs({
          d: String(ptData.d ?? 0),
          dd: String(ptData.dd ?? 0),
          e: String(ptData.e ?? 0)
        });
      }
      
      // Xóa edits sau khi lưu thành công
      setEdits({});
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">KPI Management</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                className="bg-transparent border-none outline-none text-sm text-white appearance-none pr-4 cursor-pointer" 
                value={thang} 
                onChange={handleThangChange}
              >
                <option value="" className="bg-slate-800">Chọn tháng...</option>
                {[...Array(12)].map((_, i) => {
                  const monthStr = String(i + 1).padStart(2, '0');
                  const value = `${monthStr}/${currentYear}`;
                  return (
                    <option key={value} value={value} className="bg-slate-800">Tháng {i + 1}</option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                className="bg-transparent border-none outline-none text-sm text-white appearance-none pr-4 cursor-pointer max-w-[200px] truncate" 
                value={maNhanSu} 
                onChange={handleNhanSuChange}
                disabled={!thang}
              >
                <option value="" className="bg-slate-800">Chọn nhân sự...</option>
                {[
                  ...nhanSuList,
                  { MaNhanSu: PHU_TRACH_VALUE, HoTen: 'Phụ trách phòng' }
                ].map((ns, idx) => {
                  const ma = ns.MaNhanSu || ns.maNhanSu || ns.MA_NHAN_SU;
                  const ten = ns.HoTen || ns.hoTen || ns.HO_TEN || ns.TenNhanSu || ma;
                  return (
                    <option key={idx} value={ma} className="bg-slate-800">{ten}</option>
                  );
                })}
              </select>
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving || !maNhanSu || (!isPhuTrachMode && nhiemVu.length === 0)} 
              className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Lưu dữ liệu
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl text-sm flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* KPI Cards */}
        {kpiData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card a */}
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/10 border border-blue-800/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Target className="w-16 h-16 text-blue-400" />
              </div>
              <p className="text-blue-300 text-sm font-medium mb-1 relative z-10">Số lượng (a)</p>
              <p className="text-3xl font-bold text-white relative z-10">{kpiData.a.toFixed(2)}</p>
            </div>
            {/* Card b */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/10 border border-emerald-800/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </div>
              <p className="text-emerald-300 text-sm font-medium mb-1 relative z-10">Chất lượng (b)</p>
              <p className="text-3xl font-bold text-white relative z-10">{kpiData.b.toFixed(2)}</p>
            </div>
            {/* Card c */}
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/10 border border-orange-800/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Clock className="w-16 h-16 text-orange-400" />
              </div>
              <p className="text-orange-300 text-sm font-medium mb-1 relative z-10">Tiến độ (c)</p>
              <p className="text-3xl font-bold text-white relative z-10">{kpiData.c.toFixed(2)}</p>
            </div>
            {/* Card KPI */}
            <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/20 border border-purple-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Award className="w-16 h-16 text-purple-400" />
              </div>
              <p className="text-purple-300 text-sm font-medium mb-1 relative z-10">KPI 70%</p>
              <p className="text-4xl font-bold text-white relative z-10">{kpiData.kpi.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* KPI Phụ Trách */}
        {kpiPhuTrachData && (
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 px-1">
              <Award className="w-5 h-5 text-purple-400" />
              KPI Phụ Trách Toàn Phòng
            </h2>
            
            {/* Hàng 1: a, b, c */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/10 border border-blue-800/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Target className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-blue-300 text-xs font-medium mb-1 relative z-10">PT a (Số lượng)</p>
                <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.a.toFixed(2)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/10 border border-emerald-800/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
                <p className="text-emerald-300 text-xs font-medium mb-1 relative z-10">PT b (Chất lượng)</p>
                <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.b.toFixed(2)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/10 border border-orange-800/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Clock className="w-12 h-12 text-orange-400" />
                </div>
                <p className="text-orange-300 text-xs font-medium mb-1 relative z-10">PT c (Tiến độ)</p>
                <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.c.toFixed(2)}</p>
              </div>
            </div>

            {/* Hàng 2: d, đ, e, KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-fuchsia-900/40 to-fuchsia-800/10 border border-fuchsia-800/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Star className="w-10 h-10 text-fuchsia-400" />
                </div>
                <p className="text-fuchsia-300 text-xs font-medium mb-1 relative z-10">PT d</p>
                {isPhuTrachMode ? (
                  <input
                    type="number"
                    min="0"
                    className="w-24 bg-slate-800 border border-fuchsia-700/50 rounded-lg px-3 py-2 text-xl font-bold text-white relative z-10 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400"
                    value={ptInputs.d}
                    onChange={(e) => handlePtInputChange('d', e.target.value)}
                  />
                ) : (
                  <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.d.toFixed(2)}</p>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/10 border border-cyan-800/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Shield className="w-10 h-10 text-cyan-400" />
                </div>
                <p className="text-cyan-300 text-xs font-medium mb-1 relative z-10">PT đ</p>
                {isPhuTrachMode ? (
                  <input
                    type="number"
                    min="0"
                    className="w-24 bg-slate-800 border border-cyan-700/50 rounded-lg px-3 py-2 text-xl font-bold text-white relative z-10 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    value={ptInputs.dd}
                    onChange={(e) => handlePtInputChange('dd', e.target.value)}
                  />
                ) : (
                  <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.dd.toFixed(2)}</p>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/20 border border-slate-700/50 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-400 text-xs font-medium mb-1 relative z-10">PT e</p>
                {isPhuTrachMode ? (
                  <input
                    type="number"
                    min="0"
                    className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xl font-bold text-white relative z-10 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    value={ptInputs.e}
                    onChange={(e) => handlePtInputChange('e', e.target.value)}
                  />
                ) : (
                  <p className="text-2xl font-bold text-white relative z-10">{kpiPhuTrachData.e.toFixed(2)}</p>
                )}
              </div>
              
              <div className="col-span-2 bg-gradient-to-br from-purple-900/60 to-purple-800/20 border border-purple-700/50 rounded-xl p-4 shadow-lg relative overflow-hidden group flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Award className="w-14 h-14 text-purple-400" />
                </div>
                <p className="text-purple-300 text-sm font-medium mb-1 relative z-10">KPI Phụ Trách</p>
                <p className="text-3xl font-bold text-white relative z-10">{kpiPhuTrachData.kpi.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/80">
            <h2 className="text-lg font-semibold text-white">Nhập số liệu nhiệm vụ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium w-1/3">Tên nhiệm vụ</th>
                  <th className="p-4 font-medium text-center">Số giao</th>
                  <th className="p-4 font-medium text-center">Hoàn thành</th>
                  <th className="p-4 font-medium text-center">Lỗi CL</th>
                  <th className="p-4 font-medium text-center">Số chậm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : nhiemVu.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                      Vui lòng chọn tháng và nhân sự để xem nhiệm vụ
                    </td>
                  </tr>
                ) : (
                  nhiemVu.map((nv, idx) => {
                    const keyNhap = nv.KeyNhap || nv.KEY_NHAP;
                    const tenNv = nv.TenNhiemVu || nv.TEN_NHIEM_VU || nv.NhiemVu;
                    
                    const editSoGiao = edits[keyNhap]?.SoGiao ?? nv.SoGiao;
                    const editSoHoanThanh = edits[keyNhap]?.SoHoanThanh ?? nv.SoHoanThanh;
                    const editSoLoi = edits[keyNhap]?.SoLoiChatLuong ?? nv.SoLoiChatLuong;
                    const editSoCham = edits[keyNhap]?.SoCham ?? nv.SoCham;

                    const soGiaoNum = Math.max(0, parseFloat(editSoGiao) || 0);
                    const soHoanThanhNum = Math.max(0, parseFloat(editSoHoanThanh) || 0);
                    const soLoiNum = Math.max(0, parseFloat(editSoLoi) || 0);
                    const soChamNum = Math.max(0, parseFloat(editSoCham) || 0);
                    
                    const progress = soGiaoNum > 0 ? Math.min(100, (soHoanThanhNum / soGiaoNum) * 100) : 0;
                    const hasError = soLoiNum > 0;
                    const hasLate = soChamNum > 0;

                    return (
                      <tr key={keyNhap || idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="text-sm text-slate-200 font-medium mb-2">{tenNv}</div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="p-4 text-center align-middle">
                          <input
                            type="number"
                            min="0"
                            className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            value={editSoGiao ?? ''}
                            onChange={(e) => handleEdit(keyNhap, 'SoGiao', e.target.value)}
                          />
                        </td>
                        <td className="p-4 text-center align-middle">
                          <input
                            type="number"
                            min="0"
                            className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            value={editSoHoanThanh ?? ''}
                            onChange={(e) => handleEdit(keyNhap, 'SoHoanThanh', e.target.value)}
                          />
                        </td>
                        <td className="p-4 text-center align-middle">
                          <input
                            type="number"
                            min="0"
                            className={`w-20 bg-slate-800 border rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none transition-all ${hasError ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-500/5' : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
                            value={editSoLoi ?? ''}
                            onChange={(e) => handleEdit(keyNhap, 'SoLoiChatLuong', e.target.value)}
                          />
                        </td>
                        <td className="p-4 text-center align-middle">
                          <input
                            type="number"
                            min="0"
                            className={`w-20 bg-slate-800 border rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none transition-all ${hasLate ? 'border-orange-500/50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-orange-500/5' : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
                            value={editSoCham ?? ''}
                            onChange={(e) => handleEdit(keyNhap, 'SoCham', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
