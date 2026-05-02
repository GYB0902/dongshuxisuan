import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Cloud,
  Database,
  Leaf,
  Lock,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { notify } from '../lib/actions';
import { ToastHost } from '../components/layout/ToastHost';
import { apiLoginUser, demoAccounts, type AuthRole, writeAuthUser } from '../lib/auth';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeRole = roleConfig[role];
  const ActiveIcon = activeRole.icon;

  useEffect(() => {
    document.title = '登录 - 东数西算碳减排与绿色算力评估系统';
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
      notify('请输入账号和密码');
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
      notify(`已登录：${user.name}`);
      navigate(roleConfig[user.role].redirect, { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : '登录失败，请检查账号和后端服务');
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoAccount = role === 'admin' ? demoAccounts.admin : demoAccounts.user;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 font-sans text-slate-900">
      <ToastHost />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #e2e8f0 1px, transparent 0)',
          backgroundSize: '30px 30px',
          opacity: 0.65,
        }}
      />

      <main className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex min-h-[560px] flex-col justify-between border-r border-slate-200 bg-emerald-50 p-8 text-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-black">东数西算碳减排平台</div>
                <div className="text-xs text-slate-500">内蒙古枢纽节点综合监测</div>
              </div>
            </div>

            <div className="mt-10">
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                绿色算力评估 · 碳排放监测 · 政策模拟
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                东数西算碳减排与绿色算力评估系统
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                面向内蒙古枢纽节点，统一展示碳排放趋势、绿色算力指数、LMDI 分解、DID 政策效应和地理可视化结果。
              </p>
            </div>

          </div>

          <div className="grid gap-3 text-sm">
            {[
              { icon: BarChart3, label: '用户端', text: '数据概览、模型分析、绿色算力、地图可视化' },
              { icon: Database, label: '管理员端', text: '数据上传、指标同步、模型报告、系统维护' },
              { icon: Leaf, label: '评估方法', text: 'LMDI + DID + GCI 综合绿色算力评价' },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-500">{item.text}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col justify-center bg-white p-6 md:p-10">
          <div className="mb-6">
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              系统登录
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{activeRole.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{activeRole.subtitle}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['user', 'admin'] as AuthRole[]).map((item) => {
              const itemConfig = roleConfig[item];
              const Icon = itemConfig.icon;
              const active = item === role;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchRole(item)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-colors ${
                    active ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {itemConfig.title}
                </button>
              );
            })}
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{activeRole.badge}</div>
                  <div className="text-xs text-emerald-700">
                    演示账号：{demoAccount.username} / {demoAccount.password}
                  </div>
                </div>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">登录账号</span>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">登录密码</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? '登录中...' : `进入${activeRole.badge}界面`}
              <ArrowRight className="h-5 w-5" />
            </button>

            <a
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              注册新账号
              <ArrowRight className="h-5 w-5" />
            </a>
          </form>
        </section>
      </main>
    </div>
  );
}
