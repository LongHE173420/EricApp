import { decode } from 'base-64';
import { AuthApiService, Tokens } from '../../api/auth/AuthApiService';
import { UserApiService } from '../../api/user/UserApiService';
import { buildHeaders } from '../../utils/headers';

export type StoredSession = {
  baseUrl: string;
  phone: string;
  deviceId: string;
  userAgent: string;
  accessToken: string;
  refreshToken: string;
  accessExp?: number;
  refreshExp?: number;
  me?: any;
};

export type LoginResult =
  | { kind: 'success'; session: StoredSession }
  | { kind: 'otp'; phone: string; baseUrl: string; deviceId: string; userAgent: string }
  | { kind: 'error'; message: string };

export function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
    return JSON.parse(decode(padded));
  } catch {
    return null;
  }
}

function getTokenExp(token: string): number | undefined {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp : undefined;
}

export function getTokenClientType(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  const value = String(payload?.clientType || '').trim().toLowerCase();
  return value || undefined;
}

function extractTokens(data: any): Tokens | null {
  const nested = data?.tokens;
  if (nested?.accessToken && nested?.refreshToken) {
    return nested as Tokens;
  }

  if (data?.accessToken && data?.refreshToken) {
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }

  return null;
}

function extractUserAgent(...payloads: any[]): string | undefined {
  for (const payload of payloads) {
    const value =
      payload?.userAgent ||
      payload?.user_agent ||
      payload?.ua ||
      payload?.device?.userAgent ||
      payload?.device?.user_agent ||
      payload?.account?.userAgent ||
      payload?.account?.user_agent ||
      payload?.user?.userAgent ||
      payload?.user?.user_agent ||
      payload?.profile?.userAgent ||
      payload?.profile?.user_agent;

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function isAccessExpired(token: string): boolean {
  if (!token) return true;
  const exp = getTokenExp(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000 - 30_000;
}

export function isRefreshExpired(token: string): boolean {
  return isAccessExpired(token);
}

export const isTokenExpired = isAccessExpired;

export class AuthService {
  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) {}

  private get api() {
    return new AuthApiService(this.baseUrl, this.deviceId);
  }

  private get headers() {
    return buildHeaders(this.deviceId, this.userAgent);
  }

  private formatAxiosError(error: any, fallbackMessage: string): string {
    const status = error?.response?.status;
    const apiMessage = error?.response?.data?.message;
    const axiosMessage = error?.message;

    if (status) {
      return `${apiMessage || axiosMessage || fallbackMessage} (HTTP ${status}, ${this.baseUrl})`;
    }

    return apiMessage || axiosMessage || fallbackMessage;
  }

  private buildSession(
    phone: string,
    accessToken: string,
    refreshToken: string,
    me?: any,
    userAgent?: string,
  ): StoredSession {
    const accessExp = getTokenExp(accessToken);
    const refreshExp = getTokenExp(refreshToken);
    return {
      baseUrl: this.baseUrl,
      phone,
      deviceId: this.deviceId,
      userAgent: userAgent || extractUserAgent(me) || this.userAgent,
      accessToken,
      refreshToken,
      accessExp,
      refreshExp,
      me,
    };
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const res = await this.api.login(username, password, this.headers);
      const body = res.data;
      const d = body?.data;
      const tokens = extractTokens(d);

      if (tokens) {
        const authPayload = d as any;
        return {
          kind: 'success',
          session: this.buildSession(
            username,
            tokens.accessToken,
            tokens.refreshToken,
            authPayload?.user || authPayload?.profile || authPayload?.account,
            extractUserAgent(authPayload, authPayload?.user, authPayload?.profile, authPayload?.account),
          ),
        };
      }

      const needOtp = d?.otpRequired || body?.message === 'NEED_OTP';
      if (needOtp) {
        return { kind: 'otp', phone: username, baseUrl: this.baseUrl, deviceId: this.deviceId, userAgent: this.userAgent };
      }

      if (!body?.isSucceed) {
        return { kind: 'error', message: body?.message || 'Dang nhap that bai.' };
      }

      return { kind: 'error', message: body?.message || 'Phan hoi khong hop le.' };
    } catch (error: any) {
      return { kind: 'error', message: this.formatAxiosError(error, 'Loi ket noi.') };
    }
  }

  async verifyOtp(username: string, otp: string): Promise<LoginResult> {
    try {
      const res = await this.api.verifyLoginOtp(username, otp, this.headers);
      const d = res.data?.data;
      const tokens = extractTokens(d);

      if (tokens) {
        const authPayload = d as any;
        return {
          kind: 'success',
          session: this.buildSession(
            username,
            tokens.accessToken,
            tokens.refreshToken,
            authPayload?.user || authPayload?.profile || authPayload?.account,
            extractUserAgent(authPayload, authPayload?.user, authPayload?.profile, authPayload?.account),
          ),
        };
      }
      return { kind: 'error', message: res.data?.message || 'OTP khong hop le.' };
    } catch (error: any) {
      return { kind: 'error', message: this.formatAxiosError(error, 'Loi xac thuc OTP.') };
    }
  }

  async resendOtp(username: string): Promise<void> {
    await this.api.resendLoginOtp(username, this.headers);
  }

  async saveTrustedDevice(accessToken: string): Promise<void> {
    await this.api.saveTrustedDevice(accessToken, this.headers);
  }

  async refreshSession(
    session: StoredSession,
    options?: { force?: boolean },
  ): Promise<StoredSession | null> {
    try {
      const force = options?.force === true;
      if (!force && !isAccessExpired(session.accessToken)) return session;
      
      if (!session.refreshToken) {
        if (__DEV__) console.log('[AuthService:Refresh] No refresh token available');
        return null;
      }

      const clientType = getTokenClientType(session.accessToken) || getTokenClientType(session.refreshToken) || 'web';
      const refreshHeaders = buildHeaders(
        this.deviceId,
        session.userAgent || this.userAgent,
        { clientType }
      );

      if (__DEV__) console.log(`[AuthService:Refresh] Attempting API refresh for ${session.phone} (${clientType})`);
      
      const res = await this.api.refreshToken(session.refreshToken, refreshHeaders);

      const d = res.data?.data;
      const tokens = extractTokens(d);

      if (tokens) {
        if (__DEV__) console.log('[AuthService:Refresh] Success');
        return this.buildSession(
          session.phone,
          tokens.accessToken,
          tokens.refreshToken,
          session.me,
          extractUserAgent(d, session.me) || session.userAgent,
        );
      }
      
      if (__DEV__) console.log('[AuthService:Refresh] API returned success but no tokens found:', JSON.stringify(res.data));
      return null;
    } catch (error: any) {
      if (__DEV__) {
        console.log('[AuthService:Refresh] Failed:', error?.response?.status, error?.response?.data || error?.message);
      }
      return null;
    }
  }

  async getMe(session: StoredSession): Promise<any> {
    const h = buildHeaders(this.deviceId, this.userAgent);
    const res = await UserApiService.getProfileMe(session.accessToken, this.baseUrl, h);
    const d = res.data;
    if (d?.isSucceed && d?.data) return d.data;
    if (d?.data?.id || d?.data?.userName) return d.data;
    if (d?.id || d?.userName) return d;
    return d?.data || d || null;
  }

  async logout(session: StoredSession): Promise<void> {
    try {
      const h = buildHeaders(this.deviceId, this.userAgent);
      await this.api.logout(session.accessToken, session.refreshToken, h);
    } catch {
      // ignore logout error
    }
  }
}
