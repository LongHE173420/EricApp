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
  constructor(private readonly baseURL: string, private readonly deviceId: string) {}

  async getFeedTimeline(accessToken: string, headers: Record<string, string>, userId = '', isProfile = false, postId = '', createdAt = Date.now(), limit = 10) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/feed/home`,
      ApiClient.buildPayload({ userId, isProfile, postId, createdAt, limit }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, transformResponse },
    );
  }

  async getFeedProfile(accessToken: string, headers: Record<string, string>, userId = '', limit = 10, offset = 0) {
    const params: any = { limit, offset };
    if (userId) params.userId = userId;

    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/feed/profile`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params,
      transformResponse,
    });
  }

  async createPost(accessToken: string, postData: any, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/posts/create`,
      ApiClient.buildPayload(postData),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async repostPost(accessToken: string, id: string | number, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/posts/repost`,
      ApiClient.buildPayload({ id: String(id) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async deletePost(accessToken: string, postId: string | number, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/posts/delete`,
      ApiClient.buildPayload({ id: String(postId) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async getFeedBackgroundColor(accessToken: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/feed/background-color`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}
