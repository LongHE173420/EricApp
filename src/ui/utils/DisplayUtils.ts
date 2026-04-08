import { AuthorInfo, MediaAsset } from '../types';

export const timeOf = (v: any): string => {
  if (!v) return 'Now';
  const n = Number(v);
  const d = isFinite(n) ? new Date(String(v).length > 10 ? n : n * 1000) : new Date(v);
  return isNaN(d.getTime()) ? 'Now' : d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

export const stripAppId = (text?: string) => {
  if (!text) return '';
  // Removes common EricApp numeric suffix patterns like .1774698985004203288 
  return text.split('.')[0].trim();
};

export const pickFirst = (...values: Array<any>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

export const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isAbsoluteUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

export const isLocalMediaUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^(file|content):\/\//i.test(value.trim());

export const normalizeMediaUrl = (value: unknown): string | undefined => {
  if (!isAbsoluteUrl(value)) return undefined;

  const trimmed = value.trim();
  const queryIndex = trimmed.indexOf('?');
  if (queryIndex < 0) return trimmed;

  const base = trimmed.slice(0, queryIndex);
  const query = trimmed.slice(queryIndex + 1);
  const normalizedQuery = query.replace(/\/\d{3,5}(?:\/\d{3,5}){1,2}$/, '');

  return `${base}?${normalizedQuery}`;
};

export const isVideoUrl = (value: unknown): value is string =>
  typeof value === 'string' && /\.(mp4|m4v|mov|webm|m3u8)(\?|$)/i.test(value.trim());

export const deriveThumbUrlFromVideoUrl = (value: unknown): string | undefined => {
  const normalized = normalizeMediaUrl(value);
  if (!normalized || !isVideoUrl(normalized)) return undefined;

  const queryIndex = normalized.indexOf('?');
  const path = queryIndex >= 0 ? normalized.slice(0, queryIndex) : normalized;
  const query = queryIndex >= 0 ? normalized.slice(queryIndex) : '';

  if (!/\/origin\//i.test(path)) return undefined;

  return path
    .replace(/\/origin\//i, '/thumb/')
    .replace(/\.(mp4|m4v|mov|webm|m3u8)$/i, '.jpg') + query;
};

export const inferMediaType = (type: unknown, url?: string, thumbUrl?: string): 'IMAGE' | 'VIDEO' => {
  const normalizedType = typeof type === 'string' ? type.trim().toUpperCase() : '';
  if (normalizedType === 'VIDEO') return 'VIDEO';
  if (normalizedType === 'IMAGE') return 'IMAGE';
  if (isVideoUrl(url)) return 'VIDEO';
  if (isVideoUrl(thumbUrl)) return 'VIDEO';
  return 'IMAGE';
};

export const safeJsonParse = (value: any): any => {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const fullNameOf = (value: any): string | undefined => {
  if (!isObject(value)) return undefined;

  const direct = pickFirst(value.fullName, value.authorName, value.displayName, value.name);
  if (direct) return stripAppId(direct);

  const firstName = pickFirst(value.firstName, value.firstname);
  const lastName = pickFirst(value.lastName, value.lastname);
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return stripAppId(joined || pickFirst(value.userName, value.username));
};

export const resolveAuthor = (item: any, currentUser?: any): AuthorInfo => {
  const nestedAuthor = isObject(item?.author) ? item.author : undefined;
  const nestedUser = isObject(item?.user) ? item.user : undefined;
  const owner = nestedAuthor || nestedUser || (isObject(item?.owner) ? item.owner : undefined);

  const currentUserName =
    item?.authorId && currentUser?.id && String(item.authorId) === String(currentUser.id)
      ? fullNameOf(currentUser)
      : undefined;

  const currentUserAvatar =
    item?.authorId && currentUser?.id && String(item.authorId) === String(currentUser.id)
      ? pickFirst(currentUser?.avatar)
      : undefined;

  return {
    id: pickFirst(String(item?.authorId || ''), String(currentUser?.id || ''), String(owner?.id || ''), String(item?.userId || '')),
    name: pickFirst(
      fullNameOf(owner),
      pickFirst(item?.authorName),
      fullNameOf(item),
      currentUserName,
      'Người dùng Eric',
    ) || 'Người dùng Eric',
    avatar: pickFirst(
      owner?.avatar,
      item?.authorAvatar,
      item?.avatar,
      currentUserAvatar,
    ),
  };
};

export const friendNameOf = (item: any): string =>
  stripAppId(pickFirst(
    item?.fullName,
    item?.displayName,
    item?.name,
    [pickFirst(item?.firstname, item?.firstName), pickFirst(item?.lastname, item?.lastName)].filter(Boolean).join(' ').trim(),
    item?.userName,
    item?.username,
    item?.sender?.fullName,
    item?.sender?.displayName,
    [pickFirst(item?.sender?.firstname, item?.sender?.firstName), pickFirst(item?.sender?.lastname, item?.sender?.lastName)].filter(Boolean).join(' ').trim(),
    item?.sender?.username,
    item?.receiver?.fullName,
    item?.receiver?.displayName,
    [pickFirst(item?.receiver?.firstname, item?.receiver?.firstName), pickFirst(item?.receiver?.lastname, item?.receiver?.lastName)].filter(Boolean).join(' ').trim(),
    item?.receiver?.username,
  ) || 'User');

export const friendAvatarOf = (item: any): string | undefined =>
  pickFirst(
    item?.avatar,
    item?.sender?.avatar,
    item?.receiver?.avatar,
    item?.profilePicture,
  );

export const uniqueMedia = (items: MediaAsset[]): MediaAsset[] => {
  const result: MediaAsset[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.type}:${item.url || ''}:${item.thumbUrl || ''}`;
    if (!seen.has(key) && (item.url || item.thumbUrl)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};

export const collectMediaNodes = (value: any, target: any[] = []): any[] => {
  if (Array.isArray(value)) {
    value.forEach(entry => collectMediaNodes(entry, target));
    return target;
  }

  if (!isObject(value)) return target;

  const type = pickFirst(value.type, value.mediaType);
  const candidateUrl = pickFirst(value.name, value.url, value.media, value.src);
  const candidateThumb = pickFirst(value.thumb, value.thumbnail, value.poster);

  if (type && (candidateUrl || candidateThumb)) {
    target.push(value);
  }

  Object.values(value).forEach(entry => collectMediaNodes(entry, target));
  return target;
};

export const mediaFromJsonLike = (value: any): MediaAsset[] => {
  const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
  if (!parsed) return [];

  return collectMediaNodes(parsed).map((entry: any) => {
    const url = pickFirst(entry.name, entry.url, entry.media, entry.src);
    const thumbUrl = pickFirst(entry.thumb, entry.thumbnail, entry.poster);
    const normalizedUrl = normalizeMediaUrl(url);
    const normalizedThumbUrl = normalizeMediaUrl(thumbUrl) || deriveThumbUrlFromVideoUrl(url);

    return {
      type: inferMediaType(pickFirst(entry.type, entry.mediaType), normalizedUrl, normalizedThumbUrl),
      url: normalizedUrl,
      thumbUrl: normalizedThumbUrl,
    };
  });
};

export const mediaFromLayout = (content: any): MediaAsset[] => {
  if (typeof content !== 'string') return [];

  const layoutIndex = content.indexOf('!{"layout":');
  if (layoutIndex < 0) return [];

  const parsed = safeJsonParse(content.slice(layoutIndex + 1));
  const slots = Array.isArray(parsed?.layout?.slots) ? parsed.layout.slots : [];

  return slots.map((slot: any) => {
    const url = pickFirst(slot?.media, slot?.url);
    const thumbUrl = pickFirst(slot?.thumb, slot?.thumbnail);
    const normalizedUrl = normalizeMediaUrl(url);
    const normalizedThumbUrl = normalizeMediaUrl(thumbUrl) || deriveThumbUrlFromVideoUrl(url);

    return {
      type: inferMediaType(slot?.type, normalizedUrl, normalizedThumbUrl),
      url: normalizedUrl,
      thumbUrl: normalizedThumbUrl,
    };
  });
};
export const mediaFromDirectFields = (item: any): MediaAsset[] => {
  const directUrl = pickFirst(
    item?.media,
    item?.mediaUrl,
    item?.video,
    item?.videoUrl,
    item?.image,
    item?.imageUrl,
    item?.src,
    item?.url,
  );

  const directThumb = pickFirst(
    item?.thumb,
    item?.thumbnail,
    item?.thumbnailUrl,
    item?.thumbnailFileName,
    item?.thumbFileName,
    item?.poster,
    item?.cover,
    item?.coverUrl,
    item?.previewUrl,
  );

  if (!isAbsoluteUrl(directUrl) && !isAbsoluteUrl(directThumb)) return [];

  const normalizedUrl = normalizeMediaUrl(directUrl);
  const normalizedThumbUrl = normalizeMediaUrl(directThumb) || deriveThumbUrlFromVideoUrl(directUrl);

  return [{
    type: inferMediaType(pickFirst(item?.mediaType, item?.type), normalizedUrl, normalizedThumbUrl),
    url: normalizedUrl,
    thumbUrl: normalizedThumbUrl,
  }];
};

export const mediaOf = (item: any): MediaAsset[] => uniqueMedia([
  ...mediaFromDirectFields(item),
  ...mediaFromLayout(item?.content),
  ...mediaFromJsonLike(item?.content),
  ...mediaFromJsonLike(item?.media),
]);

export const textOf = (content: any): string => {
  if (!content) return '';
  if (typeof content !== 'string') return String(content);

  const raw = content.trim();
  const textMatch = raw.match(/!\{"text":\s*("(?:\\.|[^"])*")\}/);
  if (textMatch?.[1]) {
    try {
      return JSON.parse(textMatch[1]);
    } catch {
      return raw;
    }
  }

  if (raw.startsWith('[') && safeJsonParse(raw)) return '';

  const layoutIndex = raw.indexOf('!{"layout":');
  if (layoutIndex >= 0) {
    return raw.slice(0, layoutIndex).trim();
  }

  return raw;
};
