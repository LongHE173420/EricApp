import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

const ID_REGEX =
  /"(userId|accountId|id|senderId|receiverId|postId|commentId|parentId|surfId|entityId|friendId)"\s*:\s*(\d+)/g;

const transformResponse = [
  (data: any) => {
    if (typeof data !== 'string') return data;
    try {
      // Wrap large numbers ONLY if they are not already quoted
      const transformed = data.replace(ID_REGEX, '"$1": "$2"');
      return JSON.parse(transformed);
    } catch {
      // If our complex regex fails, try standard JSON parse
      try { return JSON.parse(data); } catch { return data; }
    }
  },
];

const buildOrderedQuery = (entries: Array<[string, string | number | undefined]>) => {
  const query = entries
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
};

export class FriendApiService {
  private static baseURL = '';

  static setBaseUrl(baseURL: string) {
    this.baseURL = baseURL;
  }

  private static get urlBase() {
    return this.baseURL;
  }

  static async getFollowers(
    accessToken: string,
    userId: string,
    headers = buildHeaders(),
    limit = 10,
    offset = 0,
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).get(`${this.urlBase}/api/follow/followers/${userId}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params: { limit, offset },
      transformResponse,
    });
  }

  static async getFriendList(
    accessToken: string,
    userId: string,
    headers = buildHeaders(),
    limit = 10,
    offset = 0,
    agent?: any,
    signatureExcludeQuery = false,
  ) {
    const query = buildOrderedQuery([
      ['offset', offset],
      ['limit', limit],
      ['userId', userId],
    ]);

    return ApiClient.createSignedClient(headers, agent).get(`${this.urlBase}/api/friend/list${query}`, {
      __signatureExcludeQuery: signatureExcludeQuery,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async getMyFriends(accessToken: string, headers = buildHeaders(), agent?: any) {
    return ApiClient.createSignedClient(headers, agent).get(`${this.urlBase}/api/friend/myFriends`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async sendFriendRequest(
    accessToken: string,
    receiverId: string | number,
    headers = buildHeaders(),
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).post(
      `${this.urlBase}/api/friend/requests`,
      ApiClient.buildPayload({ receiverId: String(receiverId) }),
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  static async acceptFriendRequest(
    accessToken: string,
    senderId: string,
    headers = buildHeaders(),
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).post(
      `${this.urlBase}/api/friend/requests/accept`,
      ApiClient.buildPayload({ senderId }),
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  static async getSentRequests(
    accessToken: string,
    headers = buildHeaders(),
    limit = 10,
    offset = 0,
    agent?: any,
    signatureExcludeQuery = false,
  ) {
    const query = buildOrderedQuery([
      ['offset', offset],
      ['limit', limit],
    ]);

    return ApiClient.createSignedClient(headers, agent).get(`${this.urlBase}/api/friend/requests/sent${query}`, {
      __signatureExcludeQuery: signatureExcludeQuery,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse,
    });
  }

  static async deleteFriend(
    accessToken: string,
    friendId: string,
    headers = buildHeaders(),
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).delete(`${this.urlBase}/api/friend/${friendId}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  static async cancelFriendRequest(
    accessToken: string,
    receiverId: string,
    headers = buildHeaders(),
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).delete(`${this.urlBase}/api/friend/cancel/${receiverId}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  static async rejectFriendRequest(
    accessToken: string,
    senderId: string,
    headers = buildHeaders(),
    agent?: any,
  ) {
    return ApiClient.createSignedClient(headers, agent).delete(`${this.urlBase}/api/friend/reject/${senderId}`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  static async getReceivedRequests(
    accessToken: string,
    headers = buildHeaders(),
    limit = 10,
    offset = 0,
    agent?: any,
    signatureExcludeQuery = false,
  ) {
    const query = buildOrderedQuery([
      ['offset', offset],
      ['limit', limit],
    ]);

    return ApiClient.createSignedClient(headers, agent).get(`${this.urlBase}/api/friend/requests/received${query}`, {
      __signatureExcludeQuery: signatureExcludeQuery,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      transformResponse: [
        (data: any) => {
          if (typeof data === 'string') {
            const transformed = data.replace(
              /"(userId|accountId|id|senderId|receiverId|friendId)"\s*:\s*(\d+)/g,
              '"$1": "$2"',
            );
            try {
              return JSON.parse(transformed);
            } catch {
              return data;
            }
          }
          return data;
        },
      ],
    });
  }
}
