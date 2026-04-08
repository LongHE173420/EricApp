import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../ui/controllers/RootController';
import { commonStyles as cs } from '../styles/CommonStyles';
import { MediaAsset } from '../types';
import { isVideoUrl, mediaOf, resolveAuthor, textOf, timeOf } from '../utils/DisplayUtils';
import { Avatar } from './Avatar';
import { MediaView } from './MediaView';

interface PostCardProps {
  post: any;
  currentUser: any;
  rootController: RootController;
  onPressAuthor?: (userId: string) => void;
  onPressVideo?: (asset: MediaAsset) => void;
}

export function PostCard({
  post,
  currentUser,
  rootController,
  onPressAuthor,
  onPressVideo,
}: PostCardProps) {
  const author = resolveAuthor(post, currentUser);
  const media = mediaOf(post);
  const bodyText = textOf(post.description || post.content);

  return (
    <View style={cs.cardPost}>
      <View style={cs.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => author.id ? onPressAuthor?.(author.id) : null}>
            <Avatar uri={author.avatar} label={author.name} size={36} />
          </Pressable>
          <View style={{ marginLeft: 8 }}>
            <Pressable onPress={() => author.id ? onPressAuthor?.(author.id) : null}>
              <Text style={cs.pName}>{author.name}</Text>
            </Pressable>
            <Text style={cs.pTime}>{timeOf(post.createdAt ?? post.modifiedAt)}</Text>
          </View>
        </View>
      </View>

      {bodyText ? <Text style={cs.pBody}>{bodyText}</Text> : null}
      
      {media[0] ? (
        <MediaView
          asset={media[0]}
          extraCount={Math.max(media.length - 1, 0)}
          onPress={asset => {
            if ((asset.type === 'VIDEO' || isVideoUrl(asset.url)) && asset.url) {
              onPressVideo?.(asset);
            }
          }}
        />
      ) : null}

      <View style={styles.pActions}>
        <Pressable 
          onPress={() => rootController.onReact(String(post.id ?? post.postId ?? ''))} 
          style={styles.pAction}
        >
          <Text style={styles.pActionText}>Thích</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pActions: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 10 },
  pAction: { paddingVertical: 4 },
  pActionText: { color: '#2563eb', fontWeight: '700' },
});
