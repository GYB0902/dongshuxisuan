import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Cloud, LogOut, Moon, Search, Settings, Sun, UserCircle2 } from 'lucide-react';
import { notify, type ToastType } from '../../lib/actions';
import { cn } from '../../lib/utils';

type TopNavUser = {
  role: 'user' | 'admin';
  name: string;
  level: string;
};

type TopNavProps = {
  user: TopNavUser;
};

type ThemePreference = 'light' | 'dark';
type ToastEvent = CustomEvent<{ message: string; type?: ToastType }>;
type SystemNotification = {
  id: string;
  message: string;
  type: ToastType;
  time: string;
};

const initialNotifications: SystemNotification[] = [
  { id: 'initial-pue', message: '乌兰察布节点 PUE 已降至 1.14', type: 'success', time: '系统' },
  { id: 'initial-green-compute', message: '绿色算力评估数据已同步到 2025 年', type: 'success', time: '系统' },
  { id: 'initial-did', message: 'DID 模型报告可在分析页导出', type: 'success', time: '系统' },
];

function notificationTime() {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function applyThemePreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = preference;
}

export function TopNav({ user }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>(initialNotifications);
  const [themePreference, setThemePreference] = useState<ThemePreference>('light');
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

  useEffect(() => {
    applyThemePreference(themePreference);

    return () => {
      applyThemePreference('light');
    };
  }, [themePreference]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as ToastEvent).detail;
      const message = detail?.message?.trim();

      if (!message) return;

      const nextNotification: SystemNotification = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        type: detail.type ?? 'success',
        time: notificationTime(),
      };

      setNotifications((items) => [nextNotification, ...items].slice(0, 5));
      setUnreadCount((count) => (showNotifications ? 0 : Math.min(count + 1, 6)));
    };

    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, [showNotifications]);

  const navLinks = useMemo(() => {
    const links = [
      { name: '数据概览', path: '/overview', keywords: ['概览', '首页', 'dashboard'] },
      { name: 'LMDI分解', path: '/lmdi', keywords: ['lmdi', '分解'] },
      { name: 'DID模型', path: '/did', keywords: ['did', '模型', '因果'] },
      { name: '绿色算力', path: '/green-compute', keywords: ['绿色', '算力', 'pue'] },
      { name: '政策模拟', path: '/simulation', keywords: ['政策', '模拟', 'scenario'] },
      { name: '地理可视化', path: '/geo-map', keywords: ['地图', '地理', '可视化'] },
      { name: 'AI问答', path: '/ai', keywords: ['ai', '问答', '助手'] },
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
    navigate('/login', { replace: true });
  };

  const toggleTheme = () => {
    const nextTheme = themePreference === 'dark' ? 'light' : 'dark';
    setThemePreference(nextTheme);
  };

  const ThemeIcon = themePreference === 'dark' ? Moon : Sun;
  const themeLabel = themePreference === 'dark' ? '深色模式' : '浅色模式';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between px-3 md:px-5">
        <Link to="/overview" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Cloud className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-slate-900 md:text-sm">
              东数西算碳减排与绿色算力评估系统
            </div>
            <div className="text-[9px] font-medium text-slate-500">
              内蒙古枢纽节点综合监测平台
            </div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 px-4 xl:flex">
          {navLinks.map((link) => {
            const active =
              location.pathname === link.path ||
              (link.path !== '/overview' && location.pathname.startsWith(link.path));

            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
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

        <div className="flex items-center gap-2">
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-40 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="搜索模块..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500 lg:block">
            {currentTime}
          </div>
          <div
            className="relative"
            onMouseEnter={() => {
              setShowNotifications(true);
              setUnreadCount(0);
            }}
            onMouseLeave={() => setShowNotifications(false)}
          >
            <button
              type="button"
              onFocus={() => {
                setShowNotifications(true);
                setUnreadCount(0);
              }}
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="查看通知"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
                  {unreadCount > 5 ? '5+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <>
                <div className="absolute right-0 top-8 h-3 w-80" />
                <div className="absolute right-0 top-11 w-80 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500">系统通知</div>
                    <div className="text-[10px] font-bold text-slate-400">最近 {notifications.length} 条</div>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {notifications.map((item) => (
                      <div key={item.id} className="rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50">
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                              item.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-xs font-bold leading-5 text-slate-700">{item.message}</div>
                            <div className="mt-0.5 text-[10px] font-medium text-slate-400">{item.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {notifications.length === 0 && (
                    <div className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs font-bold text-slate-400">
                      暂无系统通知
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="group relative">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label={themeLabel}
              title={themeLabel}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              {themeLabel}
            </div>
          </div>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                navigate('/data');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="打开设置"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 md:flex">
            <UserCircle2 className="h-4 w-4 text-emerald-600" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-slate-900">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.level}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-1.5 xl:hidden">
        {navLinks.map((link) => {
          const active =
            location.pathname === link.path ||
            (link.path !== '/overview' && location.pathname.startsWith(link.path));

          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors',
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
