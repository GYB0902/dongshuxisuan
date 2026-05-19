import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { notify } from '../lib/actions';
import { ToastHost } from '../components/layout/ToastHost';
import { apiLoginUser, demoAccounts, type AuthRole, writeAuthUser } from '../lib/auth';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

const backgroundSlides = [
  {
    image: assetUrl('images/login-bg-grassland-datacenter.png'),
    title: '内蒙古枢纽节点',
    subtitle: '风光绿电、数据中心与绿色算力协同监测',
  },
  {
    image: assetUrl('images/login-bg-green-compute-hall.png'),
    title: '绿色算力基础设施',
    subtitle: 'PUE、算力规模与能效水平统一追踪',
  },
  {
    image: assetUrl('images/login-bg-energy-cloud.png'),
    title: '碳减排评估体系',
    subtitle: 'LMDI、DID 与政策模拟联动分析',
  },
];

const roleConfig = {
  user: {
    title: '用户登录',
    subtitle: '查看数据概览、绿色算力评估、LMDI 与 DID 分析结果',
    badge: '业务用户',
    redirect: '/overview',
    icon: UserCircle2,
  },
  admin: {
    title: '管理员登录',
    subtitle: '进入数据管理、指标同步、模型运行与系统配置入口',
    badge: '系统管理员',
    redirect: '/data',
    icon: ShieldCheck,
  },
};

export function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<AuthRole>('user');
  const [username, setUsername] = useState(demoAccounts.user.username);
  const [password, setPassword] = useState(demoAccounts.user.password);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeRole = roleConfig[role];
  const ActiveIcon = activeRole.icon;
  const demoAccount = role === 'admin' ? demoAccounts.admin : demoAccounts.user;

  useEffect(() => {
    document.title = '登录 - 东数西算碳减排与绿色算力评估系统';
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % backgroundSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const switchRole = (nextRole: AuthRole) => {
    setRole(nextRole);
    setUsername(nextRole === 'admin' ? demoAccounts.admin.username : demoAccounts.user.username);
    setPassword(nextRole === 'admin' ? demoAccounts.admin.password : demoAccounts.user.password);
    notify(`已切换为${roleConfig[nextRole].title}`);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!username.trim() || !password.trim()) {
      notify('请输入账号和密码', 'error');
      return;
    }

    const normalizedName = username.trim();
    const normalizedPassword = password.trim();

    try {
      setIsSubmitting(true);
      const user = await apiLoginUser({
        role,
        username: normalizedName,
        password: normalizedPassword,
      });

      writeAuthUser(user);
      navigate(roleConfig[user.role].redirect, { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : '登录失败，请检查账号和后端服务', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-slate-900">
      <ToastHost />

      <div className="absolute inset-0">
        {backgroundSlides.map((slide, index) => {
          const active = index === activeSlide;

          return (
            <div
              key={slide.image}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out ${
                active ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                transform: active ? 'translateX(0) scale(1.02)' : 'translateX(1.5rem) scale(1.06)',
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.76)_42%,rgba(255,255,255,0.34)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.9),transparent_34%),radial-gradient(circle_at_82%_82%,rgba(16,185,129,0.22),transparent_30%)]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-5 md:px-8 md:py-6">
        <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_390px]">
          <section className="hidden max-w-[680px] lg:block">
            <div className="inline-flex rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-black text-emerald-700 shadow-sm backdrop-blur-xl">
              内蒙古枢纽 · 绿色算力 · 碳减排评估
            </div>
            <h1 className="mt-6 text-[44px] font-black leading-[1.08] text-slate-950 xl:text-5xl">
              <span className="block">东数西算碳减排</span>
              <span className="block">绿色算力评估系统</span>
            </h1>
            <div className="mt-5 max-w-[610px] space-y-2 text-base leading-7 text-slate-600">
              <p>
                聚焦内蒙古枢纽节点，整合数据概览、LMDI 分解、DID 模型、绿色算力评估与政策模拟。
              </p>
              <p className="text-sm leading-6 text-slate-500">
                碳排放、绿电占比、PUE 与政策效果在同一套监测视图中联动呈现。
              </p>
            </div>

            <div className="mt-10 flex items-center gap-3">
              {backgroundSlides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeSlide ? 'w-10 bg-slate-950' : 'w-2.5 bg-slate-400/60 hover:bg-slate-500'
                  }`}
                  aria-label={`切换背景：${slide.title}`}
                />
              ))}
            </div>
            <div className="mt-4 text-sm font-black text-slate-800">{backgroundSlides[activeSlide].title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{backgroundSlides[activeSlide].subtitle}</div>
          </section>

          <section className="mx-auto w-full max-w-[390px] rounded-[34px] border border-white/65 bg-white/30 p-2 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-3xl">
            <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="mb-5 rounded-[24px] border border-white/80 bg-white/62 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-emerald-600 text-white shadow-[0_14px_28px_rgba(5,150,105,0.24)]">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-black text-emerald-700">绿色算力监测平台</div>
                    <h2 className="mt-1 text-2xl font-black leading-tight text-emerald-700">{activeRole.title}</h2>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{activeRole.subtitle}</p>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-slate-200/80 bg-slate-100/70 p-1">
                {(['user', 'admin'] as AuthRole[]).map((item) => {
                  const itemConfig = roleConfig[item];
                  const Icon = itemConfig.icon;
                  const active = item === role;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => switchRole(item)}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition-all ${
                        active
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {itemConfig.badge}
                    </button>
                  );
                })}
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="flex items-center justify-between rounded-full border border-emerald-100 bg-emerald-50/75 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ActiveIcon className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-black text-emerald-800">{activeRole.badge}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {demoAccount.username} / {demoAccount.password}
                  </span>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">登录账号</span>
                  <div className="relative">
                    <UserCircle2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full rounded-[18px] border border-slate-200/80 bg-white/82 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/80"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">登录密码</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-[18px] border border-slate-200/80 bg-white/82 py-3.5 pl-12 pr-12 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/80"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? '登录中...' : `进入${activeRole.badge}界面`}
                  <ArrowRight className="h-5 w-5" />
                </button>

                <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500">没有账号？</span>
                  <Link to="/register" className="font-black text-emerald-700 transition-colors hover:text-emerald-800">
                    注册新账号
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
