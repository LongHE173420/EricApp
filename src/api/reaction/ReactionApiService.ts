import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class ReactionApiService {
  constructor(private readonly baseURL: string, private readonly deviceId: string) {}

  async sendReaction(accessToken: string, postId: string, type: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/posts/reaction/send`,
      ApiClient.buildPayload({ postId: String(postId), reactionTypeCode: type }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async removeReaction(accessToken: string, postId: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/posts/reaction/send`,
      ApiClient.buildPayload({ postId: String(postId) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async listReactions(accessToken: string, headers: Record<string, string>, limit = 10, offset = 0, postId = '', category = 'POSITIVE') {
    const params: any = { limit, offset };
    if (postId) params.postId = postId;
    if (category) params.category = category;

    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/posts/reaction/list`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params,
    });
  }
}
