import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base-64';
import { FriendApiService } from '../../api/friend/FriendApiService';
import { buildHeaders } from '../../utils/headers';

const FRIEND_USER_AGENT = 'ERIC/1.0.0 (iOS; 18.5.0; iPhone 15 Pro)';

type FriendReadVariant = {
  headers: Record<string, string>;
  signatureExcludeQuery: boolean;
};

type FriendTokenContext = {
  clientType: 'mobile' | 'web';
  deviceId: string;
};

export class FriendService {
  constructor(
    baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
    private readonly currentPhone?: string,
  ) {
    FriendApiService.setBaseUrl(baseUrl);
  }

  private get resolvedUserAgent() {
    return this.userAgent && !this.userAgent.startsWith('Mozilla/')
      ? this.userAgent
      : FRIEND_USER_AGENT;
  }

  private decodeTokenContext(accessToken: string): FriendTokenContext {
    try {
      const parts = accessToken.split('.');
      if (parts.length < 2) {
        return { clientType: 'mobile', deviceId: this.deviceId };
      }

      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(decode(padded));
      const rawClientType = String(payload?.clientType || '').trim().toLowerCase();
      const clientType = rawClientType === 'web' ? 'web' : 'mobile';
      const deviceId = String(payload?.deviceId || this.deviceId || '').trim() || this.deviceId;

      return { clientType, deviceId };
    } catch {
      return { clientType: 'mobile', deviceId: this.deviceId };
    }
  }

  private buildHeadersForVariant(
    deviceId: string,
    clientType: 'mobile' | 'web',
    mode: 'minimal' | 'ua',
  ) {
    return buildHeaders(deviceId, mode === 'ua' ? this.resolvedUserAgent : undefined, {
      clientType,
      includeAccept: false,
      includeContentType: false,
      includeForwardedProto: false,
      includeUserAgent: mode === 'ua',
    });
  }

  private buildHeaderVariants(accessToken: string) {
    const tokenContext = this.decodeTokenContext(accessToken);
    const primaryClientType = tokenContext.clientType;
    const fallbackClientType = primaryClientType === 'web' ? 'mobile' : 'web';

    return [
      {
        headers: this.buildHeadersForVariant(tokenContext.deviceId, primaryClientType, 'minimal'),
      },
      {
        headers: this.buildHeadersForVariant(tokenContext.deviceId, primaryClientType, 'ua'),
      },
      {
        headers: this.buildHeadersForVariant(tokenContext.deviceId, fallbackClientType, 'minimal'),
      },
      {
        headers: this.buildHeadersForVariant(tokenContext.deviceId, fallbackClientType, 'ua'),
      },
    ];
  }

  private buildNonPaginatedReadVariants(accessToken: string): FriendReadVariant[] {
    return this.buildHeaderVariants(accessToken).map(variant => ({
      ...variant,
      signatureExcludeQuery: false,
    }));
  }

  private buildPaginatedReadVariants(accessToken: string): FriendReadVariant[] {
    return this.buildHeaderVariants(accessToken).flatMap(variant => ([
      { ...variant, signatureExcludeQuery: true },
      { ...variant, signatureExcludeQuery: false },
    ]));
  }

  private getStoreKey(kind: 'received' | 'sent' | 'friends') {
    const phone = String(this.currentPhone || '').trim().toLowerCase();
    return `friend:${kind}:${phone || 'anonymous'}`;
  }

  private async readHiddenIds(kind: 'received' | 'sent' | 'friends'): Promise<Set<string>> {
    try {
      const stored = await AsyncStorage.getItem(this.getStoreKey(kind));
      const values = stored ? JSON.parse(stored) : [];
      return new Set(Array.isArray(values) ? values.map(v => String(v)) : []);
    } catch {
      return new Set();
    }
  }

  private async writeHiddenIds(kind: 'received' | 'sent' | 'friends', values: Iterable<string>): Promise<void> {
    try {
      const unique = Array.from(new Set(Array.from(values).map(v => String(v)).filter(Boolean)));
      await AsyncStorage.setItem(this.getStoreKey(kind), JSON.stringify(unique.slice(-300)));
    } catch {
      // ignore persistence error
    }
  }

  private async markHidden(kind: 'received' | 'sent' | 'friends', id: string | number): Promise<void> {
    const current = await this.readHiddenIds(kind);
    current.add(String(id));
    await this.writeHiddenIds(kind, current);
  }

