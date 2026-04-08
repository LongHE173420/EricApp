import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { Avatar } from '../../components/Avatar';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { friendAvatarOf, friendNameOf, pickFirst, stripAppId } from '../../utils/DisplayUtils';

interface FriendsTabViewProps {
  data: any;
  rootController: RootController;
  onOpenProfile: (userId: string) => void;
}

export function FriendsTabView({
  data,
  rootController,
  onOpenProfile,
}: FriendsTabViewProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  return (
    <View style={{ padding: 12 }}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bạn bè..."
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={doSearch}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Tìm</Text>
        </Pressable>
      </View>

      {isSearching ? <ActivityIndicator size="small" color="#3b82f6" style={{ marginBottom: 20 }} /> : null}
      
      {!isSearching && searchResults.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
          <Text style={cs.sectionTitle}>Kết quả tìm kiếm ({searchResults.length})</Text>
          {searchResults.map((r: any, index: number) => {
            const sId = String(r?.id || r?.userId || index);
            return (
              <Pressable key={`search-${sId}`} style={[cs.card, styles.friendRowCard]} onPress={() => onOpenProfile(sId)}>
                <View style={styles.friendIdentity}>
                  <Avatar uri={r?.avatar} label={r?.fullName || r?.userName || '?'} size={34} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={cs.pName}>{r?.fullName || r?.userName || 'Người dùng'}</Text>
                    <Text style={cs.pTime}>@{stripAppId(r?.userName || 'unknown')}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={cs.sectionTitle}>Lời mời kết bạn ({data.friendRequests.length})</Text>
      {data.friendRequests.length === 0 ? (
        <Text style={cs.emptyInline}>Không có lời mời mới</Text>
      ) : (
        data.friendRequests.map((r: any, index: number) => {
          const senderId = String(r?.senderId || r?.sender?.id || r?.id || index);
          return (
            <View key={`received-${senderId}`} style={[cs.card, styles.friendRowCard]}>
              <Pressable style={styles.friendIdentity} onPress={() => onOpenProfile(senderId)}>
                <Avatar uri={friendAvatarOf(r)} label={friendNameOf(r)} size={34} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={cs.pName}>{friendNameOf(r)}</Text>
                  <Text style={cs.pTime}>Muốn kết nối với bạn</Text>
                </View>
              </Pressable>
              <View style={styles.friendActionRow}>
                <Pressable style={styles.tinyBtnGhost} onPress={() => rootController.rejectRequest(senderId)}>
                  <Text style={styles.tinyBtnGhostText}>Từ chối</Text>
                </Pressable>
                <Pressable style={styles.tinyBtn} onPress={() => rootController.acceptRequest(senderId)}>
                  <Text style={cs.btnText}>Đồng ý</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <Text style={[cs.sectionTitle, { marginTop: 20 }]}>Đã gửi ({data.sentFriendRequests.length})</Text>
      {data.sentFriendRequests.length === 0 ? (
        <Text style={cs.emptyInline}>Chưa có lời mời đã gửi</Text>
      ) : (
        data.sentFriendRequests.map((r: any, index: number) => {
          const receiverId = String(r?.receiverId || r?.receiver?.id || r?.id || index);
          return (
            <View key={`sent-${receiverId}`} style={[cs.card, styles.friendRowCard]}>
              <Pressable style={styles.friendIdentity} onPress={() => onOpenProfile(receiverId)}>
                <Avatar uri={friendAvatarOf(r)} label={friendNameOf(r)} size={34} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={cs.pName}>{friendNameOf(r)}</Text>
                  <Text style={cs.pTime}>Đang chờ phản hồi</Text>
                </View>
              </Pressable>
            </View>
          );
        })
      )}

      <Text style={[cs.sectionTitle, { marginTop: 20 }]}>Bạn bè của tôi ({data.friends.length})</Text>
      {data.friends.length === 0 ? (
        <Text style={cs.emptyInline}>Chưa có bạn bè nào</Text>
      ) : (
        data.friends.map((f: any, index: number) => {
          const friendId = String(f?.id || f?.friendId || f?.userId || f?.friend?.id || index);
          return (
            <View key={`friend-${friendId}`} style={[cs.card, styles.friendRowCard]}>
              <Pressable style={styles.friendIdentity} onPress={() => onOpenProfile(friendId)}>
                <Avatar uri={friendAvatarOf(f)} label={friendNameOf(f)} size={36} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={cs.pName}>{friendNameOf(f)}</Text>
                  <Text style={cs.pTime}>@{stripAppId(pickFirst(f?.userName, f?.username, f?.email) || 'username')}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.tinyBtnGhost} onPress={() => rootController.deleteFriend(friendId)}>
                <Text style={styles.tinyBtnGhostText}>Xóa</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: 15 },
  searchBtn: { marginLeft: 10, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 },
  friendRowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 14, paddingHorizontal: 16 },
  friendIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  friendActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tinyBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  tinyBtnGhost: { backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  tinyBtnGhostText: { color: '#475569', fontWeight: '700', fontSize: 13 },
});
