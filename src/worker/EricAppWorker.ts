import { AuthService, StoredSession, getTokenClientType, isAccessExpired, isRefreshExpired } from '../service/auth/AuthService';
import { FeedService } from '../service/feed/FeedService';
import { FriendService } from '../service/friend/FriendService';
import { MissionService } from '../service/missions/MissionService';
import { NotificationService } from '../service/notification/NotificationService';

export type AppData = {
  me: any;
  feed: any[];
  surf: any[];
  friends: any[];
  friendRequests: any[];
  sentFriendRequests: any[];
  notifications: any[];
  missions: any[];
  balance: { balance: number; dailyEarnedPoint: number; dailyRemainingPoint: number; dailyPointLimit: number | null } | null;
  reactionCodes: string[];
};

export const EMPTY_DATA: AppData = {
  me: null,
  feed: [],
  surf: [],
  friends: [],
  friendRequests: [],
  sentFriendRequests: [],
  notifications: [],
  missions: [],
  balance: null,
  reactionCodes: ['LIKE'],
};

export class EricAppWorker {
  private readonly auth: AuthService;
  private readonly feed: FeedService;
  private readonly friend: FriendService;
  private readonly mission: MissionService;
  private readonly notification: NotificationService;

  constructor(session: StoredSession) {
    const { baseUrl, deviceId, userAgent } = session;
    this.auth = new AuthService(baseUrl, deviceId, userAgent);
    this.feed = new FeedService(baseUrl, deviceId, userAgent);
    this.friend = new FriendService(baseUrl, deviceId, userAgent, session.phone);
    this.mission = new MissionService(baseUrl, deviceId, userAgent);
    this.notification = new NotificationService(baseUrl, deviceId, userAgent);
  }

  private resolveUserAgent(me?: any): string {
    return String(
      me?.userAgent ||
      me?.user_agent ||
      me?.ua ||
      me?.device?.userAgent ||
      me?.device?.user_agent ||
      me?.account?.userAgent ||
      me?.account?.user_agent ||
      me?.user?.userAgent ||
      me?.user?.user_agent ||
      me?.profile?.userAgent ||
      me?.profile?.user_agent ||
      '',
    ).trim();
  }

  async ensureValidSession(session: StoredSession): Promise<StoredSession> {
    const accessClientType = getTokenClientType(session.accessToken);
    const refreshLooksExpired = isRefreshExpired(session.refreshToken);

    if (!isAccessExpired(session.accessToken)) {
      if (accessClientType === 'web' || refreshLooksExpired) {
        return session;
      }

      const upgraded = await this.auth.refreshSession(session, { force: true });
      if (upgraded) {
        return upgraded;
      }

      return session;
    }

    const refreshed = await this.auth.refreshSession(session);
    if (!refreshed) {
      if (refreshLooksExpired) {
        throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
      }
      throw new Error('Khong the lam moi phien dang nhap. Kiem tra mang hoac API refresh.');
    }

    return refreshed;
  }

  async loadAll(session: StoredSession): Promise<{ session: StoredSession; data: AppData }> {
    const s = await this.ensureValidSession(session);
    const token = s.accessToken;
    const resolvedMe = await this.auth.getMe(s).catch(() => s.me);
    const resolvedUserAgent = this.resolveUserAgent(resolvedMe) || s.userAgent;
    const friendService = new FriendService(s.baseUrl, s.deviceId, resolvedUserAgent, s.phone);

    const [feed, surf, friends, friendRequests, sentFriendRequests, notifications, missions, balance, reactionCodes] =
      await Promise.allSettled([
        this.feed.getHomeFeed(token),
        this.feed.getSurfHome(token),
        friendService.getMyFriends(token, resolvedMe),
        friendService.getReceivedRequests(token),
        friendService.getSentRequests(token),
        this.notification.list(token),
        this.mission.getMissions(token),
        this.mission.getPointBalance(token),
        this.feed.getReactionCodes(token),
      ]);

    return {
      session: { ...s, userAgent: resolvedUserAgent, me: resolvedMe },
      data: {
        me: resolvedMe,
        feed: feed.status === 'fulfilled' ? feed.value : [],
        surf: surf.status === 'fulfilled' ? surf.value : [],
        friends: friends.status === 'fulfilled' ? friends.value : [],
        friendRequests: friendRequests.status === 'fulfilled' ? friendRequests.value : [],
        sentFriendRequests: sentFriendRequests.status === 'fulfilled' ? sentFriendRequests.value : [],
        notifications: notifications.status === 'fulfilled' ? notifications.value : [],
        missions: missions.status === 'fulfilled' ? missions.value : [],
        balance: balance.status === 'fulfilled' ? balance.value : null,
        reactionCodes: (reactionCodes.status === 'fulfilled' && reactionCodes.value.length)
          ? reactionCodes.value
          : ['LIKE'],
      },
    };
  }

  async reactToPost(session: StoredSession, postId: string, code: string) {
    const s = await this.ensureValidSession(session);
    await this.feed.reactToPost(s.accessToken, postId, code);
    return s;
  }

  async repostPost(session: StoredSession, postId: string) {
    const s = await this.ensureValidSession(session);
    await this.feed.repostPost(s.accessToken, postId);
    return s;
  }

  async acceptRequest(session: StoredSession, senderId: string) {
    const s = await this.ensureValidSession(session);
    await this.friend.acceptRequest(s.accessToken, senderId);
    return s;
  }

  async rejectRequest(session: StoredSession, senderId: string) {
    const s = await this.ensureValidSession(session);
    await this.friend.rejectRequest(s.accessToken, senderId);
    return s;
  }

  async deleteFriend(session: StoredSession, friendId: string) {
    const s = await this.ensureValidSession(session);
    await this.friend.deleteFriend(s.accessToken, friendId);
    return s;
  }

  async readNotification(session: StoredSession, notificationId: string) {
    const s = await this.ensureValidSession(session);
    await this.notification.read(s.accessToken, notificationId);
    return s;
  }

  getStreakMission(missions: any[]) {
    return this.mission.findStreakMission(missions);
  }

  getStreakClaimState(streakMission: any) {
    return this.mission.getStreakClaimState(streakMission);
  }

  async claimStreak(session: StoredSession, missionId: number, currentValue: number) {
    const s = await this.ensureValidSession(session);
    await this.mission.claimStreak(s.accessToken, missionId, currentValue);
    return s;
  }

  async claimAllEligible(session: StoredSession) {
    const s = await this.ensureValidSession(session);
    return this.mission.claimAllEligible(s.accessToken);
  }

  async logout(session: StoredSession) {
    await this.auth.logout(session);
  }
}