  private async clearHidden(kind: 'received' | 'sent' | 'friends'): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getStoreKey(kind));
    } catch {
      // ignore clear error
    }
  }

  private extractList(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.friends)) return data.friends;
      if (data.data && typeof data.data === 'object') {
        if (Array.isArray(data.data.data)) return data.data.data;
        if (Array.isArray(data.data.items)) return data.data.items;
        if (Array.isArray(data.data.friends)) return data.data.friends;
      }
      if (data.result && typeof data.result === 'object') {
        if (Array.isArray(data.result.data)) return data.result.data;
        if (Array.isArray(data.result.items)) return data.result.items;
      }
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key];
      }
      if (data.data && typeof data.data === 'object') {
        for (const key of Object.keys(data.data)) {
          if (Array.isArray(data.data[key])) return data.data[key];
        }
      }
    }
    return [];
  }

  private filterByHiddenIds(items: any[], hiddenIds: Set<string>, idResolver: (item: any) => string | undefined): any[] {
    return items.filter(item => {
      const id = idResolver(item);
      return !id || !hiddenIds.has(id);
    });
  }

  private resolveUserId(me?: any): string {
    return String(me?.id || me?.userId || me?.accountId || me?.account?.id || '').trim();
  }

  private isInvalidHeaderError(error: any): boolean {
    return (
      error?.response?.status === 400 &&
      String(error?.response?.data?.message || '').toLowerCase().includes('request headers')
    );
  }

  private async requestWithFriendReadFallback<T>(
    variants: FriendReadVariant[],
    request: (variant: FriendReadVariant) => Promise<T>,
  ): Promise<T> {
    let lastError: any;

    for (const variant of variants) {
      try {
        return await request(variant);
      } catch (error: any) {
        lastError = error;

        if (!this.isInvalidHeaderError(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  async getMyFriends(accessToken: string, me?: any): Promise<any[]> {
    try {
      const res = await this.requestWithFriendReadFallback(this.buildNonPaginatedReadVariants(accessToken), variant =>
        FriendApiService.getMyFriends(accessToken, variant.headers),
      );
      return this.extractList(res.data);
    } catch {
      const userId = this.resolveUserId(me);
      if (userId) {
        try {
          const res = await this.requestWithFriendReadFallback(this.buildPaginatedReadVariants(accessToken), variant =>
            FriendApiService.getFriendList(accessToken, userId, variant.headers, 20, 0, undefined, variant.signatureExcludeQuery),
          );
          return this.extractList(res.data);
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  async getReceivedRequests(accessToken: string): Promise<any[]> {
    try {
      const res = await this.requestWithFriendReadFallback(this.buildPaginatedReadVariants(accessToken), variant =>
        FriendApiService.getReceivedRequests(accessToken, variant.headers, 20, 0, undefined, variant.signatureExcludeQuery),
      );
      const hidden = await this.readHiddenIds('received');
      const items = this.extractList(res.data);
      return this.filterByHiddenIds(
        items,
        hidden,
        item => String(item?.senderId || item?.sender?.id || item?.id || ''),
      );
    } catch {
      return [];
    }
  }

  async getSentRequests(accessToken: string): Promise<any[]> {
    try {
      const res = await this.requestWithFriendReadFallback(this.buildPaginatedReadVariants(accessToken), variant =>
        FriendApiService.getSentRequests(accessToken, variant.headers, 20, 0, undefined, variant.signatureExcludeQuery),
      );
      const hidden = await this.readHiddenIds('sent');
      const items = this.extractList(res.data);
      return this.filterByHiddenIds(
        items,
        hidden,
        item => String(item?.receiverId || item?.receiver?.id || item?.id || ''),
      );
    } catch {
      return [];
    }
  }

  async acceptRequest(accessToken: string, senderId: string): Promise<void> {
    const tokenContext = this.decodeTokenContext(accessToken);
    await FriendApiService.acceptFriendRequest(
      accessToken,
      senderId,
      this.buildHeadersForVariant(tokenContext.deviceId, tokenContext.clientType, 'minimal'),
    );
    await this.markHidden('received', senderId);
  }

  async rejectRequest(accessToken: string, senderId: string): Promise<void> {
    const tokenContext = this.decodeTokenContext(accessToken);
    await FriendApiService.rejectFriendRequest(
      accessToken,
      senderId,
      this.buildHeadersForVariant(tokenContext.deviceId, tokenContext.clientType, 'minimal'),
    );
    await this.markHidden('received', senderId);
  }

  async sendRequest(accessToken: string, receiverId: string | number): Promise<void> {
    const tokenContext = this.decodeTokenContext(accessToken);
    await FriendApiService.sendFriendRequest(
      accessToken,
      receiverId,
      this.buildHeadersForVariant(tokenContext.deviceId, tokenContext.clientType, 'minimal'),
    );
    await this.markHidden('sent', receiverId);
  }

  async deleteFriend(accessToken: string, friendId: string): Promise<void> {
    const tokenContext = this.decodeTokenContext(accessToken);
    await FriendApiService.deleteFriend(
      accessToken,
      friendId,
      this.buildHeadersForVariant(tokenContext.deviceId, tokenContext.clientType, 'minimal'),
    );
    await this.markHidden('friends', friendId);
  }

  async resetFriendCaches(): Promise<void> {
    await Promise.all([
      this.clearHidden('received'),
      this.clearHidden('sent'),
      this.clearHidden('friends'),
    ]);
  }
}
