import { FeedApiService } from '../../api/feed/FeedApiService';
import { ReactionApiService } from '../../api/reaction/ReactionApiService';
import { SurfApiService } from '../../api/surf/SurfApiService';
import { buildHeaders } from '../../utils/headers';

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAbsoluteUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const safeJsonParse = (value: any): any => {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const flattenMediaCandidates = (value: any, target: any[] = []): any[] => {
  if (Array.isArray(value)) {
    value.forEach(entry => flattenMediaCandidates(entry, target));
    return target;
  }

  if (!isObject(value)) return target;

  const type = value.type || value.mediaType;
  const media = value.name || value.url || value.media || value.src;
  const thumb = value.thumb || value.thumbnail || value.poster;
  if (type || media || thumb) target.push(value);

  Object.values(value).forEach(entry => flattenMediaCandidates(entry, target));
  return target;
};

const extractLayoutPayload = (content: any): any => {
  if (typeof content !== 'string') return null;
  const layoutIndex = content.indexOf('!{"layout":');
  if (layoutIndex < 0) return null;
  return safeJsonParse(content.slice(layoutIndex + 1));
};

const summarizeMediaDebug = (item: any) => {
  const layoutPayload = extractLayoutPayload(item?.content);
  const layoutSlots = Array.isArray(layoutPayload?.layout?.slots) ? layoutPayload.layout.slots : [];
  const mediaJson = safeJsonParse(item?.media);
  const contentJson = safeJsonParse(item?.content);

  const candidates = [
    ...flattenMediaCandidates(layoutSlots),
    ...flattenMediaCandidates(mediaJson),
    ...flattenMediaCandidates(contentJson),
  ];

  return candidates.slice(0, 6).map((entry: any) => {
    const rawUrl = entry.name || entry.url || entry.media || entry.src || '';
    const rawThumb = entry.thumb || entry.thumbnail || entry.poster || '';
    return {
      type: entry.type || entry.mediaType || null,
      rawUrl,
      rawThumb,
      isAbsoluteUrl: isAbsoluteUrl(rawUrl),
      isAbsoluteThumb: isAbsoluteUrl(rawThumb),
    };
  });
};

const debugLogMediaPayload = (scope: 'feed' | 'surf', payload: any, baseUrl: string) => {
  if (!__DEV__) return;

  const topLevelData = payload?.data;
  const rawItems = Array.isArray(topLevelData?.data)
    ? topLevelData.data
    : Array.isArray(topLevelData)
      ? topLevelData
      : Array.isArray(payload?.data?.layout) && isObject(payload?.data?.data)
        ? payload.data.layout.map((entry: any) => ({
          ...(payload.data.data?.[String(entry?.id)] || {}),
          ...entry,
        }))
        : [];

  const summary = rawItems.slice(0, 5).map((item: any) => ({
    id: item?.id || item?.postId || item?.surfId || null,
    authorId: item?.authorId || item?.userId || item?.author?.id || null,
    authorName: item?.authorName || item?.author?.fullName || item?.author?.name || null,
    createdAt: item?.createdAt || item?.modifiedAt || null,
    mediaType: item?.mediaType || null,
    contentPreview: typeof item?.content === 'string' ? item.content.slice(0, 180) : item?.content,
    mediaPreview: typeof item?.media === 'string' ? item.media.slice(0, 180) : item?.media,
    mediaCandidates: summarizeMediaDebug(item),
  }));

  console.log(`[MediaDebug:${scope}]`, {
    baseUrl,
    count: rawItems.length,
    hasMore: payload?.data?.hasMore ?? payload?.hasMore ?? null,
    message: payload?.data?.message ?? payload?.message ?? null,
    preview: summary,
  });
};

export class FeedService {
  constructor(
    private readonly baseUrl: string,
    private readonly deviceId: string,
    private readonly userAgent: string,
  ) { }

  private get headers() { return buildHeaders(this.deviceId, this.userAgent); }

  async getHomeFeed(accessToken: string, limit = 10): Promise<any[]> {
    try {
      const res = await FeedApiService.getFeedTimeline(accessToken, this.baseUrl, this.headers, '', false, '', Date.now(), limit);
      debugLogMediaPayload('feed', res, this.baseUrl);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async getProfileFeed(accessToken: string, userId = '', limit = 10, offset = 0): Promise<any[]> {
    try {
      const res = await FeedApiService.getFeedProfile(accessToken, this.baseUrl, this.headers, userId, limit, offset);
      debugLogMediaPayload('feed', res, this.baseUrl);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async getProfileSurf(accessToken: string, userId = '', limit = 10, offset = 0): Promise<any[]> {
    try {
      const res = await SurfApiService.getSurfProfile(accessToken, this.baseUrl, this.headers, userId, limit, offset);
      debugLogMediaPayload('surf', res, this.baseUrl);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async getSurfHome(accessToken: string, limit = 10): Promise<any[]> {
    try {
      const res = await SurfApiService.getSurfHome(accessToken, this.baseUrl, this.headers, '', Math.floor(Date.now() / 1000), limit);
      debugLogMediaPayload('surf', res, this.baseUrl);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async getReactionCodes(accessToken: string): Promise<string[]> {
    try {
      const res = await ReactionApiService.listReactions(accessToken, this.baseUrl, this.headers);
      const raw = res.data?.data ?? res.data;
      if (Array.isArray(raw)) {
        return raw.map((r: any) => r?.code || r?.reactionTypeCode || r?.type || String(r)).filter(Boolean);
      }
      return ['LIKE'];
    } catch {
      return ['LIKE'];
    }
  }

  async reactToPost(accessToken: string, postId: string, reactionCode = 'LIKE'): Promise<void> {
    await ReactionApiService.sendReaction(accessToken, this.baseUrl, postId, reactionCode, this.headers);
  }

  async repostPost(accessToken: string, postId: string): Promise<void> {
    await FeedApiService.repostPost(accessToken, this.baseUrl, postId, this.headers);
  }
}
