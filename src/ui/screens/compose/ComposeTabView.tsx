import React from 'react';
import { View, Text } from 'react-native';
import { commonStyles as cs } from '../../styles/CommonStyles';

export function ComposeTabView() {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Text style={cs.infoText}>Tính năng đăng bài sẽ sớm ra mắt!</Text>
    </View>
  );
}
