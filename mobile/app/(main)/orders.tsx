import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useHeldOrders, useOrders } from '@/lib/hooks/queries';
import type { Order } from '@/lib/api/types';
import { canViewOrders } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';
import { colors } from '@/constants/theme';

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const total = Number(order.totalAmount);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {order.ticketLabel ?? (order.ticketNumber != null ? `#${order.ticketNumber}` : order.id.slice(0, 8))}
          {order.isDraft ? ' · Held' : ''}
        </Text>
        <Text style={styles.sub}>
          {order.status} · {order.orderType ?? 'DINE_IN'} · {order.items?.length ?? 0} items
        </Text>
      </View>
      <Text style={styles.total}>{total.toFixed(2)}</Text>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const activeQuery = useOrders({ statusGroup: 'active', limit: 40 });
  const heldQuery = useHeldOrders();

  if (!canViewOrders(user)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>You do not have permission to view orders.</Text>
      </View>
    );
  }

  const loading = activeQuery.isLoading || heldQuery.isLoading;
  const orders = [
    ...(heldQuery.data?.orders ?? []),
    ...(activeQuery.data?.orders ?? []).filter((o) => !o.isDraft),
  ];

  const unique = Array.from(new Map(orders.map((o) => [o.id, o])).values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={unique}
          keyExtractor={(item) => item.id}
          refreshing={activeQuery.isRefetching}
          onRefresh={() => {
            void activeQuery.refetch();
            void heldQuery.refetch();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <OrderRow order={item} onPress={() => router.push(`/order/${item.id}`)} />
          )}
          ListEmptyComponent={<Text style={styles.muted}>No open orders right now.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  total: { fontSize: 15, fontWeight: '700', color: colors.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, textAlign: 'center', padding: 24 },
});