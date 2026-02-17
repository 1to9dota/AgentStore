/**
 * 认证工具模块
 * 处理用户登录、注册、token 管理等操作
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
const TOKEN_KEY = "agentstore_token";
const USER_KEY = "agentstore_user";

export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  access_token: string;
}

/**
 * 用户登录
 */
export async function login(
  username: string,
  password: string
): Promise<User> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "登录失败");
  }

  const data: AuthResponse = await res.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);

  // 获取用户信息
  const user = await fetchCurrentUser(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * 用户注册
 */
export async function register(
  username: string,
  password: string
): Promise<User> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "注册失败");
  }

  // 注册接口已返回 token，直接使用
  const data: AuthResponse = await res.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
  const user = await fetchCurrentUser(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * 退出登录
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * 获取当前 token
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 获取当前用户信息（从 localStorage 读取）
 */
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 从 API 获取当前用户信息
 */
async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("获取用户信息失败");
  }

  return res.json();
}
