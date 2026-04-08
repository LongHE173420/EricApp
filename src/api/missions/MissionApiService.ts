import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class MissionApiService {
  static async getCurrentUserMissions(accessToken: string, baseURL: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/missions/current-user`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  static async claimMissionReward(accessToken: string, baseURL: string, missionId: number, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/point/claim-mission-reward`,
      { missionId },
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async claimStreakMissionReward(accessToken: string, baseURL: string, missionId: number, currentValue: number, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).post(
      `${baseURL}/api/point/claim-streak-mission-reward`,
      { missionId, currentValue },
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  static async getPointBalance(accessToken: string, baseURL: string, headers = buildHeaders()) {
    return ApiClient.createSignedClient(headers).get(`${baseURL}/api/point/balance`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}
