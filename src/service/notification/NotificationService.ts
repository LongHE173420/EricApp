import { NotificationApiService } from '../../api/notification/NotificationApiService';
import { buildHeaders } from '../../utils/headers';

export class NotificationService {
  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) {}

  private get headers() { return buildHeaders(this.deviceId, this.userAgent); }

  async list(accessToken: string, limit = 20, offset = 0): Promise<any[]> {
    try {
      const res = await NotificationApiService.listNotifications(accessToken, this.baseUrl, this.headers, limit, offset);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async read(accessToken: string, notificationId: string): Promise<void> {
    await NotificationApiService.readNotification(accessToken, this.baseUrl, notificationId, this.headers);
  }
}
