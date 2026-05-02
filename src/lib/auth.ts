export type AuthRole = 'user' | 'admin';

export type AuthUser = {
  role: AuthRole;
  name: string;
  level: string;
  username?: string;
  organization?: string;
  loginAt?: string;
};

export type AuthLoginPayload = {
  role: AuthRole;
  username: string;
  password: string;
};

export type AuthRegisterPayload = {
  username: string;
  password: string;
  name: string;
  organization?: string;
};

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

type AuthEnvelope = {
  user: AuthUser;
};

export const AUTH_USER_KEY = 'dongshu-user';

export const demoAccounts = {
  user: {
    username: 'user',
    password: '123456',
    name: '普通用户',
    level: '业务用户',
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    name: '管理员',
    level: '系统管理员',
  },
} as const;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

function buildApiUrl(path: string) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function readResponsePayload<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { message: text };
  }
}

async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? undefined);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  const payload = await readResponsePayload<T>(response);

  if (!response.ok) {
    throw new Error(payload?.message || `请求失败（${response.status}）`);
  }

  if (!payload || payload.data === undefined) {
    throw new Error(payload?.message || '接口返回格式异常');
  }

  return payload.data;
}

export function readAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if ((parsed.role !== 'user' && parsed.role !== 'admin') || !parsed.name || !parsed.level) {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }

    return parsed as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function writeAuthUser(user: AuthUser) {
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      ...user,
      loginAt: new Date().toISOString(),
    }),
  );
}

export function logoutUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function apiLoginUser(payload: AuthLoginPayload) {
  const response = await requestApi<AuthEnvelope>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      role: payload.role,
      username: payload.username,
      password: payload.password,
    }),
  });

  if (!response.user) {
    throw new Error('登录接口未返回用户信息');
  }

  return response.user;
}

export async function apiRegisterUser(payload: AuthRegisterPayload) {
  const response = await requestApi<AuthEnvelope>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      name: payload.name,
      organization: payload.organization ?? '',
    }),
  });

  if (!response.user) {
    throw new Error('注册接口未返回用户信息');
  }

  return response.user;
}
