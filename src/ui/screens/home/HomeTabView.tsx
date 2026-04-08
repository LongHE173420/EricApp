import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { PostCard } from '../../components/PostCard';
import { MediaView } from '../../components/MediaView';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { isVideoUrl, mediaOf, resolveAuthor, textOf } from '../../utils/DisplayUtils';
import { MediaAsset } from '../../types';

interface HomeTabViewProps {
  data: any;
  rootController: RootController;
  onOpenProfile: (userId: string) => void;
  onPlayVideo: (asset: MediaAsset) => void;
}

export function HomeTabView({
  data,
  rootController,
  onOpenProfile,
  onPlayVideo,
}: HomeTabViewProps) {
  return (
    <View style={{ padding: 12 }}>
      {data.surf.length > 0 ? (
        <View style={styles.storySection}>
          <View style={styles.storyHeader}>
            <Text style={cs.sectionTitle}>Story</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRow}
          >
            {data.surf.map((p: any, index: number) => {
              const author = resolveAuthor(p, data.me);
              const media = mediaOf(p);
              const bodyText = textOf(p.description || p.content);
              const firstMedia = media[0];

              if (!firstMedia) return null;

              return (
                <MediaView
                  key={`story-${String(p.id ?? p.surfId ?? index)}`}
                  asset={firstMedia}
                  variant="story"
                  storyAuthor={author}
                  storyTitle={bodyText || author.name}
                  onPress={asset => {
                    if ((asset.type === 'VIDEO' || isVideoUrl(asset.url)) && asset.url) {
                      onPlayVideo(asset);
                    }
                  }}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {data.feed.length === 0 ? (
        <Text style={cs.empty}>Hết nội dung rồi...</Text>
      ) : (
        data.feed.map((p: any, index: number) => (
          <PostCard
            key={String(p.id ?? p.postId ?? index)}
            post={p}
            currentUser={data.me}
            rootController={rootController}
            onPressAuthor={onOpenProfile}
            onPressVideo={onPlayVideo}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  storySection: { marginBottom: 18 },
  storyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  storyHint: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  storyRow: { paddingRight: 12 },
});
