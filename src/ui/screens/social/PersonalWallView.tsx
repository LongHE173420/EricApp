import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { Avatar } from '../../components/Avatar';
import { PostCard } from '../../components/PostCard';
import { MediaView } from '../../components/MediaView';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { isVideoUrl, mediaOf, resolveAuthor, stripAppId, textOf } from '../../utils/DisplayUtils';
import { MediaAsset } from '../../types';

interface PersonalWallViewProps {
  profileId: string;
  profileContent: { profile: any; feed: any[]; surf: any[] } | null;
  data: any; // Global app data for relationship state
  rootController: RootController;
  onClose: () => void;
  onPlayVideo: (asset: MediaAsset) => void;
}

export function PersonalWallView({
  profileId,
  profileContent,
  data,
  rootController,
  onClose,
  onPlayVideo,
}: PersonalWallViewProps) {
  const profileData = profileContent?.profile;
  const profileFeed = profileContent?.feed || [];
  const profileSurf = profileContent?.surf || [];

  const renderProfileActions = () => {
    if (!profileId || profileData?.isError) return null;

    const myId = String(data.me?.id || data.me?.userId || data.me?.accountId || '');
    if (myId === profileId) {
      return <Text style={[cs.infoText, { marginTop: 20 }]}>Đây là trang cá nhân của bạn</Text>;
    }

    const isFriend = data.friends.some((f: any) => String(f?.id || f?.friendId || f?.userId || f?.friend?.id) === profileId);
    const isSent = data.sentFriendRequests.some((r: any) => String(r?.receiverId || r?.receiver?.id || r?.id) === profileId);
    const isReceived = data.friendRequests.some((r: any) => String(r?.senderId || r?.sender?.id || r?.id) === profileId);

    if (isFriend) {
      return (
        <Pressable
          onPress={() => rootController.deleteFriend(profileId)}
          style={[cs.btn, { backgroundColor: '#e2e8f0', marginTop: 20, paddingHorizontal: 30 }]}
        >
          <Text style={[cs.btnText, { color: '#0f172a' }]}>Hủy kết bạn</Text>
        </Pressable>
      );
    }

    if (isSent) {
      return (
        <Pressable
          onPress={() => rootController.cancelFriendRequest(profileId)}
          style={[cs.btn, { backgroundColor: '#e2e8f0', marginTop: 20, paddingHorizontal: 30 }]}
        >
          <Text style={[cs.btnText, { color: '#0f172a' }]}>Hủy lời mời</Text>
        </Pressable>
      );
    }

    if (isReceived) {
      return (
        <Pressable
          onPress={() => rootController.acceptRequest(profileId)}
          style={[cs.btn, { marginTop: 20, paddingHorizontal: 30 }]}
        >
          <Text style={cs.btnText}>Chấp nhận kết bạn</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => rootController.sendFriendRequest(profileId)}
        style={[cs.btn, { marginTop: 20, paddingHorizontal: 30 }]}
      >
        <Text style={cs.btnText}>Thêm kết bạn</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={{ marginRight: 15 }}>
          <Text style={styles.backButton}>{'< Quay lại'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Tường cá nhân</Text>
      </View>

      {profileContent ? (
        <View style={{ paddingBottom: 40 }}>
          <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Avatar uri={profileData?.avatar} label={stripAppId(profileData?.fullName || profileData?.userName) || '?'} size={96} />
            <Text style={[cs.pName, { marginTop: 16, fontSize: 20 }]}>
              {stripAppId(profileData?.fullName || profileData?.userName) || 'Người dùng Bí ẩn'}
            </Text>
            <Text style={cs.infoText}>
              {profileData?.userName ? `@${stripAppId(profileData.userName)}` : ''}
            </Text>

            {renderProfileActions()}
          </View>

          {profileSurf.length > 0 && (
            <View style={{ marginTop: 15, paddingLeft: 12 }}>
              <Text style={[cs.sectionTitle, { marginLeft: 4, marginBottom: 10 }]}>Tin ngắn</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {profileSurf.map((s: any, idx: number) => {
                  const media = mediaOf(s);
                  const first = media[0];
                  if (!first) return null;
                  return (
                    <MediaView
                      key={`psurf-${s.id || idx}`}
                      asset={first}
                      variant="story"
                      storyAuthor={profileData}
                      storyTitle={textOf(s.content) || 'Surf'}
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
          )}

          <View style={{ padding: 12 }}>
            <Text style={[cs.sectionTitle, { marginLeft: 4, marginBottom: 10 }]}>Bài viết</Text>
            {profileFeed.length === 0 ? (
              <Text style={cs.emptyInline}>Chưa có bài viết nào công khai</Text>
            ) : (
              profileFeed.map((p: any, idx: number) => (
                <PostCard
                  key={`pfeed-${p.id || idx}`}
                  post={p}
                  currentUser={data.me}
                  rootController={rootController}
                  onPressAuthor={() => {}}
                  onPressVideo={onPlayVideo}
                />
              ))
            )}
          </View>
        </View>
      ) : (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Đang tải nội dung...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backButton: { color: '#3b82f6', fontWeight: 'bold' },
  headerTitle: { fontWeight: 'bold', fontSize: 16 },
});
