import {
  ApplicantProfile,
  RealityReport,
  ScholarshipSource,
  UserSession,
} from '../types';

const TOKEN_KEY = 'infoguard_session_token';
const USER_KEY = 'infoguard_user_profile';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserSession | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: UserSession) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function safeParseJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `${fallbackError} (${res.status})`);
    }
    return data;
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    if (text.includes('The page could not be found') || res.status === 404) {
      throw new Error(`API endpoint not found (404). Check deployment API configuration.`);
    }
    throw new Error(`${fallbackError} (${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${fallbackError}: Expected JSON response.`);
  }
}

export async function registerApi(name: string, email: string, password: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Failed to register account.');
  setSession(data.token, data.user);
  return data;
}

export async function loginApi(email: string, password: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Invalid credentials.');
  setSession(data.token, data.user);
  return data;
}

export async function loginWithGoogleApi(email: string, name: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Google login failed.');
  setSession(data.token, data.user);
  return data;
}

export async function getCurrentUserApi(): Promise<UserSession | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await safeParseJson<{ user: UserSession }>(res, 'Failed to fetch current user.');
    return data.user;
  } catch {
    return null;
  }
}

export async function discoverSourcesApi(primaryUrl: string): Promise<{ discovered: ScholarshipSource[]; message?: string }> {
  const res = await fetch('/api/discover-sources', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ primaryUrl }),
  });
  const data = await safeParseJson<{ discovered: ScholarshipSource[]; message?: string }>(res, 'Source discovery encountered an issue.');
  return data;
}

export async function runAnalysisApi(params: {
  scholarshipName?: string;
  primaryUrl: string;
  additionalSources: ScholarshipSource[];
  applicant: ApplicantProfile;
}): Promise<RealityReport> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  const data = await safeParseJson<{ report: RealityReport }>(res, 'Analysis failed.');
  return data.report;
}

export async function fetchReportHistoryApi(): Promise<RealityReport[]> {
  const res = await fetch('/api/reports', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    return [];
  }
  const data = await safeParseJson<{ reports: RealityReport[] }>(res, 'Failed to fetch history.');
  return data.reports || [];
}

export async function deleteReportApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/reports/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.ok;
}
