import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Save,
  Loader2,
  Activity,
  Target,
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Star,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react';

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

// 🔥 parse số an toàn
const toNum = (v: any) => {
  return Number(String(v ?? 0).replace(',', '.'));
};

// 🔥 format 1 số lẻ chuẩn toàn app
const format1 = (v: any) => {
  const num = toNum(v);
  return isNaN(num) ? '0.0' : num.toFixed(1);
};
const getTongDiem = (row: any) => {
  return (
    row?.TongDiem ??
    row?.TONG_DIEM ??
    row?.tongDiem ??
    row?.Tong_Diem ??
    row?.['Tổng điểm'] ??
    row?.KPI ??
    row?.kpi ??
    0
  );
};
type TieuChiItem = {
  id: string;
  tt: string;
  noiDung: string;
  diemToiDa: number;
  isGroup?: boolean;
};

const TIEU_CHI_CHUNG: TieuChiItem[] = [
  {
    id: 'I',
    tt: 'I',
    noiDung: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ, nhiệm vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ, nhiệm vụ',
    diemToiDa: 10,
    isGroup: true
  },
  {
    id: 'I1',
    tt: '1',
    noiDung: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ, nhiệm vụ',
    diemToiDa: 5
  },
  {
    id: 'I2',
    tt: '2',
    noiDung: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ, nhiệm vụ',
    diemToiDa: 5
  },
  {
    id: 'II',
    tt: 'II',
    noiDung: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ, nhiệm vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
    diemToiDa: 10,
    isGroup: true
  },
  {
    id: 'II1',
    tt: '1',
    noiDung: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm',
    diemToiDa: 2.5
  },
  {
    id: 'II2',
    tt: '2',
    noiDung: 'Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất',
    diemToiDa: 2.5
  },
  {
    id: 'II3',
    tt: '3',
    noiDung: 'Tinh thần trách nhiệm trong thực thi công vụ, nhiệm vụ',
    diemToiDa: 2.5
  },
  {
    id: 'II4',
    tt: '4',
    noiDung: 'Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
    diemToiDa: 2.5
  },
  {
    id: 'III',
    tt: 'III',
    noiDung: 'Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ, nhiệm vụ',
    diemToiDa: 10,
    isGroup: true
  },
  {
    id: 'III1',
    tt: '1',
    noiDung: 'Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực, tác động tích cực đến kết quả thực hiện nhiệm vụ của cơ quan, tổ chức, đơn vị',
    diemToiDa: 2.5
  },
  {
    id: 'III2',
    tt: '2',
    noiDung: 'Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, nhiệm vụ có tính chất đột xuất, phức tạp hoặc trong điều kiện khó khăn',
    diemToiDa: 2.5
  },
  {
    id: 'III3',
    tt: '3',
    noiDung: 'Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm khi có sai sót và có biện pháp khắc phục rõ ràng, cụ thể',
    diemToiDa: 2.5
  },
  {
    id: 'III4',
    tt: '4',
    noiDung: 'Chủ động đưa ra quyết định trong phạm vi thẩm quyền, không né tránh; có tinh thần tiên phong trong thực hiện những nhiệm vụ mới',
    diemToiDa: 2.5
  }
];

