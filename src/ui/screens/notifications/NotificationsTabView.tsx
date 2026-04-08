import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { commonStyles as cs } from '../../styles/CommonStyles';
import { timeOf } from '../../utils/DisplayUtils';

interface NotificationsTabViewProps {
  data: any;
}

export function NotificationsTabView({ data }: NotificationsTabViewProps) {
  return (
    <View style={{ padding: 12 }}>
      <Text style={cs.sectionTitle}>Thông báo mới ({data.notifications.length})</Text>
      {data.notifications.length === 0 ? (
        <Text style={cs.empty}>Chưa có thông báo nào</Text>
      ) : (
        data.notifications.map((n: any) => (
          <View key={n.id} style={cs.cardPost}>
            <Text style={styles.notificationText}>
              {n.content || n.title || 'Thông báo mới'}
            </Text>
            <Text style={cs.pTime}>{timeOf(n.createdAt)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notificationText: { color: '#0f172a', fontWeight: '500' },
});
