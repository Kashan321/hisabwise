import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useOrder } from '@/lib/hooks/queries';
import {
  useCompleteOrderWithPayment,
  useSendOrderToKitchen,
} from '@/lib/hooks/mutations';
import { PermissionGate } from '@/components/PermissionGate';
import { canManageOrders } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { colors } from '@/constants/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: order, isLoading, isError, refetch, isRefetching } = useOrder(id);
  const sendToKitchen = useSendOrderToKitchen();
  const completePayment = useCompleteOrderWithPayment();
  const [cashReceived, setCashReceived] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Could not load order.</Text>
        <Pressable onPress={() => void refetch()}>
          <Text style={styles.link}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const total = Number(order.totalAmount);
  const isPaid = order.paymentStatus === 'PAID' || order.status === 'COMPLETED';

  async function onSendKitchen() {
    setBusy(true);
    try {
      await sendToKitchen.mutateAsync(order!.id);
      await refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof ApiError ? e.message : 'Failed to send to kitchen');
    } finally {
      setBusy(false);
    }
  }

  async function onCashPay() {
    const received = parseFloat(cashReceived) || total;
    if (received < total - 0.001) {
      Alert.alert('Invalid amount', 'Cash received must cover the total.');
      return;
    }
    setBusy(true);
    try {
      await completePayment.mutateAsync({
        id: order!.id,
        status: 'COMPLETED',
        totalAmount: total,
        payments: [{ method: 'CASH', amount: total, amountReceived: received }],
      });
      setCashReceived('');
      await refetch();
      Alert.alert('Paid', 'Order marked complete.');
    } catch (e) {
      Alert.alert('Error', e instanceof ApiError ? e.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={undefined}>
      <Pressable onPress={() => void refetch()} style={styles.refreshHint}>
        <Text style={styles.link}>{isRefetching ? 'Refreshing…' : 'Pull to refresh in list view'}</Text>
      </Pressable>

      <Text style={styles.ticket}>
        {order.ticketLabel ?? (order.ticketNumber != null ? `Ticket #${order.ticketNumber}` : 'Order')}
      </Text>
      <Text style={styles.meta}>
        {order.status}
        {order.isDraft ? ' · Draft' : ''} · {order.paymentStatus ?? 'PENDING'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items ?? []).map((line) => (
          <View key={line.id} style={styles.lineRow}>
            <Text style={styles.lineName}>
              {line.quantity}× {line.menuItemName}
              {line.variantName ? ` (${line.variantName})` : ''}
            </Text>
            <Text style={styles.lineTotal}>{Number(line.lineTotal).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.total}>Total {total.toFixed(2)}</Text>

      {order.isDraft ? (
        <PermissionGate anyOf={['orders.serve', 'orders.manage']}>
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onSendKitchen()}>
            <Text style={styles.primaryText}>Send to kitchen (KOT)</Text>
          </Pressable>
        </PermissionGate>
      ) : null}

      {!isPaid && !order.isDraft ? (
        <PermissionGate anyOf={['orders.manage', 'cash.shift']}>
          <View style={styles.payBox}>
            <Text style={styles.sectionTitle}>Cash payment</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder={`Received (default ${total.toFixed(2)})`}
              value={cashReceived}
              onChangeText={setCashReceived}
            />
            <Pressable
              style={[styles.primaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => void onCashPay()}>
              <Text style={styles.primaryText}>Complete with cash</Text>
            </Pressable>
          </View>
        </PermissionGate>
      ) : null}

      {!canManageOrders(user) && order.isDraft ? (
        <Text style={styles.note}>Managers can fire KOT and take payment on this screen.</Text>
      ) : null}

      {/* TODO: item edits via PATCH pricing, change requests, merge/transfer */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
  refreshHint: { marginBottom: 8 },
  ticket: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginBottom: 16 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: colors.text },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineName: { flex: 1, color: colors.text, fontSize: 14 },
  lineTotal: { fontWeight: '600', color: colors.text },
  total: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  payBox: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
});