import { AuthService, StoredSession, getTokenClientType, isAccessExpired, isRefreshExpired } from '../service/auth/AuthService';
import { buildHeaders } from '../utils/headers';
import { UserApiService } from '../api/user/UserApiService';
import { FeedApiService } from '../api/feed/FeedApiService';
import { ReactionApiService } from '../api/reaction/ReactionApiService';
import { FeedService } from '../service/feed/FeedService';
import { FriendService } from '../service/friend/FriendService';
import { MissionService } from '../service/missions/MissionService';
import { NotificationService } from '../service/notification/NotificationService';
import { WorkerCtx, AppLogger } from './WorkerTypes';

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
  profileFeed: any[];
  profileSurf: any[];
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
  profileFeed: [],
  profileSurf: [],
};

export class EricAppWorker {
  private readonly logger: AppLogger;
  private readonly logId: number;
  private session: StoredSession;

  private readonly auth: AuthService;
  private readonly feed: FeedService;
  private readonly friend: FriendService;
  private readonly mission: MissionService;
  private readonly notification: NotificationService;

  constructor(ctx: WorkerCtx) {
    this.logger = ctx.logger;
    this.logId = ctx.logId;
    this.session = ctx.session;

    const { baseUrl, deviceId, userAgent, phone } = this.session;
    this.auth = new AuthService(baseUrl, deviceId, userAgent);
    this.feed = new FeedService(baseUrl, deviceId, userAgent);
    this.friend = new FriendService(baseUrl, deviceId, userAgent, phone);
    this.mission = new MissionService(baseUrl, deviceId, userAgent);
    this.notification = new NotificationService(baseUrl, deviceId, userAgent);
  }

  public getSession(): StoredSession {
    return this.session;
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

  async ensureValidSession(): Promise<StoredSession> {
    const accessClientType = getTokenClientType(this.session.accessToken);
    const refreshLooksExpired = isRefreshExpired(this.session.refreshToken);

    if (!isAccessExpired(this.session.accessToken)) {
      if (accessClientType === 'web' || refreshLooksExpired) {
        return this.session;
      }

      this.logger.info({ logId: this.logId }, 'Forcing session upgrade...');
      const upgraded = await this.auth.refreshSession(this.session, { force: true });
      if (upgraded) {
        this.session = upgraded;
      }

      return this.session;
    }

    this.logger.info({ logId: this.logId }, 'Refreshing expired session...');
    const refreshed = await this.auth.refreshSession(this.session);
    if (!refreshed) {
      if (refreshLooksExpired) {
        throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
      }
      throw new Error('Khong the lam moi phien dang nhap. Kiem tra mang hoac API refresh.');
    }

    this.session = refreshed;
    return this.session;
  }

  async loadAll(): Promise<{ session: StoredSession; data: AppData }> {
    await this.ensureValidSession();
    const s = this.session;
    const token = s.accessToken;

    const resolvedMe = await this.auth.getMe(s).catch(() => s.me);
    const resolvedUserAgent = this.resolveUserAgent(resolvedMe) || s.userAgent;
    const friendService = new FriendService(s.baseUrl, s.deviceId, resolvedUserAgent, s.phone);

    const [
      feed, surf, friends, friendRequests, sentFriendRequests,
      notifications, missions, balance, reactionCodes,
      profileFeed, profileSurf
    ] = await Promise.allSettled([
      this.feed.getHomeFeed(token),
      this.feed.getSurfHome(token),
      friendService.getMyFriends(token, resolvedMe),
      friendService.getReceivedRequests(token),
      friendService.getSentRequests(token),
      this.notification.list(token),
      this.mission.getMissions(token),
      this.mission.getPointBalance(token),
      this.feed.getReactionCodes(token),
      this.feed.getProfileFeed(token),
      this.feed.getProfileSurf(token),
    ]);

    this.session = { ...s, userAgent: resolvedUserAgent, me: resolvedMe };

    return {
      session: this.session,
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
        profileFeed: profileFeed.status === 'fulfilled' ? profileFeed.value : [],
        profileSurf: profileSurf.status === 'fulfilled' ? profileSurf.value : [],
      },
    };
  }

