import { NotificationApiService } from '../../api/notification/NotificationApiService';
import { buildHeaders } from '../../utils/headers';

export class NotificationService {
  private _notificationApi?: NotificationApiService;

  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) {}

  private get notificationApi(): NotificationApiService {
    if (!this._notificationApi) {
      this._notificationApi = new NotificationApiService(this.baseUrl, this.deviceId);
    }
    return this._notificationApi;
  }

  private get headers() { return buildHeaders(this.deviceId, this.userAgent); }

  async list(accessToken: string, limit = 20, offset = 0): Promise<any[]> {
    try {
      const res = await this.notificationApi.listNotifications(accessToken, this.headers, limit, offset);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async read(accessToken: string, notificationId: string): Promise<void> {
    await this.notificationApi.readNotification(accessToken, notificationId, this.headers);
  }
}
