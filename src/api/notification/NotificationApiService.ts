import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class NotificationApiService {
  static async listNotifications(accessToken: string, baseURL: string, headers = buildHeaders(), limit = 20, offset = 0) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/notification/list`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params: { limit, offset },
    });
  }

  static async readNotification(accessToken: string, baseURL: string, notificationId: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/v1/notification/${notificationId}/read`,
      {},
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }
}