  async reactToPost(postId: string, code: string) {
    await this.ensureValidSession();
    await this.feed.reactToPost(this.session.accessToken, postId, code);
  }
  
  async removeReaction(postId: string) {
    await this.ensureValidSession();
    const headers = buildHeaders(this.session.deviceId, this.session.userAgent);
    await ReactionApiService.removeReaction(this.session.accessToken, this.session.baseUrl, postId, headers);
  }

  async repostPost(postId: string) {
    await this.ensureValidSession();
    await this.feed.repostPost(this.session.accessToken, postId);
  }

  async acceptRequest(senderId: string) {
    await this.ensureValidSession();
    await this.friend.acceptRequest(this.session.accessToken, senderId);
  }

  async sendFriendRequest(receiverId: string) {
    await this.ensureValidSession();
    await this.friend.sendRequest(this.session.accessToken, receiverId);
  }

  async cancelFriendRequest(receiverId: string) {
    await this.ensureValidSession();
    await this.friend.cancelRequest(this.session.accessToken, receiverId);
  }

  async searchUsers(keyword: string) {
    await this.ensureValidSession();
    const s = this.session;
    const clientType = getTokenClientType(s.accessToken);
    const headers = buildHeaders(s.deviceId, s.userAgent, { clientType });
    
    console.log('[SearchDebug] Searching for:', keyword);
    try {
      const res = await UserApiService.searchUsers(s.accessToken, s.baseUrl, keyword, 10, 0, headers);
      console.log('[SearchDebug] Response Status:', res.status);
      console.log('[SearchDebug] Response Data:', JSON.stringify(res.data, null, 2));
      
      const results = res?.data?.data || res?.data;
      return Array.isArray(results) ? results : [];
    } catch (error: any) {
      console.log('[SearchDebug] Search Error:', error?.message);
      return [];
    }
  }

  async getProfileById(userId: string) {
    await this.ensureValidSession();
    const s = this.session;
    const clientType = getTokenClientType(s.accessToken);
    const headers = buildHeaders(s.deviceId, s.userAgent, { clientType });
    const res = await UserApiService.getProfileById(s.accessToken, s.baseUrl, userId, headers);
    return res?.data?.data || res?.data;
  }

  async getProfileContent(userId: string) {
    const [profile, feed, surf] = await Promise.all([
      this.getProfileById(userId),
      this.feed.getProfileFeed(this.session.accessToken, userId),
      this.feed.getProfileSurf(this.session.accessToken, userId),
    ]);
    return { profile, feed, surf };
  }

  async rejectRequest(senderId: string) {
    await this.ensureValidSession();
    await this.friend.rejectRequest(this.session.accessToken, senderId);
  }

  async deleteFriend(friendId: string) {
    await this.ensureValidSession();
    await this.friend.deleteFriend(this.session.accessToken, friendId);
  }

  async readNotification(notificationId: string) {
    await this.ensureValidSession();
    await this.notification.read(this.session.accessToken, notificationId);
  }

  getStreakMission(missions: any[]) {
    return this.mission.findStreakMission(missions);
  }

  getStreakClaimState(streakMission: any) {
    return this.mission.getStreakClaimState(streakMission);
  }

  async claimStreak(missionId: number, currentValue: number) {
    await this.ensureValidSession();
    await this.mission.claimStreak(this.session.accessToken, missionId, currentValue);
  }

  async claimAllEligible() {
    await this.ensureValidSession();
    return this.mission.claimAllEligible(this.session.accessToken);
  }

  async resetFriendCaches() {
    await this.friend.resetFriendCaches();
  }

  async logout() {
    await this.auth.logout(this.session);
  }
}
