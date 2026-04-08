import React from 'react';
import { Image, Text, View } from 'react-native';

interface AvatarProps {
  uri?: string;
  label: string;
  size?: number;
}

export function Avatar({ uri, label, size = 40 }: AvatarProps) {
  const r = size / 2;
  const initial = (label || 'U').slice(0, 1).toUpperCase();
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r, backgroundColor: '#f1f5f9' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}
