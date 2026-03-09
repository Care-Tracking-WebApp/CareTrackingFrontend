import { projectId, publicAnonKey } from 'utils/supabase/info';

export const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${import.meta.env.VITE_SUPABASE_FUNCTION_SLUG}`;

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  adminToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Always use publicAnonKey so Supabase gateway lets the request through
    'Authorization': `Bearer ${publicAnonKey}`,
    ...((options.headers as Record<string, string>) || {}),
  };
  // Pass admin session token in a separate custom header
  if (adminToken) {
    headers['X-Admin-Token'] = adminToken;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

export const AUTH_KEY = 'caretracker_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(AUTH_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(AUTH_KEY);
}