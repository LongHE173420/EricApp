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
  static async getProfileMe(accessToken: string, baseURL: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/user/me`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async getProfileById(accessToken: string, baseURL: string, id: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/user/id/${id}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async getProfileByUsername(accessToken: string, baseURL: string, username: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/user/username/${username}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async updateProfile(accessToken: string, baseURL: string, profileData: any, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(`${baseURL}/api/user/update-profile`, profileData, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}
