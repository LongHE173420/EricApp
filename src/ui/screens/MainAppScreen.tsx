import React, { useEffect, useState } from 'react';
import {
  Image, Modal, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import Video from 'react-native-video';
import { RootController, Tab } from '../controllers/RootController';

const TABS: Array<{ key: Tab; icon: string; label: string }> = [
  { key: 'home', icon: '\uD83C\uDFE0', label: 'Home' },
  { key: 'compose', icon: '\u270F\uFE0F', label: 'Add' },
  { key: 'friends', icon: '\uD83D\uDC65', label: 'People' },
  { key: 'alerts', icon: '\u23F0', label: 'Alerts' },
  { key: 'profile', icon: '\uD83D\uDC64', label: 'Me' },
];

type MediaAsset = {
  type: 'IMAGE' | 'VIDEO';
  url?: string;
  thumbUrl?: string;
};

type AuthorInfo = {
  id?: string;
  name: string;
  avatar?: string;
};

// Try later frames first because many surf videos start with black intro frames.
const THUMBNAIL_TIMESTAMPS = [6000, 9000, 12000, 2500, 4000, 1000];
const GENERATED_THUMBNAIL_CACHE = new Map<string, string>();
const FAILED_REMOTE_THUMBNAIL_URLS = new Set<string>();

const timeOf = (v: any): string => {
  if (!v) return 'Now';
  const n = Number(v);
  const d = isFinite(n) ? new Date(String(v).length > 10 ? n : n * 1000) : new Date(v);
  return isNaN(d.getTime()) ? 'Now' : d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const stripAppId = (text?: string) => {
  if (!text) return '';
  // Removes common EricApp numeric suffix patterns like .1774698985004203288 
  return text.split('.')[0].trim();
};

const pickFirst = (...values: Array<any>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const friendNameOf = (item: any): string =>
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

const friendAvatarOf = (item: any): string | undefined =>
  pickFirst(
    item?.avatar,
    item?.sender?.avatar,
    item?.receiver?.avatar,
    item?.profilePicture,
  );

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAbsoluteUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const isLocalMediaUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^(file|content):\/\//i.test(value.trim());

const normalizeMediaUrl = (value: unknown): string | undefined => {
  if (!isAbsoluteUrl(value)) return undefined;

  const trimmed = value.trim();
  const queryIndex = trimmed.indexOf('?');
  if (queryIndex < 0) return trimmed;

  const base = trimmed.slice(0, queryIndex);
  const query = trimmed.slice(queryIndex + 1);
  const normalizedQuery = query.replace(/\/\d{3,5}(?:\/\d{3,5}){1,2}$/, '');

  return `${base}?${normalizedQuery}`;
};

const deriveThumbUrlFromVideoUrl = (value: unknown): string | undefined => {
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

const isVideoUrl = (value: unknown): value is string =>
  typeof value === 'string' && /\.(mp4|m4v|mov|webm|m3u8)(\?|$)/i.test(value.trim());

const inferMediaType = (type: unknown, url?: string, thumbUrl?: string): 'IMAGE' | 'VIDEO' => {
  const normalizedType = typeof type === 'string' ? type.trim().toUpperCase() : '';
  if (normalizedType === 'VIDEO') return 'VIDEO';
  if (normalizedType === 'IMAGE') return 'IMAGE';
  if (isVideoUrl(url)) return 'VIDEO';
  if (isVideoUrl(thumbUrl)) return 'VIDEO';
  return 'IMAGE';
};

const safeJsonParse = (value: any): any => {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const fullNameOf = (value: any): string | undefined => {
  if (!isObject(value)) return undefined;

  const direct = pickFirst(value.fullName, value.authorName, value.displayName, value.name);
  if (direct) return stripAppId(direct);

  const firstName = pickFirst(value.firstName, value.firstname);
  const lastName = pickFirst(value.lastName, value.lastname);
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return stripAppId(joined || pickFirst(value.userName, value.username));
};

const resolveAuthor = (item: any, currentUser?: any): AuthorInfo => {
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

const uniqueMedia = (items: MediaAsset[]): MediaAsset[] => {
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

const collectMediaNodes = (value: any, target: any[] = []): any[] => {
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

const mediaFromJsonLike = (value: any): MediaAsset[] => {
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

const mediaFromLayout = (content: any): MediaAsset[] => {
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

const mediaFromDirectFields = (item: any): MediaAsset[] => {
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

const mediaOf = (item: any): MediaAsset[] => uniqueMedia([
  ...mediaFromDirectFields(item),
  ...mediaFromLayout(item?.content),
  ...mediaFromJsonLike(item?.content),
  ...mediaFromJsonLike(item?.media),
]);

const textOf = (content: any): string => {
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

function Avatar({ uri, label, size = 40 }: { uri?: string; label: string; size?: number }) {
  const r = size / 2;
  const initial = (label || 'U').slice(0, 1).toUpperCase();
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r, backgroundColor: '#f1f5f9' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

function MediaPreview({
  asset,
  extraCount = 0,
  onPress,
  variant = 'default',
  storyTitle,
  storyAuthor,
}: {
  asset: MediaAsset;
  extraCount?: number;
  onPress?: (asset: MediaAsset) => void;
  variant?: 'default' | 'story';
  storyTitle?: string;
  storyAuthor?: AuthorInfo;
}) {
  const [thumbnailUri, setThumbnailUri] = useState<string | undefined>(() =>
    asset.type === 'VIDEO' && asset.url
      ? (GENERATED_THUMBNAIL_CACHE.get(asset.url) || asset.thumbUrl)
      : asset.thumbUrl,
  );
  const [remoteThumbFailed, setRemoteThumbFailed] = useState<boolean>(() =>
    Boolean(asset.type === 'VIDEO' && asset.url && FAILED_REMOTE_THUMBNAIL_URLS.has(asset.url)),
  );
  const previewUri = asset.type === 'IMAGE'
    ? (asset.url || asset.thumbUrl)
    : (thumbnailUri || (!remoteThumbFailed ? asset.thumbUrl : undefined));
  const isStory = variant === 'story';

  useEffect(() => {
    const cachedThumbnail = asset.type === 'VIDEO' && asset.url
      ? GENERATED_THUMBNAIL_CACHE.get(asset.url)
      : undefined;
    const didRemoteThumbFail = Boolean(asset.type === 'VIDEO' && asset.url && FAILED_REMOTE_THUMBNAIL_URLS.has(asset.url));

    setRemoteThumbFailed(didRemoteThumbFail);
    setThumbnailUri(cachedThumbnail || asset.thumbUrl);
  }, [asset.thumbUrl, asset.url, asset.type]);

  useEffect(() => {
    let active = true;

    if (asset.type !== 'VIDEO' || !asset.url) {
      return () => {
        active = false;
      };
    }

    if (asset.thumbUrl && !remoteThumbFailed) {
      setThumbnailUri(undefined);
      return () => {
        active = false;
      };
    }

    if (!isLocalMediaUrl(asset.url)) {
      if (active) setThumbnailUri(undefined);
      return () => {
        active = false;
      };
    }

    const videoUrl = asset.url;

    (async () => {
      for (const timeStamp of THUMBNAIL_TIMESTAMPS) {
        try {
          const result = await createThumbnail({
            url: videoUrl,
            timeStamp,
            onlySyncedFrames: false,
          });
          if (__DEV__) console.log('[Thumbnail] generated', { url: videoUrl, timeStamp, path: result.path });
          GENERATED_THUMBNAIL_CACHE.set(videoUrl, result.path);
          if (active) setThumbnailUri(result.path);
          return;
        } catch (error) {
          if (__DEV__) console.log('[Thumbnail] retry', { url: videoUrl, timeStamp, error });
        }
      }

      console.log('[Thumbnail] error', { url: videoUrl, error: 'Failed at all timestamps' });
      if (active) setThumbnailUri(undefined);
    })();

    return () => {
      active = false;
    };
  }, [asset.thumbUrl, asset.type, asset.url, remoteThumbFailed]);

  return (
    <Pressable
      onPress={() => onPress?.(asset)}
      disabled={!asset.url || !onPress}
      style={[s.mediaBox, isStory && s.storyCard, !asset.url && s.mediaBoxDisabled]}
    >
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          style={[s.mediaImage, isStory && s.storyImage]}
          resizeMode="cover"
          onLoad={() => {
            if (__DEV__) console.log('[ThumbnailImage] loaded', { previewUri });
          }}
          onError={error => {
            console.log('[ThumbnailImage] error', { previewUri, error });
            if (asset.type === 'VIDEO' && asset.url && previewUri === asset.thumbUrl) {
              FAILED_REMOTE_THUMBNAIL_URLS.add(asset.url);
              setRemoteThumbFailed(true);
            }
          }}
        />
      ) : (
        <View style={s.mediaFallback}>
          <Text style={s.mediaFallbackTitle}>{asset.type === 'VIDEO' ? 'Video' : 'Media'}</Text>
          <Text style={s.mediaFallbackHint}>
            {asset.url ? 'Cham de mo' : 'Khong tim thay preview'}
          </Text>
        </View>
      )}

      {isStory && storyAuthor ? (
        <View style={s.storyTop}>
          <Avatar uri={storyAuthor.avatar} label={storyAuthor.name} size={34} />
          <Text style={s.storyAuthor} numberOfLines={1}>{storyAuthor.name}</Text>
        </View>
      ) : null}

      {isStory ? (
        <View style={s.storyBottom}>
          <Text style={s.storyTitle} numberOfLines={2}>{storyTitle || 'Story'}</Text>
        </View>
      ) : null}

      {asset.type === 'VIDEO' && !isStory && (
        <View style={s.playBadge}>
          <Text style={s.playBadgeText}>{'\u25B6'}</Text>
        </View>
      )}

      {extraCount > 0 && (
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>+{extraCount}</Text>
        </View>
      )}
    </Pressable>
  );
}


interface MainAppScreenProps {
  rootController: RootController;
  rootState: ReturnType<RootController['getState']>;
}

export function MainAppScreen({ rootController, rootState }: MainAppScreenProps) {
  const { session, data, tab, refreshing } = rootState;
  const [activeVideo, setActiveVideo] = useState<MediaAsset | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [viewingProfileData, setViewingProfileData] = useState<any>(null);

  const doSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await rootController.searchUsers(searchKeyword.trim());
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const openProfileWall = async (userId: string) => {
    setViewingProfileId(String(userId));
    setViewingProfileData(null);
    try {
      const p = await rootController.getProfileById(String(userId));
      if (__DEV__) console.log('[openProfileWall] Data:', JSON.stringify(p).substring(0, 1000));
      setViewingProfileData(p || { fullName: 'Người dùng này chưa có thông tin', userName: '' });
    } catch (e: any) {
      console.log('[openProfileWall] Error:', e?.response?.status, e?.response?.data || e?.message);

      const status = e?.response?.status || 'Unknown';
      const msg = e?.response?.data?.message || e?.message || JSON.stringify(e?.response?.data);
      if (__DEV__) {
        Alert.alert(`Test Lỗi API (User ID: ${userId})`, `Status: ${status}\nMessage: ${msg}`);
      }

      setViewingProfileData({ fullName: 'Lỗi tải trang cá nhân', userName: 'Không thể truy xuất dữ liệu', isError: true });
    }
  };

  const closeProfileWall = () => {
    setViewingProfileId(null);
    setViewingProfileData(null);
  };

  const renderProfileActions = () => {
    if (!viewingProfileId || viewingProfileData?.isError) return null;

    const myId = String(data.me?.id || data.me?.userId || data.me?.accountId || '');
    if (myId === viewingProfileId) {
      return <Text style={[s.infoText, { marginTop: 20 }]}>Đây là trang cá nhân của bạn</Text>;
    }

    const isFriend = data.friends.some((f: any) => String(f?.id || f?.friendId || f?.userId || f?.friend?.id) === viewingProfileId);
    const isSent = data.sentFriendRequests.some((r: any) => String(r?.receiverId || r?.receiver?.id || r?.id) === viewingProfileId);
    const isReceived = data.friendRequests.some((r: any) => String(r?.senderId || r?.sender?.id || r?.id) === viewingProfileId);

    if (__DEV__) {
      console.log(`[ProfileWall:Status] checking ${viewingProfileId}: friend=${isFriend}, sent=${isSent}, rcv=${isReceived}`);
      if (isSent === false && data.sentFriendRequests.length > 0) {
        console.log('[ProfileWall:SentList] IDs found:', data.sentFriendRequests.map((r: any) => r?.receiverId || r?.id));
      }
    }

    if (isFriend) {
      return (
        <>
          <Pressable onPress={() => rootController.deleteFriend(viewingProfileId)} style={[s.btn, { backgroundColor: '#e2e8f0', marginTop: 20, paddingHorizontal: 30 }]}>
            <Text style={[s.btnText, { color: '#0f172a' }]}>Hủy kết bạn</Text>
          </Pressable>
        </>
      );
    }

    if (isSent) {
      return (
        <Pressable onPress={() => rootController.cancelFriendRequest(viewingProfileId)} style={[s.btn, { backgroundColor: '#e2e8f0', marginTop: 20, paddingHorizontal: 30 }]}>
          <Text style={[s.btnText, { color: '#0f172a' }]}>Hủy lời mời</Text>
        </Pressable>
      );
    }

    if (isReceived) {
      return (
        <Pressable onPress={() => rootController.acceptRequest(viewingProfileId)} style={[s.btn, { marginTop: 20, paddingHorizontal: 30 }]}>
          <Text style={s.btnText}>Chấp nhận kết bạn</Text>
        </Pressable>
      );
    }

    return (
      <>
        <Pressable onPress={() => rootController.sendFriendRequest(viewingProfileId)} style={[s.btn, { marginTop: 20, paddingHorizontal: 30 }]}>
          <Text style={s.btnText}>Thêm kết bạn</Text>
        </Pressable>
      </>
    );
  };

  if (!session) return null;

  return (
    <>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>EricApp</Text>
          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>v1.0.5-DEBUG</Text>
        </View>
        <Pressable onPress={() => rootController.loadAll(session, false)}>
          <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Lam moi</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          !viewingProfileId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => rootController.setRefreshing(true)}
              tintColor="#3b82f6"
            />
          ) : undefined
        }
      >
        {viewingProfileId ? (
          <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={closeProfileWall} style={{ marginRight: 15 }}><Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{'< Quay lại'}</Text></Pressable>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Tường cá nhân</Text>
            </View>
            {viewingProfileData ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                 <Avatar uri={viewingProfileData?.avatar} label={stripAppId(viewingProfileData?.fullName || viewingProfileData?.userName) || '?'} size={96} />
                 <Text style={[s.pName, { marginTop: 16, fontSize: 20 }]}>
                   {stripAppId(viewingProfileData?.fullName || viewingProfileData?.userName) || 'Người dùng Bí ẩn'}
                 </Text>
                 <Text style={s.infoText}>
                   {viewingProfileData?.userName ? `@${stripAppId(viewingProfileData.userName)}` : ''}
                 </Text>

                {renderProfileActions()}
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            )}
          </View>
        ) : (
          <>
            {tab === 'home' && (
              <View style={{ padding: 12 }}>
                {data.surf.length > 0 ? (
                  <View style={s.storySection}>
                    <View style={s.storyHeader}>
                      <Text style={s.sectionTitle}>Stories</Text>
                      <Text style={s.storyHint}>Cham de xem surf</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.storyRow}
                    >
                      {data.surf.map((p: any, index: number) => {
                        const author = resolveAuthor(p, data.me);
                        const media = mediaOf(p);
                        const bodyText = textOf(p.description || p.content);
                        const firstMedia = media[0];

                        if (!firstMedia) return null;

                        return (
                          <MediaPreview
                            key={`story-${String(p.id ?? p.surfId ?? index)}`}
                            asset={firstMedia}
                            variant="story"
                            storyAuthor={author}
                            storyTitle={bodyText || author.name}
                            onPress={asset => {
                              if ((asset.type === 'VIDEO' || isVideoUrl(asset.url)) && asset.url) {
                                if (__DEV__) console.log('[VideoPress:story]', asset);
                                setActiveVideo(asset);
                              }
                            }}
                          />
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {data.feed.length === 0 ? <Text style={s.empty}>Het noi dung roi...</Text> : data.feed.map((p: any, index: number) => {
                  const author = resolveAuthor(p, data.me);
                  const media = mediaOf(p);
                  const bodyText = textOf(p.content);

                  return (
                    <View key={String(p.id ?? p.postId ?? index)} style={s.cardPost}>
                      <View style={s.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Pressable onPress={() => author.id ? openProfileWall(author.id) : null}>
                            <Avatar uri={author.avatar} label={author.name} size={36} />
                          </Pressable>
                          <View style={{ marginLeft: 8 }}>
                            <Pressable onPress={() => author.id ? openProfileWall(author.id) : null}>
                              <Text style={s.pName}>{author.name}</Text>
                            </Pressable>
                            <Text style={s.pTime}>{timeOf(p.createdAt ?? p.modifiedAt)}</Text>
                          </View>
                        </View>
                      </View>

                      {bodyText ? <Text style={s.pBody}>{bodyText}</Text> : null}
                      {media[0] ? (
                        <MediaPreview
                          asset={media[0]}
                          extraCount={Math.max(media.length - 1, 0)}
                          onPress={asset => {
                            if ((asset.type === 'VIDEO' || isVideoUrl(asset.url)) && asset.url) {
                              if (__DEV__) console.log('[VideoPress:feed]', asset);
                              setActiveVideo(asset);
                            }
                          }}
                        />
                      ) : null}

                      <View style={s.pActions}>
                        <Pressable onPress={() => rootController.onReact(String(p.id ?? p.postId ?? ''))} style={s.pAction}>
                          <Text style={s.pActionText}>Thich</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {tab === 'friends' && (
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', marginBottom: 20, alignItems: 'center' }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: 15 }}
                    placeholder="Tìm kiếm bạn bè..."
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    onSubmitEditing={doSearch}
                    returnKeyType="search"
                  />
                  <Pressable style={{ marginLeft: 10, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 }} onPress={doSearch}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Tìm</Text>
                  </Pressable>
                </View>

                {isSearching ? <ActivityIndicator size="small" color="#3b82f6" style={{ marginBottom: 20 }} /> : null}
                {!isSearching && searchResults.length > 0 ? (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={s.sectionTitle}>Kết quả tìm kiếm ({searchResults.length})</Text>
                    {searchResults.map((r: any, index: number) => {
                      const sId = String(r?.id || r?.userId || index);
                      return (
                        <Pressable key={`search-${sId}`} style={[s.card, s.friendRowCard]} onPress={() => openProfileWall(sId)}>
                          <View style={s.friendIdentity}>
                            <Avatar uri={r?.avatar} label={r?.fullName || r?.userName || '?'} size={34} />
                            <View style={{ marginLeft: 10, flex: 1 }}>
                              <Text style={s.pName}>{r?.fullName || r?.userName || 'Người dùng'}</Text>
                              <Text style={s.pTime}>@{r?.userName || 'unknown'}</Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={s.sectionTitle}>Loi moi ket ban ({data.friendRequests.length})</Text>
                {data.friendRequests.length === 0 ? <Text style={s.emptyInline}>Khong co loi moi moi</Text> : data.friendRequests.map((r: any, index: number) => {
                  const senderId = String(r?.senderId || r?.sender?.id || r?.id || index);
                  return (
                    <View key={`received-${senderId}`} style={[s.card, s.friendRowCard]}>
                      <Pressable style={s.friendIdentity} onPress={() => openProfileWall(senderId)}>
                        <Avatar uri={friendAvatarOf(r)} label={friendNameOf(r)} size={34} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={s.pName}>{friendNameOf(r)}</Text>
                          <Text style={s.pTime}>Muốn kết nối với bạn</Text>
                        </View>
                      </Pressable>
                      <View style={s.friendActionRow}>
                        <Pressable style={s.tinyBtnGhost} onPress={() => rootController.rejectRequest(senderId)}>
                          <Text style={s.tinyBtnGhostText}>Tu choi</Text>
                        </Pressable>
                        <Pressable style={s.tinyBtn} onPress={() => rootController.acceptRequest(senderId)}>
                          <Text style={s.btnText}>Dong y</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                <Text style={[s.sectionTitle, { marginTop: 20 }]}>Da gui ({data.sentFriendRequests.length})</Text>
                {data.sentFriendRequests.length === 0 ? <Text style={s.emptyInline}>Chua co loi moi da gui</Text> : data.sentFriendRequests.map((r: any, index: number) => {
                  const receiverId = String(r?.receiverId || r?.receiver?.id || r?.id || index);
                  return (
                    <View key={`sent-${receiverId}`} style={[s.card, s.friendRowCard]}>
                      <Pressable style={s.friendIdentity} onPress={() => openProfileWall(receiverId)}>
                        <Avatar uri={friendAvatarOf(r)} label={friendNameOf(r)} size={34} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={s.pName}>{friendNameOf(r)}</Text>
                          <Text style={s.pTime}>Đang chờ phản hồi</Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}

                <Text style={[s.sectionTitle, { marginTop: 20 }]}>Ban be cua toi ({data.friends.length})</Text>
                {data.friends.length === 0 ? <Text style={s.emptyInline}>Chua co ban be nao</Text> : data.friends.map((f: any, index: number) => {
                  const friendId = String(f?.id || f?.friendId || f?.userId || f?.friend?.id || index);
                  return (
                    <View key={`friend-${friendId}`} style={[s.card, s.friendRowCard]}>
                      <Pressable style={s.friendIdentity} onPress={() => openProfileWall(friendId)}>
                        <Avatar uri={friendAvatarOf(f)} label={friendNameOf(f)} size={36} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={s.pName}>{friendNameOf(f)}</Text>
                          <Text style={s.pTime}>@{stripAppId(pickFirst(f?.userName, f?.username, f?.email) || 'username')}</Text>
                        </View>
                      </Pressable>
                      <Pressable style={s.tinyBtnGhost} onPress={() => rootController.deleteFriend(friendId)}>
                        <Text style={s.tinyBtnGhostText}>Xoa</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {tab === 'alerts' && (
              <View style={{ padding: 12 }}>
                <Text style={s.sectionTitle}>Thong bao moi ({data.notifications.length})</Text>
                {data.notifications.length === 0 ? <Text style={s.empty}>Chua co thong bao nao</Text> : data.notifications.map((n: any) => (
                  <View key={n.id} style={s.cardPost}>
                    <Text style={{ color: '#0f172a', fontWeight: '500' }}>{n.content || n.title || 'Thong bao moi'}</Text>
                    <Text style={s.pTime}>{timeOf(n.createdAt)}</Text>
                  </View>
                ))}
              </View>
            )}

            {tab === 'profile' && (
              <View style={{ padding: 20 }}>
                <View style={[s.cardProfile, { alignItems: 'center', paddingVertical: 40 }]}>
                  <Avatar uri={data.me?.avatar} label={stripAppId(data.me?.fullName || '?')} size={96} />
                  <Text style={[s.pName, { marginTop: 16, fontSize: 20 }]}>{stripAppId(data.me?.fullName || 'Nguoi dung Eric')}</Text>
                  <Text style={s.infoText}>@{stripAppId(data.me?.userName)}</Text>
                  <View style={s.balanceBox}>
                    <Text style={s.balanceTxt}>{data.balance?.balance || 0}</Text>
                    <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: 'bold' }}>DIEM TICH LUY</Text>
                  </View>
                </View>
                <Pressable onPress={() => rootController.claimAll()} style={[s.btn, { marginTop: 20 }]}>
                  <Text style={s.btnText}>Nhan thuong nhiem vu</Text>
                </Pressable>
                <Pressable onPress={() => rootController.onLogout()} style={[s.btn, { backgroundColor: '#fee2e2', marginTop: 15, borderWidth: 1, borderColor: '#fecaca' }]}>
                  <Text style={[s.btnText, { color: '#dc2626' }]}>Dang xuat khoi thiet bi</Text>
                </Pressable>
              </View>
            )}

            {tab === 'compose' && (
              <View style={s.center}><Text style={s.infoText}>Tinh nang dang bai dang phat trien</Text></View>
            )}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => {
              closeProfileWall();
              rootController.setTab(t.key);
            }} style={s.tab}>
              <Text style={{ fontSize: 22, color: active ? '#2563eb' : '#94a3b8' }}>{t.icon}</Text>
              <Text style={{ fontSize: 10, color: active ? '#2563eb' : '#94a3b8', marginTop: 3, fontWeight: active ? 'bold' : 'normal' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={!!activeVideo?.url}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveVideo(null)}
      >
        <View style={s.videoOverlay}>
          <View style={s.videoModalCard}>
            <Pressable onPress={() => setActiveVideo(null)} style={s.videoClose}>
              <Text style={s.videoCloseText}>Dong</Text>
            </Pressable>

            {activeVideo?.url ? (
              <Video
                source={{ uri: activeVideo.url }}
                style={s.videoPlayer}
                controls
                paused={false}
                resizeMode="contain"
                poster={activeVideo.thumbUrl ? { source: { uri: activeVideo.thumbUrl } } : undefined}
                posterResizeMode="cover"
                onLoadStart={() => {
                  if (__DEV__) console.log('[VideoPlayer] load start', activeVideo.url);
                }}
                onLoad={event => {
                  if (__DEV__) console.log('[VideoPlayer] loaded', {
                    url: activeVideo.url,
                    duration: event.duration,
                    naturalSize: event.naturalSize,
                  });
                }}
                onError={error => {
                  console.log('[VideoPlayer] error', {
                    url: activeVideo.url,
                    error,
                  });
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 4, justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 26, fontWeight: '900', color: '#2563eb', letterSpacing: -1 },
  header: { height: 60, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardProfile: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 30, elevation: 4 },
  btn: { height: 54, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tinyBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  tinyBtnGhost: { backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  tinyBtnGhostText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  infoText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  cardPost: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pName: { color: '#1e293b', fontWeight: '700', fontSize: 15 },
  pTime: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  pBody: { color: '#334155', fontSize: 14, lineHeight: 22, marginTop: 12 },
  pActions: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 10 },
  pAction: { paddingVertical: 4 },
  pActionText: { color: '#2563eb', fontWeight: '700' },
  mediaBox: { height: 220, backgroundColor: '#f1f5f9', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12, overflow: 'hidden', position: 'relative' },
  storySection: { marginBottom: 18 },
  storyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  storyHint: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  storyRow: { paddingRight: 12 },
  storyCard: { width: 124, height: 196, marginTop: 0, marginRight: 12, justifyContent: 'flex-end', alignItems: 'stretch', backgroundColor: '#cbd5e1' },
  storyImage: { width: '100%', height: '100%' },
  storyTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center' },
  storyAuthor: { color: '#ffffff', fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1, textShadowColor: 'rgba(15, 23, 42, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  storyBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  storyTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 16, textShadowColor: 'rgba(15, 23, 42, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  mediaBoxDisabled: { opacity: 0.95 },
  mediaImage: { width: '100%', height: '100%' },
  mediaFallback: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  mediaFallbackTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  mediaFallbackHint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  playBadge: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -18, backgroundColor: 'rgba(15, 23, 42, 0.72)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  playBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  countBadge: { position: 'absolute', right: 12, top: 12, backgroundColor: 'rgba(15, 23, 42, 0.72)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  videoOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.82)', justifyContent: 'center', padding: 16 },
  videoModalCard: { backgroundColor: '#020617', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  videoPlayer: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000000' },
  videoClose: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 12 },
  videoCloseText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: '#64748b', fontWeight: '800', fontSize: 13, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase' },
  emptyInline: { color: '#94a3b8', marginLeft: 4, marginBottom: 8 },
  friendRowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 14, paddingHorizontal: 16 },
  friendIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  friendActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { height: 75, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff', paddingBottom: 12 },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 100 },
  balanceBox: { marginTop: 25, alignItems: 'center', backgroundColor: '#eff6ff', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 20 },
  balanceTxt: { color: '#2563eb', fontSize: 36, fontWeight: '900' },
});
