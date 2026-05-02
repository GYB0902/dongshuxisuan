import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Cloud, LogOut, Search, Settings, UserCircle2 } from 'lucide-react';
import { notify } from '../../lib/actions';
import { cn } from '../../lib/utils';

type TopNavUser = {
  role: 'user' | 'admin';
  name: string;
  level: string;
};

type TopNavProps = {
  user: TopNavUser;
};

export function TopNav({ user }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const navLinks = useMemo(() => {
    const links = [
      { name: '数据概览', path: '/overview', keywords: ['概览', '首页', 'dashboard'] },
      { name: 'LMDI分解', path: '/lmdi', keywords: ['lmdi', '分解'] },
      { name: 'DID模型', path: '/did', keywords: ['did', '模型', '因果'] },
      { name: '绿色算力', path: '/green-compute', keywords: ['绿色', '算力', 'pue'] },
      { name: '政策模拟', path: '/simulation', keywords: ['政策', '模拟', 'scenario'] },
      { name: '地理可视化', path: '/geo-map', keywords: ['地图', '地理', '可视化'] },
    ];

    if (user.role === 'admin') {
      links.push({ name: '数据管理', path: '/data', keywords: ['数据', '管理', '上传'] });
    }

    return links;
  }, [user.role]);

  const handleSearch = () => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      notify('请输入要查找的模块名称');
      return;
    }

    const matched = navLinks.find((link) =>
      [link.name, ...link.keywords].some((item) => item.toLowerCase().includes(keyword) || keyword.includes(item.toLowerCase())),
    );

    if (!matched) {
      notify(`未找到「${searchText}」对应模块`);
      return;
    }

    navigate(matched.path);
    notify(`已跳转到${matched.name}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('dongshu-user');
    notify('已退出登录');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-6">
        <Link to="/overview" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-900 md:text-base">
              东数西算碳减排与绿色算力评估系统
            </div>
            <div className="text-[10px] font-medium text-slate-500">
              内蒙古枢纽节点综合监测平台
            </div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 px-6 xl:flex">
          {navLinks.map((link) => {
            const active =
              location.pathname === link.path ||
              (link.path !== '/overview' && location.pathname.startsWith(link.path));

            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-48 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="搜索模块..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 lg:block">
            {currentTime}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="查看通知"
            >
              <Bell className="h-4 w-4" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-11 w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
                <div className="mb-2 text-xs font-bold text-slate-500">系统通知</div>
                {[
                  '乌兰察布节点 PUE 已降至 1.14',
                  '绿色算力评估数据已同步到 2024 年',
                  'DID 模型报告可在分析页导出',
                ].map((item) => (
                  <div key={item} className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                navigate('/data');
                notify('已打开数据管理页');
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="打开设置"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 md:flex">
            <UserCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-slate-900">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.level}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 xl:hidden">
        {navLinks.map((link) => {
          const active =
            location.pathname === link.path ||
            (link.path !== '/overview' && location.pathname.startsWith(link.path));

          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
