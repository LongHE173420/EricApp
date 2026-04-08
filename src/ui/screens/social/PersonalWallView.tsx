import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { Avatar } from '../../components/Avatar';
import { stripAppId } from '../../utils/DisplayUtils';
import { commonStyles as cs } from '../../styles/CommonStyles';

interface PersonalWallViewProps {
  profileId: string;
  profileData: any;
  data: any; // Global app data for relationship state
  rootController: RootController;
  onClose: () => void;
}

export function PersonalWallView({
  profileId,
  profileData,
  data,
  rootController,
  onClose,
}: PersonalWallViewProps) {
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
      
      {profileData ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Avatar uri={profileData?.avatar} label={stripAppId(profileData?.fullName || profileData?.userName) || '?'} size={96} />
          <Text style={[cs.pName, { marginTop: 16, fontSize: 20 }]}>
            {stripAppId(profileData?.fullName || profileData?.userName) || 'Người dùng Bí ẩn'}
          </Text>
          <Text style={cs.infoText}>
            {profileData?.userName ? `@${stripAppId(profileData.userName)}` : ''}
          </Text>

          {renderProfileActions()}
        </View>
      ) : (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 12, borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backButton: { color: '#3b82f6', fontWeight: 'bold' },
  headerTitle: { fontWeight: 'bold', fontSize: 16 },
});
