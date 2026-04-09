import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardPost: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  pName: { color: '#1e293b', fontWeight: '700', fontSize: 15 },
  pTime: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  pBody: { color: '#334155', fontSize: 14, lineHeight: 22, marginTop: 12 },
  infoText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  btn: { height: 54, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#64748b', fontWeight: '800', fontSize: 13, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 100 },
  emptyInline: { color: '#94a3b8', marginLeft: 4, marginBottom: 8 },
  pMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pMetricsText: { color: '#64748b', fontSize: 13, marginLeft: 4 },
  pActionActive: { color: '#2563eb', fontWeight: '800' },
});
