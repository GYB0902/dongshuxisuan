export type AuthRole = 'user' | 'admin';

export type AuthUser = {
  role: AuthRole;
  name: string;
  level: string;
  username?: string;
  organization?: string;
  loginAt?: string;
  storageMode?: 'mysql' | 'local';
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
const REGISTERED_USERS_KEY = 'dongshu-registered-users';

type StoredLocalUser = {
  role: 'user';
  username: string;
  password: string;
  name: string;
  level: string;
  organization?: string;
  createdAt: string;
};

class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

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

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers,
    });
  } catch (error) {
    throw new ApiRequestError(error instanceof Error ? error.message : '网络请求失败');
  }

  const payload = await readResponsePayload<T>(response);

  if (!response.ok) {
    throw new ApiRequestError(payload?.message || `请求失败（${response.status}）`, response.status);
  }

  if (!payload || payload.data === undefined) {
    throw new ApiRequestError(payload?.message || '接口返回格式异常', response.status);
  }

  return payload.data;
}

function isApiUnavailableError(error: unknown) {
  if (!(error instanceof ApiRequestError)) return true;
  if (error.status === undefined) return true;
  return error.status === 200 || error.status === 404 || error.status === 405 || error.status >= 500;
}

function readLocalRegisteredUsers(): StoredLocalUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is StoredLocalUser =>
        item?.role === 'user' &&
        typeof item.username === 'string' &&
        typeof item.password === 'string' &&
        typeof item.name === 'string',
    );
  } catch {
    return [];
  }
}

function writeLocalRegisteredUsers(users: StoredLocalUser[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

function toAuthUser(user: StoredLocalUser): AuthUser {
  return {
    role: 'user',
    username: user.username,
    name: user.name,
    organization: user.organization,
    level: user.level,
    storageMode: 'local',
  };
}

function fallbackLoginUser(payload: AuthLoginPayload): AuthUser {
  const cleanUsername = payload.username.trim();
  const cleanPassword = payload.password.trim();
  const account = demoAccounts[payload.role];

  if (cleanUsername === account.username && cleanPassword === account.password) {
    return {
      role: payload.role,
      username: account.username,
      name: account.name,
      level: account.level,
      storageMode: 'local',
    };
  }

  if (payload.role === 'user') {
    const localUser = readLocalRegisteredUsers().find(
      (item) => item.username === cleanUsername && item.password === cleanPassword,
    );

    if (localUser) return toAuthUser(localUser);
  }

  throw new Error('账号或密码错误');
}

function fallbackRegisterUser(payload: AuthRegisterPayload): AuthUser {
  const cleanUsername = payload.username.trim();
  const lowerUsername = cleanUsername.toLowerCase();
  const users = readLocalRegisteredUsers();

  const duplicated =
    lowerUsername === demoAccounts.user.username ||
    lowerUsername === demoAccounts.admin.username ||
    users.some((item) => item.username.toLowerCase() === lowerUsername);

  if (duplicated) throw new Error('账号已存在，请更换用户名');

  const nextUser: StoredLocalUser = {
    role: 'user',
    username: cleanUsername,
    password: payload.password,
    name: payload.name.trim(),
    organization: payload.organization?.trim(),
    level: '业务用户',
    createdAt: new Date().toISOString(),
  };

  writeLocalRegisteredUsers([...users, nextUser]);
  return toAuthUser(nextUser);
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
  let response: AuthEnvelope;

  try {
    response = await requestApi<AuthEnvelope>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        role: payload.role,
        username: payload.username,
        password: payload.password,
      }),
    });
  } catch (error) {
    if (isApiUnavailableError(error)) return fallbackLoginUser(payload);
    throw error;
  }

  if (!response.user) {
    throw new Error('登录接口未返回用户信息');
  }

  return { ...response.user, storageMode: 'mysql' as const };
}

export async function apiRegisterUser(payload: AuthRegisterPayload) {
  let response: AuthEnvelope;

  try {
    response = await requestApi<AuthEnvelope>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        password: payload.password,
        name: payload.name,
        organization: payload.organization ?? '',
      }),
    });
  } catch (error) {
    if (isApiUnavailableError(error)) return fallbackRegisterUser(payload);
    throw error;
  }

  if (!response.user) {
    throw new Error('注册接口未返回用户信息');
  }

  return { ...response.user, storageMode: 'mysql' as const };
}
