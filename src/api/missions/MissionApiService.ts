import { ApiClient } from '../../utils/ApiClient';
import { buildHeaders } from '../../utils/headers';

export class MissionApiService {
  constructor(private readonly baseURL: string, private readonly deviceId: string) {}

  async getCurrentUserMissions(accessToken: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/missions/current-user`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  async claimMissionReward(accessToken: string, missionId: number, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/point/claim-mission-reward`,
      { missionId },
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async claimStreakMissionReward(accessToken: string, missionId: number, currentValue: number, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).post(
      `${this.baseURL}/api/point/claim-streak-mission-reward`,
      { missionId, currentValue },
      { headers: { ...headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  async getPointBalance(accessToken: string, headers: Record<string, string>) {
    return ApiClient.createSignedClient(headers).get(`${this.baseURL}/api/point/balance`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}
