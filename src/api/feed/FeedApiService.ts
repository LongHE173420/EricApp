import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

const ID_REGEX = /"(id|postId|commentId|parentId|userId|accountId|surfId|senderId|receiverId)"\s*:\s*(\d+)/g;
const wrapIds = (data: string) => data.replace(ID_REGEX, '"$1": "$2"');
const transformResponse = [(data: any) => {
  if (typeof data === 'string') {
    try { return JSON.parse(wrapIds(data)); } catch { return data; }
  }
  return data;
}];

export class FeedApiService {
  static async getFeedTimeline(accessToken: string, baseURL: string, headers = buildHeaders(), userId = '', isProfile = false, postId = '', createdAt = Date.now(), limit = 10) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/feed/home`,
      ApiClient.buildPayload({ userId, isProfile, postId, createdAt, limit }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, transformResponse },
    );
  }

  static async getFeedProfile(accessToken: string, baseURL: string, headers = buildHeaders(), userId = '', limit = 10, offset = 0) {
    const params: any = { limit, offset };
    if (userId) params.userId = userId;

    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/feed/profile`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params,
      transformResponse,
    });
  }

  static async createPost(accessToken: string, baseURL: string, postData: any, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/posts/create`,
      ApiClient.buildPayload(postData),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async repostPost(accessToken: string, baseURL: string, id: string | number, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/posts/repost`,
      ApiClient.buildPayload({ id: String(id) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async deletePost(accessToken: string, baseURL: string, postId: string | number, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/posts/delete`,
      ApiClient.buildPayload({ id: String(postId) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async getFeedBackgroundColor(accessToken: string, baseURL: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/feed/background-color`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}
