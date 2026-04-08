import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import { MediaAsset, AuthorInfo } from '../types';
import { isLocalMediaUrl } from '../utils/DisplayUtils';
import { FAILED_REMOTE_THUMBNAIL_URLS, GENERATED_THUMBNAIL_CACHE, THUMBNAIL_TIMESTAMPS } from '../utils/MediaCache';
import { Avatar } from './Avatar';

interface MediaViewProps {
  asset: MediaAsset;
  extraCount?: number;
  onPress?: (asset: MediaAsset) => void;
  variant?: 'default' | 'story';
  storyTitle?: string;
  storyAuthor?: AuthorInfo;
}

export function MediaView({
  asset,
  extraCount = 0,
  onPress,
  variant = 'default',
  storyTitle,
  storyAuthor,
}: MediaViewProps) {
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
          GENERATED_THUMBNAIL_CACHE.set(videoUrl, result.path);
          if (active) setThumbnailUri(result.path);
          return;
        } catch (error) {
          // Retry next timestamp
        }
      }
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
      style={[styles.mediaBox, isStory && styles.storyCard, !asset.url && styles.mediaBoxDisabled]}
    >
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          style={[styles.mediaImage, isStory && styles.storyImage]}
          resizeMode="cover"
          onError={() => {
            if (asset.type === 'VIDEO' && asset.url && previewUri === asset.thumbUrl) {
              FAILED_REMOTE_THUMBNAIL_URLS.add(asset.url);
              setRemoteThumbFailed(true);
            }
          }}
        />
      ) : (
        <View style={styles.mediaFallback}>
          <Text style={styles.mediaFallbackTitle}>{asset.type === 'VIDEO' ? 'Video' : 'Media'}</Text>
          <Text style={styles.mediaFallbackHint}>
            {asset.url ? 'Chạm để mở' : 'Không tìm thấy preview'}
          </Text>
        </View>
      )}

      {isStory && storyAuthor ? (
        <View style={styles.storyTop}>
          <Avatar uri={storyAuthor.avatar} label={storyAuthor.name} size={34} />
          <Text style={styles.storyAuthor} numberOfLines={1}>{storyAuthor.name}</Text>
        </View>
      ) : null}

      {isStory ? (
        <View style={styles.storyBottom}>
          <Text style={styles.storyTitle} numberOfLines={2}>{storyTitle || 'Story'}</Text>
        </View>
      ) : null}

      {asset.type === 'VIDEO' && !isStory && (
        <View style={styles.playBadge}>
          <Text style={styles.playBadgeText}>{'\u25B6'}</Text>
        </View>
      )}

      {extraCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>+{extraCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mediaBox: { height: 220, backgroundColor: '#f1f5f9', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12, overflow: 'hidden', position: 'relative' },
  mediaBoxDisabled: { opacity: 0.95 },
  mediaImage: { width: '100%', height: '100%' },
  mediaFallback: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  mediaFallbackTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  mediaFallbackHint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  storyCard: { width: 124, height: 196, marginTop: 0, marginRight: 12, justifyContent: 'flex-end', alignItems: 'stretch', backgroundColor: '#cbd5e1' },
  storyImage: { width: '100%', height: '100%' },
  storyTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center' },
  storyAuthor: { color: '#ffffff', fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1, textShadowColor: 'rgba(15, 23, 42, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  storyBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  storyTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 16, textShadowColor: 'rgba(15, 23, 42, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  playBadge: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -18, backgroundColor: 'rgba(15, 23, 42, 0.72)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  playBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  countBadge: { position: 'absolute', right: 12, top: 12, backgroundColor: 'rgba(15, 23, 42, 0.72)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});
