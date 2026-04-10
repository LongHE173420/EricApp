import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

const ID_REGEX = /"(userId|accountId|id|senderId|receiverId|postId|commentId|parentId|surfId|entityId)"\s*:\s*(\d+)/g;
const wrapIds = (data: string) => data.replace(ID_REGEX, '"$1": "$2"');
const transformResponse = [(data: any) => {
  if (typeof data === 'string') {
    try { return JSON.parse(wrapIds(data)); } catch { return data; }
  }
  return data;
}];

export class UserApiService {
  constructor(private readonly baseURL: string, private readonly deviceId: string) {}

  async getProfileMe(accessToken: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/user/me`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  async getProfileById(accessToken: string, id: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).request({
      method: 'GET',
      url: `${this.baseURL}/api/user/id/${id}`,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      data: {},
      transformResponse,
    });
  }

  async getProfileByUsername(accessToken: string, username: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/user/username/${username}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  async updateProfile(accessToken: string, profileData: any, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(`${this.baseURL}/api/user/update-profile`, profileData, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  async searchUsers(accessToken: string, keyword: string, limit = 10, offset = 0, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).request({
      method: 'GET',
      url: `${this.baseURL}/api/user/search`,
      params: { keyword, limit, offset },
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      data: {},
      transformResponse,
    });
  }
}
