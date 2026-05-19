import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TopNav } from './components/layout/TopNav';
import { ToastHost } from './components/layout/ToastHost';
import { Overview } from './pages/Overview';
import { PolicySimulation } from './pages/PolicySimulation';
import { DataManagement } from './pages/DataManagement';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LmdiDecomposition } from './pages/LmdiDecomposition';
import { DidModel } from './pages/DidModel';
import { GreenCompute } from './pages/GreenCompute';
import { GeoMap } from './pages/GeoMap';
import { AiAssistant } from './pages/AiAssistant';
import { type AuthUser, readAuthUser } from './lib/auth';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

function TitleSync() {
  const location = useLocation();

  useEffect(() => {
    const titleMap: Record<string, string> = {
      '/login': '登录',
      '/register': '用户注册',
      '/overview': '数据概览',
      '/lmdi': 'LMDI分解分析',
      '/did': 'DID模型分析',
      '/green-compute': '绿色算力评估',
      '/simulation': '政策模拟',
      '/policy': '政策模拟',
      '/geo-map': '地理可视化',
      '/ai': 'AI问答',
      '/deepseek': 'AI问答',
      '/data': '数据管理',
      '/data-management': '数据管理',
    };

    const matchedTitle =
      titleMap[location.pathname] ||
      '东数西算碳减排与绿色算力评估系统';

    document.title = `${matchedTitle} - 东数西算碳减排与绿色算力评估系统`;
  }, [location.pathname]);

  return null;
}

function AppLayout() {
  const location = useLocation();
  const [user] = useState<AuthUser | null>(() => readAuthUser());

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin' && location.pathname === '/data') {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div className="relative isolate min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <TitleSync />
      <div
        className="pointer-events-none absolute inset-0 z-0 system-ambient-bg"
        style={{ backgroundImage: `url(${assetUrl('images/data-preview-bg.png')})` }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 system-ambient-tint" />
      <TopNav user={user} />
      <ToastHost />
      <div className="relative z-10 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/lmdi" element={<LmdiDecomposition />} />
          <Route path="/did" element={<DidModel />} />
          <Route path="/green-compute" element={<GreenCompute />} />
          <Route path="/simulation" element={<PolicySimulation />} />
          <Route path="/policy" element={<Navigate to="/simulation" replace />} />
          <Route path="/geo-map" element={<GeoMap />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/deepseek" element={<Navigate to="/ai" replace />} />
          <Route path="/data" element={user.role === 'admin' ? <DataManagement /> : <Navigate to="/overview" replace />} />
          <Route path="/data-management" element={<Navigate to="/data" replace />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
