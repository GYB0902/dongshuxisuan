import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Cloud, Lock, ShieldCheck, UserCircle2, UserPlus2 } from 'lucide-react';
import { ToastHost } from '../components/layout/ToastHost';
import { notify } from '../lib/actions';
import { apiRegisterUser, demoAccounts, writeAuthUser } from '../lib/auth';

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = '注册 - 东数西算碳减排与绿色算力评估系统';
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const cleanName = name.trim();
    const cleanUsername = username.trim();
    const cleanOrg = organization.trim();

    if (!cleanName || !cleanUsername || !password.trim()) {
      notify('请把注册信息填写完整');
      return;
    }

    if (cleanUsername.length < 3) {
      notify('账号至少 3 个字符');
      return;
    }

    if (password.length < 6) {
      notify('密码至少 6 位');
      return;
    }

    if (password !== confirmPassword) {
      notify('两次输入的密码不一致');
      return;
    }

    if (
      cleanUsername.toLowerCase() === demoAccounts.user.username ||
      cleanUsername.toLowerCase() === demoAccounts.admin.username
    ) {
      notify(`账号已被系统保留，请更换用户名，演示账号为 ${demoAccounts.user.username} 与 ${demoAccounts.admin.username}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await apiRegisterUser({
        username: cleanUsername,
        password,
        name: cleanName,
        organization: cleanOrg,
      });

      writeAuthUser(user);
      notify(user.storageMode === 'local' ? '注册成功，已保存到浏览器本地并自动登录' : '注册成功，已保存到 MySQL 并自动登录');
      navigate('/overview', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : '注册失败，请检查后端和 MySQL 连接');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <main className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex min-h-[560px] flex-col justify-between border-r border-slate-200 bg-emerald-50 p-8 text-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-black">新用户注册</div>
                <div className="text-xs text-slate-500">仅开放普通用户账号</div>
              </div>
            </div>

            <div className="mt-10">
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                注册信息优先写入 MySQL 数据库
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                创建你的用户账号
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                注册后可查看数据概览、绿色算力评估、LMDI 与 DID 分析。本地后端运行时写入 MySQL，静态部署时使用浏览器本地账户。
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            {[
              { icon: UserPlus2, label: '注册账号', text: '创建普通用户，优先写入 MySQL 数据库' },
              { icon: UserCircle2, label: '自动登录', text: '注册成功后直接进入数据概览' },
              { icon: ShieldCheck, label: '权限控制', text: '管理员账号不开放注册' },
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
              用户注册
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">创建普通用户账号</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              本地后端运行时保存到 MySQL，静态部署时保存到浏览器本地，注册成功后直接自动登录。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">你的姓名</span>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">登录账号</span>
              <div className="relative">
                <UserPlus2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">单位/组织（可选）</span>
              <input
                type="text"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">设置密码</span>
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

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-500">确认密码</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? '注册中...' : '立即注册并登录'}
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">已有账号？</span>
              <Link to="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
                返回登录
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
