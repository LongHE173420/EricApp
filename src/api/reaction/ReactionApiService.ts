import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class ReactionApiService {
  static async sendReaction(accessToken: string, baseURL: string, postId: string, type: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/posts/reaction/send`,
      ApiClient.buildPayload({ postId: String(postId), reactionTypeCode: type }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async removeReaction(accessToken: string, baseURL: string, postId: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/posts/reaction/send`,
      ApiClient.buildPayload({ postId: String(postId) }),
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async listReactions(accessToken: string, baseURL: string, headers = buildHeaders(), limit = 10, offset = 0, postId = '', category = 'POSITIVE') {
    const params: any = { limit, offset };
    if (postId) params.postId = postId;
    if (category) params.category = category;

    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/posts/reaction/list`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      params,
    });
  }
}
