import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text,
  TextInput, View
} from 'react-native';
import { useController } from '../core/useController';
import { AuthController } from '../controllers/AuthController';
import { RootController } from '../controllers/RootController';

interface AuthScreenProps {
  rootController: RootController;
}

export function AuthScreen({ rootController }: AuthScreenProps) {
  const [authState, authController] = useController(AuthController, rootController);
  const { loginStep, phone, password, otpPhone, otp, trustDevice, loading } = authState;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>EricApp</Text>
        <View style={s.card}>
          {loginStep === 'credentials' ? (
            <>
              <Text style={s.label}>Email / So dien thoai</Text>
              <TextInput
                value={phone}
                onChangeText={authController.setPhone}
                style={s.input}
                placeholder="username / user@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={s.label}>Mat khau</Text>
              <TextInput
                value={password}
                onChangeText={authController.setPassword}
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
              <Pressable onPress={() => authController.onLogin()} style={s.btn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Dang nhap</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.infoText}>Ma OTP da duoc gui den {otpPhone}</Text>
              <TextInput
                value={otp}
                onChangeText={authController.setOtp}
                style={s.input}
                placeholder="Nhap ma OTP"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
              <Pressable onPress={() => authController.setTrustDevice(!trustDevice)} style={s.checkRow}>
                <View style={[s.checkBox, trustDevice && s.checkBoxActive]}>
                  {trustDevice ? <Text style={s.checkMark}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.checkTitle}>Tin cay thiet bi nay</Text>
                  <Text style={s.checkHint}>Neu dong y, lan sau dang nhap tren may nay co the se khong can nhap OTP nua.</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => authController.onVerify()} style={s.btn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Xac thuc</Text>}
              </Pressable>
              <Pressable onPress={() => authController.setLoginStep('credentials')} style={{ marginTop: 12 }}>
                <Text style={s.link}>Quay lai dang nhap</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  brand: { fontSize: 26, fontWeight: '900', color: '#2563eb', letterSpacing: -1, marginBottom: 20, textAlign: 'center' },
  authScroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6, marginLeft: 2 },
  input: { height: 54, backgroundColor: '#f1f5f9', borderRadius: 12, color: '#0f172a', paddingHorizontal: 16, marginBottom: 16, fontSize: 15 },
  btn: { height: 54, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  infoText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  link: { color: '#2563eb', textAlign: 'center', fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingHorizontal: 2 },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#cbd5e1', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  checkBoxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkMark: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  checkTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  checkHint: { color: '#64748b', fontSize: 12, lineHeight: 17, marginTop: 2 },
});
