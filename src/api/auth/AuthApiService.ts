import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';
import { createSignedAxios } from '../../utils/axiosSignature';

export type ApiRes<T> = {
  isSucceed: boolean;
  message: string;
  data?: T;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginData = {
  otpRequired?: boolean;
  otpDeliveryMessage?: string | null;
  otpDestination?: string | null;
  tokens?: Tokens | null;
  accessToken?: string;
  refreshToken?: string;
  otpMethods?: any;
};

export class AuthApiService {
  private http: ReturnType<typeof createSignedAxios>;

  constructor(private readonly baseURL: string, private readonly deviceId: string) {
    this.http = createSignedAxios(baseURL, deviceId);
  }

  async login(username: string, password: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<LoginData>>(
      '/api/auth/login',
      { username, password },
      { headers },
    );
  }

  async verifyLoginOtp(username: string, otp: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<LoginData>>(
      '/api/auth/verify-login-otp',
      { username, otp, channel: 'EMAIL' },
      { headers },
    );
  }

  async resendLoginOtp(username: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<any>>(
      '/api/auth/resend-otp-login',
      { username, channel: 'EMAIL' },
      { headers },
    );
  }

  async refreshToken(refreshToken: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<LoginData>>(
      '/api/auth/refresh',
      { refreshToken },
      { headers: { ...headers, Authorization: `Bearer ${refreshToken}` } },
    );
  }

  async saveTrustedDevice(accessToken: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<any>>(
      '/api/trusted-device/save',
      '',
      { headers: { ...headers, Authorization: `Bearer ${accessToken}` } },
    );
  }

  async logout(accessToken: string, refreshToken: string, headers: Record<string, string>) {
    return this.http.post<ApiRes<any>>(
      '/api/auth/logout',
      { refreshToken },
      { headers: { ...headers, Authorization: `Bearer ${accessToken}` } },
    );
  }
}
