import { UserApiService } from '../../api/user/UserApiService';
import { buildHeaders } from '../../utils/headers';

export class UserService {
  private readonly api: UserApiService;

  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) {
    this.api = new UserApiService(baseUrl, deviceId);
  }

  private get headers() {
    return buildHeaders(this.deviceId, this.userAgent);
  }

  async getMe(accessToken: string) {
    try {
      const res = await this.api.getProfileMe(accessToken, this.headers);
      return res.data?.data || res.data;
    } catch {
      return null;
    }
  }

  async getProfileById(accessToken: string, userId: string) {
    try {
      const res = await this.api.getProfileById(accessToken, userId, this.headers);
      return res.data?.data || res.data;
    } catch {
      return null;
    }
  }

  async searchUsers(accessToken: string, keyword: string, limit = 10, offset = 0) {
    try {
      const res = await this.api.searchUsers(accessToken, keyword, limit, offset, this.headers);
      const data = res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async updateProfile(accessToken: string, profileData: any) {
    try {
      const res = await this.api.updateProfile(accessToken, profileData, this.headers);
      return res.data?.isSucceed || false;
    } catch {
      return false;
    }
  }
}
