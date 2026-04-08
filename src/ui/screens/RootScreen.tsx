import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useController } from '../core/useController';
import { RootController } from '../controllers/RootController';
import { AuthScreen } from './AuthScreen';
import { MainAppScreen } from './MainAppScreen';

export function RootScreen() {
  const [rootState, rootController] = useController(RootController);

  const { booting, session } = rootState;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const previousSessionRef = useRef<boolean | null>(null);
  const previousBootingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!__DEV__) return;

    console.log('[RootScreen] mounted', {
      appState: appStateRef.current,
    });

    const subscription = AppState.addEventListener('change', nextState => {
      console.log('[AppState] change', {
        from: appStateRef.current,
        to: nextState,
      });
      appStateRef.current = nextState;
    });

    return () => {
      console.log('[RootScreen] unmounted');
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) return;

    const hasSession = !!session;
    if (previousSessionRef.current !== hasSession) {
      console.log('[RootScreen] session-changed', {
        from: previousSessionRef.current,
        to: hasSession,
        user: session?.phone,
      });
      previousSessionRef.current = hasSession;
    }
  }, [session]);

  useEffect(() => {
    if (!__DEV__) return;

    if (previousBootingRef.current !== booting) {
      console.log('[RootScreen] booting-changed', {
        from: previousBootingRef.current,
        to: booting,
      });
      previousBootingRef.current = booting;
    }
  }, [booting]);

  if (booting) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Đang khởi tạo EricApp...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" />
        <AuthScreen rootController={rootController} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <MainAppScreen rootController={rootController} rootState={rootState} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 4, justifyContent: 'center', alignItems: 'center' },
});
