import { MissionApiService } from '../../api/missions/MissionApiService';
import { buildHeaders } from '../../utils/headers';

const STREAK_TIMEZONE = 'Asia/Ho_Chi_Minh';

function getDateKeyInTimezone(date: Date, tz = STREAK_TIMEZONE): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return y && m && d ? `${y}-${m}-${d}` : null;
  } catch {
    return null;
  }
}

function isStreakMission(m: any): boolean {
  const type = String(m?.type || '').toUpperCase();
  const actionType = String(m?.actionType || '').toUpperCase();
  const name = String(m?.name || '').toLowerCase();
  const missionId = Number(m?.missionId || m?.id || 0);
  return type === 'STREAK_LOGIN' || type === 'STREAK' || actionType === 'LOGIN' || missionId === 18 || name.includes('chuỗi');
}

export type StreakClaimState = {
  isClaimed: boolean;
  alreadyClaimedToday: boolean;
  canClaimToday: boolean;
  todayKey: string | null;
  lastClaimDateKey: string | null;
};

export type PointBalance = {
  balance: number;
  dailyEarnedPoint: number;
  dailyRemainingPoint: number;
  dailyPointLimit: number | null;
};

export class MissionService {
  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) {}

  private get headers() { return buildHeaders(this.deviceId, this.userAgent); }

  async getMissions(accessToken: string): Promise<any[]> {
    try {
      const res = await MissionApiService.getCurrentUserMissions(accessToken, this.baseUrl, this.headers);
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  }

  async getPointBalance(accessToken: string): Promise<PointBalance | null> {
    try {
      const res = await MissionApiService.getPointBalance(accessToken, this.baseUrl, this.headers);
      const d = res.data?.data || res.data;
      if (!d) return null;
      const earned = d?.dailyEarnedPoint ?? 0;
      const remaining = d?.dailyRemainingPoint ?? d?.remainingPoint ?? 0;
      return {
        balance: d?.balance ?? 0,
        dailyEarnedPoint: earned,
        dailyRemainingPoint: remaining,
        dailyPointLimit: d?.maxDailyPoint ?? (earned + remaining),
      };
    } catch {
      return null;
    }
  }

  getStreakClaimState(mission: any): StreakClaimState {
    const now = new Date();
    const lastDateTs = Number(mission?.lastStreakDate || 0);
    const todayKey = getDateKeyInTimezone(now);
    const lastClaimDateKey = lastDateTs > 0 ? getDateKeyInTimezone(new Date(lastDateTs)) : null;
    const isClaimed = String(mission?.status || '').toUpperCase() === 'CLAIMED';
    const alreadyClaimedToday = Boolean(lastClaimDateKey && todayKey && lastClaimDateKey === todayKey);

    return {
      isClaimed,
      alreadyClaimedToday,
      canClaimToday: Boolean(todayKey) && !isClaimed && !alreadyClaimedToday,
      todayKey,
      lastClaimDateKey,
    };
  }

  findStreakMission(missions: any[]): any | null {
    return missions.find(isStreakMission) || null;
  }

  async claimStreak(accessToken: string, missionId: number, currentValue: number): Promise<boolean> {
    try {
      await MissionApiService.claimStreakMissionReward(accessToken, this.baseUrl, missionId, currentValue, this.headers);
      return true;
    } catch {
      return false;
    }
  }

  async claimMission(accessToken: string, missionId: number): Promise<boolean> {
    try {
      await MissionApiService.claimMissionReward(accessToken, this.baseUrl, missionId, this.headers);
      return true;
    } catch {
      return false;
    }
  }

  /** Auto-claim all eligible missions (streak + completed regular missions) */
  async claimAllEligible(accessToken: string): Promise<{ claimed: number[]; skipped: number[] }> {
    const missions = await this.getMissions(accessToken);
    const claimed: number[] = [];
    const skipped: number[] = [];

    for (const m of missions) {
      const missionId = Number(m?.missionId || m?.id || 0);
      if (!missionId) continue;

      if (isStreakMission(m)) {
        const state = this.getStreakClaimState(m);
        if (state.canClaimToday) {
          const ok = await this.claimStreak(accessToken, missionId, Number(m?.currentValue || 0));
          ok ? claimed.push(missionId) : skipped.push(missionId);
        } else {
          skipped.push(missionId);
        }
        continue;
      }

      // Regular mission: claim if completed/done and not claimed
      const status = String(m?.status || '').toUpperCase();
      const cv = Number(m?.currentValue || 0);
      const tv = Number(m?.targetValue || 0);
      const isComplete = status === 'COMPLETED' || status === 'DONE' || (tv > 0 && cv >= tv);
      const isClaimed = status === 'CLAIMED';

      if (isComplete && !isClaimed) {
        const ok = await this.claimMission(accessToken, missionId);
        ok ? claimed.push(missionId) : skipped.push(missionId);
      } else {
        skipped.push(missionId);
      }
    }

    return { claimed, skipped };
  }
}
