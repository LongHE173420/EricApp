import { createSignedAxios } from './axiosSignature';

export class ApiClient {
  static createSignedClient(headers: Record<string, string>, _agent?: any) {
    const deviceId = headers?.['X-Device-Id'] || headers?.['x-device-id'] || '';
    const baseURL = '';   // baseURL set on per-request basis via full URL in each service
    return createSignedAxios(baseURL, String(deviceId));
  }

  static buildPayload(data: any): string {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    // Wrap large number IDs in quotes to prevent precision loss
    return json.replace(
      /"(id|postId|commentId|parentId|userId|accountId|surfId|senderId|receiverId|entityId)"\s*:\s*"?(\d+)"?/g,
      '"$1":"$2"',
    );
  }
}
