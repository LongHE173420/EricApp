import React, { useState } from 'react';
import {
  Modal, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View, Alert
} from 'react-native';
import Video from 'react-native-video';
import { RootController, Tab } from '../../controllers/RootController';

// Modular Components
import { MediaAsset } from '../../types';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { HomeTabView } from '../home/HomeTabView';
import { FriendsTabView } from '../social/FriendsTabView';
import { NotificationsTabView } from '../notifications/NotificationsTabView';
import { ProfileTabView } from '../profile/ProfileTabView';
import { ComposeTabView } from '../compose/ComposeTabView';
import { PersonalWallView } from '../social/PersonalWallView';

const TABS: Array<{ key: Tab; icon: string; label: string }> = [
  { key: 'home', icon: '\uD83C\uDFE0', label: 'Home' },
  { key: 'compose', icon: '\u270F\uFE0F', label: 'Add' },
  { key: 'friends', icon: '\uD83D\uDC65', label: 'People' },
  { key: 'alerts', icon: '\u23F0', label: 'Alerts' },
  { key: 'profile', icon: '\uD83D\uDC64', label: 'Me' },
];

interface MainAppScreenProps {
  rootController: RootController;
  rootState: ReturnType<RootController['getState']>;
}

export function MainAppScreen({ rootController, rootState }: MainAppScreenProps) {
  const { session, data, tab, refreshing } = rootState;

  // States for sub-views orchestration
  const [activeVideo, setActiveVideo] = useState<MediaAsset | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [viewingProfileContent, setViewingProfileContent] = useState<{ profile: any; feed: any[]; surf: any[] } | null>(null);

  const openProfileWall = async (userId: string) => {
    setViewingProfileId(String(userId));
    setViewingProfileContent(null);
    try {
      const content = await rootController.getProfileContent(String(userId));
      setViewingProfileContent({
        profile: content.profile || { fullName: 'Người dùng này chưa có thông tin', userName: '' },
        feed: content.feed || [],
        surf: content.surf || [],
      });
    } catch (e: any) {
      console.log('[openProfileWall] Error:', e?.response?.status, e?.response?.data || e?.message);
      const status = e?.response?.status || 'Unknown';
      const msg = e?.response?.data?.message || e?.message || JSON.stringify(e?.response?.data);
      if (__DEV__) {
        Alert.alert(`Test Lỗi API (User ID: ${userId})`, `Status: ${status}\nMessage: ${msg}`);
      }
      setViewingProfileContent({
        profile: { fullName: 'Lỗi tải trang cá nhân', userName: 'Không thể truy xuất dữ liệu', isError: true },
        feed: [],
        surf: [],
      });
    }
  };

  const closeProfileWall = () => {
    setViewingProfileId(null);
    setViewingProfileContent(null);
  };

  if (!session) return null;

  return (
    <>
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
          <PersonalWallView
            profileId={viewingProfileId}
            profileContent={viewingProfileContent}
            data={data}
            rootController={rootController}
            onClose={closeProfileWall}
            onPlayVideo={setActiveVideo}
          />
        ) : (
          <>
            {tab === 'home' && (
              <HomeTabView
                data={data}
                rootController={rootController}
                onOpenProfile={openProfileWall}
                onPlayVideo={setActiveVideo}
              />
            )}

            {tab === 'compose' && <ComposeTabView />}

            {tab === 'friends' && (
              <FriendsTabView
                data={data}
                rootController={rootController}
                onOpenProfile={openProfileWall}
              />
            )}

            {tab === 'alerts' && <NotificationsTabView data={data} />}

            {tab === 'profile' && <ProfileTabView data={data} rootController={rootController} onPlayVideo={setActiveVideo} />}
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

      {/* Global Video Player Modal */}
      <Modal visible={!!activeVideo} transparent animationType="fade" onRequestClose={() => setActiveVideo(null)}>
        <View style={s.videoOverlay}>
          <View style={s.videoModalCard}>
            <View style={{ backgroundColor: '#0f172a', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
              <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
                {activeVideo?.url ? 'Đang phát video' : 'Video Player'}
              </Text>
            </View>
            <Video
              source={{ uri: activeVideo?.url || '' }}
              style={s.videoPlayer}
              controls
              resizeMode="contain"
              onError={e => console.log('[VideoPlayer] error', e)}
            />
            <Pressable onPress={() => setActiveVideo(null)} style={s.videoClose}>
              <Text style={s.videoCloseText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  brand: { fontSize: 26, fontWeight: '900', color: '#2563eb', letterSpacing: -1 },
  header: { height: 60, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  footer: { height: 75, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff', paddingBottom: 12 },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.82)', justifyContent: 'center', padding: 16 },
  videoModalCard: { backgroundColor: '#020617', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  videoPlayer: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000000' },
  videoClose: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 12 },
  videoCloseText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
