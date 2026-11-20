import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth/AuthContext';
import {
  canCreateOrders,
  canManageOrders,
  canViewOrders,
} from '@/lib/auth/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { colors } from '@/constants/theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, {user?.name ?? 'Staff'}</Text>
      <Text style={styles.meta}>
        {user?.businessSlug} · {user?.roles.join(', ')}
      </Text>

      <View style={styles.actions}>
        <PermissionGate anyOf={['orders.create', 'orders.serve', 'orders.manage']}>
          <Link href="/(main)/menu" asChild>
            <Pressable style={styles.primaryCard}>
              <Text style={styles.primaryTitle}>New order</Text>
              <Text style={styles.primarySub}>Browse menu and add items</Text>
            </Pressable>
          </Link>
        </PermissionGate>

        <PermissionGate anyOf={['orders.view', 'orders.manage', 'orders.serve']}>
          <Pressable style={styles.card} onPress={() => router.push('/(main)/orders')}>
            <Text style={styles.cardTitle}>Open orders</Text>
            <Text style={styles.cardSub}>Active tickets and held drafts</Text>
          </Pressable>
        </PermissionGate>

        {!canCreateOrders(user) && !canViewOrders(user) ? (
          <Text style={styles.note}>Your role has limited POS access on mobile v1.</Text>
        ) : null}
      </View>

      <View style={styles.todoBox}>
        <Text style={styles.todoTitle}>Coming soon</Text>
        <Text style={styles.todoItem}>• KOT / receipt printing</Text>
        <Text style={styles.todoItem}>• Offline queue & sync</Text>
        <Text style={styles.todoItem}>• Reports & dashboard</Text>
        <Text style={styles.todoItem}>• Floor plan & table service</Text>
        {!canManageOrders(user) ? (
          <Text style={styles.todoItem}>• Shift / business-day open & close (managers)</Text>
        ) : null}
      </View>

      <Pressable style={styles.logout} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  actions: { gap: 12 },
  primaryCard: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 14,
  },
  primaryTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  primarySub: { color: '#ccfbf1', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  note: { marginTop: 12, color: colors.textMuted, fontSize: 13 },
  todoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todoTitle: { fontWeight: '700', marginBottom: 8, color: colors.text },
  todoItem: { color: colors.textMuted, fontSize: 13, lineHeight: 22 },
  logout: { marginTop: 'auto', paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '600' },
});