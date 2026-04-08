import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootController } from '../../controllers/RootController';
import { Avatar } from '../../components/Avatar';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { stripAppId } from '../../utils/DisplayUtils';

interface ProfileTabViewProps {
  data: any;
  rootController: RootController;
}

export function ProfileTabView({ data, rootController }: ProfileTabViewProps) {
  return (
    <View style={{ padding: 20 }}>
      <View style={[styles.cardProfile, { alignItems: 'center', paddingVertical: 40 }]}>
        <Avatar uri={data.me?.avatar} label={stripAppId(data.me?.fullName || '?')} size={96} />
        <Text style={[cs.pName, { marginTop: 16, fontSize: 20 }]}>
          {stripAppId(data.me?.fullName || 'Người dùng Eric')}
        </Text>
        <Text style={cs.infoText}>@{stripAppId(data.me?.userName)}</Text>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceTxt}>{data.balance?.balance || 0}</Text>
          <Text style={styles.balanceLabel}>ĐIỂM TÍCH LŨY</Text>
        </View>
      </View>
      
      <Pressable onPress={() => rootController.claimAll()} style={[cs.btn, { marginTop: 20 }]}>
        <Text style={cs.btnText}>Nhận thưởng nhiệm vụ</Text>
      </Pressable>
      
      <Pressable 
        onPress={() => rootController.onLogout()} 
        style={[cs.btn, styles.logoutBtn]}
      >
        <Text style={[cs.btnText, { color: '#dc2626' }]}>Đăng xuất khỏi thiết bị</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardProfile: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 30, elevation: 4 },
  balanceBox: { marginTop: 25, alignItems: 'center', backgroundColor: '#eff6ff', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 20 },
  balanceTxt: { color: '#2563eb', fontSize: 36, fontWeight: '900' },
  balanceLabel: { color: '#3b82f6', fontSize: 13, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#fee2e2', marginTop: 15, borderWidth: 1, borderColor: '#fecaca' },
});
