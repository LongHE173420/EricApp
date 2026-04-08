import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { Avatar } from '../../components/Avatar';
import { PostCard } from '../../components/PostCard';
import { MediaView } from '../../components/MediaView';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { isVideoUrl, mediaOf, stripAppId, textOf } from '../../utils/DisplayUtils';
import { MediaAsset } from '../../types';

interface ProfileTabViewProps {
  data: any;
  rootController: RootController;
  onPlayVideo: (asset: MediaAsset) => void;
}

export function ProfileTabView({ data, rootController, onPlayVideo }: ProfileTabViewProps) {
  return (
    <View style={{ padding: 12 }}>
      <View style={[styles.cardProfile, { alignItems: 'center', paddingVertical: 36, marginBottom: 15 }]}>
        <Avatar uri={data.me?.avatar} label={stripAppId(data.me?.fullName || '?')} size={96} />
        <Text style={[cs.pName, { marginTop: 16, fontSize: 20 }]}>
          {stripAppId(data.me?.fullName || 'Người dùng Eric')}
        </Text>
        <Text style={cs.infoText}>@{stripAppId(data.me?.userName)}</Text>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceTxt}>{data.balance?.balance || 0}</Text>
          <Text style={styles.balanceLabel}>ĐIỂM TÍCH LŨY</Text>
        </View>
        
        <View style={{ flexDirection: 'row', marginTop: 25, gap: 10 }}>
          <Pressable onPress={() => rootController.claimAll()} style={[cs.btn, { flex: 1, height: 44 }]}>
            <Text style={cs.btnText}>Nhận thưởng</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => rootController.onLogout()} 
            style={[cs.btn, styles.logoutBtn, { flex: 1, height: 44 }]}
          >
            <Text style={[cs.btnText, { color: '#dc2626' }]}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>

      {data.profileSurf && data.profileSurf.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[cs.sectionTitle, { marginLeft: 4, marginBottom: 10 }]}>Tin ngắn của tôi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.profileSurf.map((s: any, idx: number) => {
              const media = mediaOf(s);
              const first = media[0];
              if (!first) return null;
              return (
                <MediaView
                  key={`mysurf-${s.id || idx}`}
                  asset={first}
                  variant="story"
                  storyAuthor={data.me}
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

      <View style={{ marginBottom: 40 }}>
        <Text style={[cs.sectionTitle, { marginLeft: 4, marginBottom: 10 }]}>Bài viết đã đăng</Text>
        {data.profileFeed && data.profileFeed.length > 0 ? (
          data.profileFeed.map((p: any, idx: number) => (
            <PostCard
              key={`mypost-${p.id || idx}`}
              post={p}
              currentUser={data.me}
              rootController={rootController}
              onPressAuthor={() => {}}
              onPressVideo={onPlayVideo}
            />
          ))
        ) : (
          <Text style={cs.emptyInline}>Bạn chưa đăng bài viết nào</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardProfile: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 30, elevation: 4 },
  balanceBox: { marginTop: 25, alignItems: 'center', backgroundColor: '#eff6ff', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 20 },
  balanceTxt: { color: '#2563eb', fontSize: 36, fontWeight: '900' },
  balanceLabel: { color: '#3b82f6', fontSize: 13, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
});