export default function App() {
  const [nhanSuList, setNhanSuList] = useState<any[]>([]);
  const [thang, setThang] = useState<string>('');
  const [maNhanSu, setMaNhanSu] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  // ===== ĐỔI MẬT KHẨU =====
  const [showChangePass, setShowChangePass] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const currentUser = nhanSuList.find(ns => ns.MaNhanSu === maNhanSu);
  const role = (user?.role || '').toUpperCase();
  const isLanhDao = role === 'LANH_DAO_PHONG';
  const [nhiemVu, setNhiemVu] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [kpiData, setKpiData] = useState<{ a: number, b: number, c: number, kpi: number } | null>(null);
  const [tieuChiData, setTieuChiData] = useState<Record<string, any>>({});
  const [kpiPhuTrachData, setKpiPhuTrachData] = useState<{ a: number, b: number, c: number, d: number, dd: number, e: number, kpi: number } | null>(null);
  const dataABC = isLanhDao ? kpiPhuTrachData : kpiData;

  const [ptInputs, setPtInputs] = useState<{ d: string; dd: string; e: string }>({
    d: '',
    dd: '',
    e: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [conflictKeys, setConflictKeys] = useState<string[]>([]);
  const [conflictInfo, setConflictInfo] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'kpi' | 'tieuchi' | 'tong' | 'thongke'>('kpi');
  const [thongKeData, setThongKeData] = useState<any[]>([]);
  const [diemTieuChi, setDiemTieuChi] = useState<Record<string, string>>({});
  const [tongDiem, setTongDiem] = useState(0);
  const [tongTieuChi, setTongTieuChi] = useState(0);
  const currentYear = new Date().getFullYear();

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
  
  useEffect(() => {
  const u = localStorage.getItem('kpi_user');
  if (u) {
    const parsed = JSON.parse(u);
    setUser(parsed);
    setMaNhanSu(parsed.maNhanSu); // 🔥 tự set luôn nhân sự
  }
}, []);

  useEffect(() => {
    if (thang && maNhanSu) {
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
  
  useEffect(() => {
  if (!thang || !user) return;

  const apiThang = toYYYYMM(thang);

  fetch(`/api/data?action=check-locked&thang=${apiThang}&user=${encodeURIComponent(JSON.stringify(user))}`)
    .then(res => res.json())
    .then(data => {
      setIsLocked(data.locked);
    })
    .catch(() => setIsLocked(false));

}, [thang, user]);

  useEffect(() => {
    if (thang && maNhanSu) {
      const apiThang = toYYYYMM(thang);

      fetch(`/api/kpi-phutrach?thang=${apiThang}&maNhanSu=${maNhanSu}`)
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
        .catch(err => console.error('Lỗi khi tải KPI:', err));
    } else {
      setKpiPhuTrachData(null);
      setPtInputs({ d: '', dd: '', e: '' });
    }
  }, [thang, maNhanSu]);

  useEffect(() => {
    const tongTC = Object.values(diemTieuChi).reduce(
  (sum: number, v: any) => sum + toNum(v),
  0
);

    setTongTieuChi(tongTC);

    const kpi70 = kpiPhuTrachData?.kpi || 0;

    setTongDiem(kpi70 + tongTC);
  }, [diemTieuChi, kpiPhuTrachData]);

  useEffect(() => {
  // 🔐 Không gọi API khi chưa đủ dữ liệu
  if (!thang || !maNhanSu || !user) return;

  let cancelled = false;

  const fetchTieuChi = async () => {
    try {
      const apiThang = toYYYYMM(thang);

      const res = await fetch(
        `/api/data?action=get-tieuchi&thang=${apiThang}&maNhanSu=${maNhanSu}&user=${encodeURIComponent(JSON.stringify(user))}`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const tc = await res.json();

      if (!cancelled) {
        setDiemTieuChi(tc || {});
      }

    } catch (err) {
      console.error('Lỗi tải tiêu chí:', err);

      if (!cancelled) {
        setDiemTieuChi({});
      }
    }
  };

  fetchTieuChi();

  // 🔥 cleanup chuẩn React
  return () => {
    cancelled = true;
  };

}, [thang, maNhanSu, user]);

  useEffect(() => {
  if (activeTab !== 'thongke' || !thang || !user) return;

  const apiThang = toYYYYMM(thang);

  fetch(`/api/data?action=get-thongke&thang=${apiThang}&user=${encodeURIComponent(JSON.stringify(user))}`)
    .then(res => res.json())
    .then(data => {
      setThongKeData(data || []);
    })
    
    .catch(() => {
      setThongKeData([]);
    });
}, [activeTab, thang, user]);
  
  const loadNhiemVu = async (t: string, m: string) => {
    const apiThang = toYYYYMM(t);
    const res = await fetch(`/api/nhiemvu?thang=${apiThang}&maNhanSu=${m}&user=${encodeURIComponent(JSON.stringify(user))}`);
    if (!res.ok) throw new Error('Lỗi khi tải nhiệm vụ');
    const data = await res.json();
    setNhiemVu(data);
    setEdits({});
    setConflictKeys([]);
    setConflictInfo([]);
  };

  const handleThangChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newThang = e.target.value;
    setThang(newThang);
    setSuccessMsg('');
    setError('');
    setEdits({});

    if (!newThang) {
      setNhiemVu([]);
      return;
    }

    if (!maNhanSu) {
      setNhiemVu([]);
      return;
    }

    setLoading(true);

    try {
      await loadNhiemVu(newThang, maNhanSu);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNhanSuChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMa = e.target.value;
    setMaNhanSu(newMa);
    setSuccessMsg('');

    setNhiemVu([]);
    setEdits({});

    if (!thang || !newMa) return;

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

  const handleEdit = (keyNhap: string, field: string, value: string) => {
    setEdits(prev => ({
      ...prev,
      [keyNhap]: {
        ...prev[keyNhap],
        [field]: value
      }
    }));
  };

  const handleLogin = async () => {
  setLoginLoading(true);
  setLoginError('');

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        username: loginForm.username,
        password: loginForm.password
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Đăng nhập thất bại');
    }

    localStorage.setItem('kpi_user', JSON.stringify(data.user));
    setUser(data.user);

    // 🔥 set luôn nhân sự
    setMaNhanSu(data.user.maNhanSu);

  } catch (err: any) {
    setLoginError(err.message);
  } finally {
    setLoginLoading(false);
  }
};
  
  // ===== XỬ LÝ ĐỔI MẬT KHẨU =====
  const handleChangePassword = async () => {
    if (!user) {
      alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      alert('Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu mới.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu mới chưa khớp.');
      return;
    }

    if (newPassword.length < 6) {
      alert('Mật khẩu mới nên có ít nhất 6 ký tự.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          username: user.username,
          oldPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Đổi mật khẩu thất bại');
      }

      alert('Đổi mật khẩu thành công. Từ lần đăng nhập sau, vui lòng dùng mật khẩu mới.');

      setShowChangePass(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePtInputChange = (field: 'd' | 'dd' | 'e', value: string) => {
    setPtInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payloadData = nhiemVu.map(nv => {
        const keyNhap = nv.KeyNhap || nv.KEY_NHAP;
        return {
          KeyNhap: keyNhap,
          SoGiao: Math.max(0, parseFloat(edits[keyNhap]?.SoGiao ?? nv.SoGiao ?? 0) || 0),
          SoHoanThanh: Math.max(0, parseFloat(edits[keyNhap]?.SoHoanThanh ?? nv.SoHoanThanh ?? 0) || 0),
          SoLoiChatLuong: Math.max(0, parseFloat(edits[keyNhap]?.SoLoiChatLuong ?? nv.SoLoiChatLuong ?? 0) || 0),
          SoCham: Math.max(0, parseFloat(edits[keyNhap]?.SoCham ?? nv.SoCham ?? 0) || 0),
          LastUpdated: nv.LastUpdated || nv.LASTUPDATED || ''
        };
      });

      const apiThang = toYYYYMM(thang);
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang: apiThang,
          maNhanSu: maNhanSu,
          data: payloadData,
          user
        })
      });

      const data = await res.json();

      await fetch('/api/save-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang: thang,
          maNhanSu: maNhanSu,
          hoTen: currentUser?.HoTen || '',

          a: data?.a,
          b: data?.b,
          c: data?.c,

          d: isLanhDao ? Number(ptInputs.d) || 0 : 0,
          dd: isLanhDao ? Number(ptInputs.dd) || 0 : 0,
          e: isLanhDao ? Number(ptInputs.e) || 0 : 0,

          kpi: data?.kpi
        })
      });

      if (!res.ok) {
  if (res.status === 409) {
    const keys = data.conflictKeys || [];

    setConflictKeys(keys);

    const conflictedRows = nhiemVu.filter(nv => {
      const key = nv.KeyNhap || nv.KEY_NHAP;
      return keys.includes(key);
    });

    setConflictInfo(conflictedRows);

    setError('Có dữ liệu bị xung đột. Vui lòng kiểm tra các dòng màu đỏ bên dưới.');
    return;
  }

  throw new Error(data.error || 'Lỗi khi lưu dữ liệu');
}

      if (isLanhDao) {
        await fetch('/api/save-phutrach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thang: thang,
            maNhanSu: maNhanSu,
            d: Number(ptInputs.d) || 0,
            dd: Number(ptInputs.dd) || 0,
            e: Number(ptInputs.e) || 0,
            user
          })
        });
      }

      setSuccessMsg('Lưu dữ liệu thành công!');

      setKpiData({
        a: data.a,
        b: data.b,
        c: data.c,
        kpi: data.kpi
      });

      const ptRes = await fetch(`/api/kpi-phutrach?thang=${apiThang}&maNhanSu=${maNhanSu}`);
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
// 🔥 LOAD LẠI DỮ LIỆU (TRÁNH GHI ĐÈ)
await loadNhiemVu(thang, maNhanSu);
      
      setEdits({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChotThang = async () => {
    if (!thang) return;

    if (!confirm(`Chốt tháng ${thang}?`)) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/chot-thang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  thang,
  user
})
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Đã chốt tháng ${thang}`);
      setIsLocked(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetThang = async () => {
    if (!confirm('Reset toàn bộ dữ liệu?')) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/reset-thang', {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccessMsg('Đã reset dữ liệu');

      if (thang && maNhanSu) {
        await loadNhiemVu(thang, maNhanSu);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTieuChi = async () => {
    if (!thang || !maNhanSu) {
      alert('Chọn tháng và nhân sự trước');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = Object.keys(diemTieuChi).map(id => ({
        id,
        diem: parseFloat(diemTieuChi[id]) || 0
      }));

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-tieuchi',
          thang,
          maNhanSu,
          data: payload,
          user
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccessMsg('Đã lưu điểm tiêu chí');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tongDiemTieuChi = Object.keys(diemTieuChi).reduce((sum, key) => {
    return sum + (parseFloat(diemTieuChi[key]) || 0);
  }, 0);

  if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-[360px]">
        <h2 className="text-xl font-bold mb-6 text-center">Đăng nhập KPI</h2>

        {loginError && (
          <div className="text-red-500 text-sm mb-3">{loginError}</div>
        )}

        <input
          type="text"
          placeholder="Tài khoản"
          className="w-full mb-3 px-4 py-2 border rounded-xl"
          value={loginForm.username}
          onChange={(e) =>
            setLoginForm({ ...loginForm, username: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          className="w-full mb-4 px-4 py-2 border rounded-xl"
          value={loginForm.password}
          onChange={(e) =>
            setLoginForm({ ...loginForm, password: e.target.value })
          }
        />

        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold"
        >
          {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
  
  return (
    <>
      {showChangePass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-black text-slate-950">Đổi mật khẩu</h3>
              <p className="text-sm text-slate-500 mt-1">Mật khẩu mới sẽ được lưu bảo mật tại cột PasswordHash.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Mật khẩu cũ</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePass(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-sm font-bold transition"
                  disabled={changingPassword}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-2xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-[280px] flex-col bg-[#111827] text-white border-r border-white/10">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">KPI Center - TTQTTN&MT</h1>
                
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-2">
            <button
              onClick={() => setActiveTab('kpi')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                activeTab === 'kpi'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Target className="w-5 h-5" />
              KPI nhiệm vụ
            </button>

            <button
              onClick={() => setActiveTab('tieuchi')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                activeTab === 'tieuchi'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <FileText className="w-5 h-5" />
              Đánh giá tiêu chí
            </button>

            <button
              onClick={() => setActiveTab('tong')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                activeTab === 'tong'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Award className="w-5 h-5" />
              Tổng điểm
            </button>
            {/* 🔥 THÊM NÚT NÀY NGAY DƯỚI */}
                  <button
                  onClick={() => setActiveTab('thongke')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                  activeTab === 'thongke'
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                <BarChart3 className="w-5 h-5" />
                      Thống kê
            </button>
          </nav>

          <div className="p-4">
            <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Trạng thái</p>
                  <p className="text-xs text-slate-400">Hệ thống đang hoạt động</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full w-[78%] bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-[#f4f7fb]/90 backdrop-blur-xl border-b border-slate-200">
            <div className="px-4 md:px-8 py-4">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
                    <Star className="w-4 h-4" />
                    Dashboard quản lý KPI
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
                    Theo dõi hiệu suất tháng
                  </h2>
               
                </div>

                <div className="flex flex-wrap items-center gap-3">

  {/* tháng */}
  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
    <Calendar className="w-4 h-4 text-indigo-500" />
    <select
      className="bg-transparent outline-none text-sm font-semibold text-slate-700 min-w-[130px]"
      value={thang}
      onChange={handleThangChange}
    >
      <option value="">Chọn tháng...</option>
      {[...Array(12)].map((_, i) => {
        const monthStr = String(i + 1).padStart(2, '0');
        const value = `${monthStr}/${currentYear}`;
        return (
          <option key={value} value={value}>
            Tháng {i + 1}
          </option>
        );
      })}
    </select>
  </div>

  {/* nhân sự */}
  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
    <User className="w-4 h-4 text-indigo-500" />
    <select
      className="bg-transparent outline-none text-sm font-semibold text-slate-700 min-w-[180px] max-w-[260px]"
      value={maNhanSu}
      onChange={handleNhanSuChange}
      disabled={!thang || user?.role === 'CAN_BO'}
    >
      <option value="">Chọn nhân sự...</option>
      {nhanSuList.map((ns, idx) => {
        const ma = ns.MaNhanSu || ns.maNhanSu || ns.MA_NHAN_SU;
        const ten = ns.HoTen || ns.hoTen || ns.HO_TEN || ns.TenNhanSu || ma;
        return (
          <option key={idx} value={ma}>
            {ten}
          </option>
        );
      })}
    </select>
  </div>

  {/* user */}
  <div className="text-sm text-slate-600 font-semibold ml-2 whitespace-nowrap">
    {user?.hoTen} ({user?.phongBan})
  </div>

  {/* đổi mật khẩu */}
  <button
    onClick={() => setShowChangePass(true)}
    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold ml-2"
  >
    Đổi mật khẩu
  </button>

  {/* logout */}
  <button
    onClick={() => {
      localStorage.removeItem('kpi_user');
      setUser(null);
      setMaNhanSu('');
    }}
    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-sm font-semibold ml-2"
  >
    Đăng xuất
  </button>

</div>
</div>

              <div className="mt-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActiveTab('kpi')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                      activeTab === 'kpi'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    KPI
                  </button>
                  <button
                    onClick={() => setActiveTab('tieuchi')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                      activeTab === 'tieuchi'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Đánh giá tiêu chí
                  </button>
                  <button
                    onClick={() => setActiveTab('tong')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                      activeTab === 'tong'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Tổng điểm
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !maNhanSu || nhiemVu.length === 0}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu
                  </button>

                  <button
  onClick={handleChotThang}
  disabled={
    !thang ||
    !isLanhDao ||
    isLocked
  }
  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition ${
    !thang ||
    !isLanhDao ||
    isLocked
      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
      : 'bg-violet-600 hover:bg-violet-500 text-white'
  }`}
