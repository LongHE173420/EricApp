import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class NotificationApiService {
  constructor(private readonly baseURL: string, private readonly deviceId: string) { }

  async listNotifications(accessToken: string, headers: Record<string, string>, limit = 20, offset = 0) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/notification/list`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params: { limit, offset },
    });
  }

  async readNotification(accessToken: string, notificationId: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/notification/${notificationId}/read`,
      {},
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }
}
