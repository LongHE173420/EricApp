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

export class SurfApiService {
  static async getSurfHome(accessToken: string, baseURL: string, headers = buildHeaders(), surfId = '', createdAt = Math.floor(Date.now() / 1000), limit = 10) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/surf/home`,
      ApiClient.buildPayload({ surfId, createdAt, limit }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}` }, transformResponse },
    );
  }

  static async generateSurfId(accessToken: string, baseURL: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(`${baseURL}/api/surf/generate-id`, '', {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  static async createSurf(accessToken: string, baseURL: string, surfData: any, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/surf/create`,
      ApiClient.buildPayload(surfData),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}` } },
    );
  }

  static async completeSurf(accessToken: string, baseURL: string, surfData: any, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/surf/complete`,
      ApiClient.buildPayload(surfData),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}` } },
    );
  }

  static async getSurfProfile(accessToken: string, baseURL: string, headers = buildHeaders(), userId = '', limit = 10, offset = 0) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/surf/profile`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params: { userId, limit, offset },
      transformResponse,
    });
  }
}