>
  <Award className="w-4 h-4" />
  {isLocked ? 'Đã chốt' : 'Chốt'}
</button>

                  <button
                    onClick={handleResetThang}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Reset
                  </button>

                  <button
                    onClick={async () => {
                      if (!thang) {
                        alert('Chọn tháng trước');
                        return;
                      }

                      setLoading(true);
                      setError('');
                      setSuccessMsg('');

                      try {
                        const apiThang = toYYYYMM(thang);

                        const res = await fetch('/api/init-thang', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ thang: apiThang })
                        });

                        const data = await res.json();

                        if (!res.ok) {
                          throw new Error(data.error || 'Lỗi khởi tạo tháng');
                        }

                        setSuccessMsg(data.message || 'Đã khởi tạo tháng');

                        if (maNhanSu) {
                          await loadNhiemVu(thang, maNhanSu);
                        }
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!thang}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition disabled:opacity-50"
                  >
                    <Activity className="w-4 h-4" />
                    Khởi tạo tháng
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 md:px-8 py-6 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm flex items-center shadow-sm">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {activeTab === 'kpi' && dataABC && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-blue-100" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Số lượng (a)</p>
                      <p className="text-3xl font-black text-slate-950 mt-2">{format1(dataABC.a)}</p>
                      <p className="text-xs text-slate-400 mt-1">Tỷ lệ hoàn thành quy đổi</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-emerald-100" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Chất lượng (b)</p>
                      <p className="text-3xl font-black text-slate-950 mt-2">{format1(dataABC.b)}</p>
                      <p className="text-xs text-slate-400 mt-1">Sau khi trừ lỗi chất lượng</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-orange-100" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Tiến độ (c)</p>
                      <p className="text-3xl font-black text-slate-950 mt-2">{format1(dataABC.c)}</p>
                      <p className="text-xs text-slate-400 mt-1">Sau khi trừ số chậm</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
                  <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/15" />
                  <div className="absolute right-10 bottom-0 w-20 h-20 rounded-full bg-white/10" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-100">KPI 70%</p>
                      <p className="text-4xl font-black mt-2">{format1(dataABC.kpi)}</p>
                      <p className="text-xs text-indigo-100 mt-1">Điểm nhiệm vụ tháng</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kpi' && isLanhDao && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-1">d – Kết quả lĩnh vực</p>
                  <p className="text-xs text-slate-400 mb-3">Điểm phụ trách</p>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-center font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    value={ptInputs.d}
                    onChange={(e) => handlePtInputChange('d', e.target.value)}
                  />
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-1">đ – Tổ chức triển khai</p>
                  <p className="text-xs text-slate-400 mb-3">Điểm phụ trách</p>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-center font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    value={ptInputs.dd}
                    onChange={(e) => handlePtInputChange('dd', e.target.value)}
                  />
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-1">e – Đoàn kết nội bộ</p>
                  <p className="text-xs text-slate-400 mb-3">Điểm phụ trách</p>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-center font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    value={ptInputs.e}
                    onChange={(e) => handlePtInputChange('e', e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'kpi' && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Nhập số liệu nhiệm vụ</h2>
                    <p className="text-sm text-slate-500 mt-1">Cập nhật số giao, hoàn thành, lỗi chất lượng và số chậm.</p>
                  </div>
                  <div className="text-xs font-semibold px-3 py-2 rounded-full bg-slate-100 text-slate-600">
                    {nhiemVu.length} nhiệm vụ
                  </div>
                </div>
                {conflictKeys.length > 0 && (
  <div className="mx-6 mt-5 mb-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-rose-700 font-black">
          <AlertCircle className="w-5 h-5" />
          Có {conflictKeys.length} dòng dữ liệu bị xung đột
        </div>
        <p className="text-sm text-rose-600 mt-1">
          Một hoặc nhiều dòng đã được cập nhật ở nơi khác trước khi bạn bấm lưu. Các dòng liên quan được tô đỏ trong bảng.
        </p>
      </div>

      <button
        onClick={async () => {
          await loadNhiemVu(thang, maNhanSu);
        }}
        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-2xl text-sm font-bold"
      >
        Tải lại dữ liệu mới nhất
      </button>
    </div>

    {conflictInfo.length > 0 && (
      <div className="mt-4 bg-white border border-rose-100 rounded-2xl overflow-hidden">
        {conflictInfo.map((row, idx) => {
          const ten = row.TenNhiemVu || row.TEN_NHIEM_VU || row.NhiemVu || row.KeyNhap;
          return (
            <div key={idx} className="px-4 py-3 border-b last:border-b-0 border-rose-100 flex justify-between gap-3">
              <span className="text-sm font-semibold text-slate-800">{ten}</span>
              <span className="text-xs font-bold text-rose-600 whitespace-nowrap">
                Đã thay đổi
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold w-1/3">Tên nhiệm vụ</th>
                        <th className="p-4 font-bold text-center">Số giao</th>
                        <th className="p-4 font-bold text-center">Hoàn thành</th>
                        <th className="p-4 font-bold text-center">Lỗi CL</th>
                        <th className="p-4 font-bold text-center">Số chậm</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-500">
                            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-600" />
                            Đang tải dữ liệu...
                          </td>
                        </tr>
                      ) : nhiemVu.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-3">
                              <FileText className="w-7 h-7 text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-600">
                              Vui lòng chọn tháng và nhân sự để xem nhiệm vụ
                            </p>
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
                            <tr
                              key={keyNhap || idx}
                              title={conflictKeys.includes(keyNhap) ? 'Dòng này đã bị thay đổi ở nơi khác. Vui lòng tải lại dữ liệu.' : ''}
                              className={`transition-colors ${
                                conflictKeys.includes(keyNhap)
                                  ? 'bg-rose-50 border-l-4 border-rose-500'
                                  : 'hover:bg-indigo-50/40'
                               }`}
                            >
                              <td className="p-4">
                                <div className="text-sm text-slate-800 font-bold mb-2 flex items-center gap-2">
                                  <span>{tenNv}</span>
                                  {conflictKeys.includes(keyNhap) && (
                                  <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                    Conflict
                                  </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-500 min-w-[44px] text-right">
                                    {progress.toFixed(0)}%
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-center align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-900 text-center font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                  value={editSoGiao ?? ''}
                                  onChange={(e) => handleEdit(keyNhap, 'SoGiao', e.target.value)}
                                />
                              </td>

                              <td className="p-4 text-center align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-900 text-center font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                  value={editSoHoanThanh ?? ''}
                                  onChange={(e) => handleEdit(keyNhap, 'SoHoanThanh', e.target.value)}
                                />
                              </td>

                              <td className="p-4 text-center align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  className={`w-24 border rounded-2xl px-3 py-2 text-sm text-center font-bold focus:outline-none transition-all ${
                                    hasError
                                      ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-4 focus:ring-rose-100 focus:border-rose-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500'
                                  }`}
                                  value={editSoLoi ?? ''}
                                  onChange={(e) => handleEdit(keyNhap, 'SoLoiChatLuong', e.target.value)}
                                />
                              </td>

                              <td className="p-4 text-center align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  className={`w-24 border rounded-2xl px-3 py-2 text-sm text-center font-bold focus:outline-none transition-all ${
                                    hasLate
                                      ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-4 focus:ring-orange-100 focus:border-orange-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500'
                                  }`}
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
            )}

            {activeTab === 'tieuchi' && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      Kết quả theo dõi - đánh giá theo tiêu chí chung
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Tổng điểm tiêu chí chung tối đa 30 điểm.
                    </p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black">
                    {format1(tongDiemTieuChi)} / 30
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs">
                        <th className="p-4 font-bold">TT</th>
                        <th className="p-4 font-bold">Tiêu chí</th>
                        <th className="p-4 font-bold text-center">Điểm tối đa</th>
                        <th className="p-4 font-bold text-center">Điểm tự chấm</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {TIEU_CHI_CHUNG.map(tc => (
                        <tr key={tc.id} className={tc.isGroup ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-4 text-center font-bold text-slate-600">{tc.tt}</td>

                          <td className={`p-4 ${tc.isGroup ? 'font-black text-slate-950' : 'pl-8 text-slate-700 font-medium'}`}>
                            {tc.noiDung}
                          </td>

                          <td className="p-4 text-center font-bold text-slate-700">{tc.diemToiDa}</td>

                          <td className="p-4 text-center">
                            {!tc.isGroup && (
                              <input
                                type="number"
                                min="0"
                                max={tc.diemToiDa}
                                step="0.5"
                                className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-center font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                                value={diemTieuChi[tc.id] ?? ''}
                                onChange={(e) =>
                                  setDiemTieuChi(prev => ({
                                    ...prev,
                                    [tc.id]: e.target.value
                                  }))
                                }
                              />
                            )}
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-slate-950 text-white">
                        <td className="p-4 text-center font-semibold"></td>
                        <td className="p-4 font-black">Tổng cộng</td>
                        <td className="p-4 text-center font-black">30</td>
                        <td className="p-4 text-center">
                          <div className="text-xl font-black text-emerald-300">
                            {format1(tongDiemTieuChi)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-5 flex justify-end bg-slate-50 border-t border-slate-200">
                  <button
                    onClick={handleSaveTieuChi}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu tiêu chí
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tong' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">KPI nhiệm vụ (70%)</p>
                    <p className="text-3xl font-black text-slate-950 mt-2">
                      {format1(kpiPhuTrachData?.kpi)}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">Tiêu chí chung</p>
                    <p className="text-3xl font-black text-slate-950 mt-2">
                      {format1(tongTieuChi)}
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
                    <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/15" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-bold text-indigo-100">Tổng điểm (100)</p>
                      <p className="text-4xl font-black mt-2">
                        {format1(tongDiem)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950 mb-4">Hoạt động tổng hợp</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">KPI nhiệm vụ được lấy từ dữ liệu tháng đang chọn.</p>
                        <p className="text-xs text-slate-500 mt-1">Dữ liệu cập nhật sau khi lưu số liệu nhiệm vụ.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Tiêu chí chung được cộng từ các mục tự chấm.</p>
                        <p className="text-xs text-slate-500 mt-1">Tối đa 30 điểm theo bảng tiêu chí.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-violet-100 flex items-center justify-center">
                        <Award className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Tổng điểm = KPI nhiệm vụ + tiêu chí chung.</p>
                        <p className="text-xs text-slate-500 mt-1">Hiển thị theo dữ liệu hiện tại trên giao diện.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* 🔥 CHÈN NGAY TẠI ĐÂY */}
            {activeTab === 'thongke' && (
              <div className="p-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950 mb-4">
                    📊 Bảng xếp hạng phòng ({user?.phongBan})
                  </h2>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-2">#</th>
                        <th>Họ tên</th>
                        <th className="text-right">Tổng điểm</th>
                      </tr>
                    </thead>

                    <tbody>
                      {thongKeData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="py-2 font-bold">{idx + 1}</td>
                          <td>{row.HoTen}</td>
                          <td className="text-right font-bold text-indigo-600">
                            {format1(getTongDiem(row))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {thongKeData.length === 0 && (
                    <div className="text-center text-slate-400 py-6">
                      Không có dữ liệu
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
