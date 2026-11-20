import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useCart } from '@/lib/cart/CartContext';
import { createIdempotencyKey, useCreateOrder, useSendOrderToKitchen } from '@/lib/hooks/mutations';
import { hasPermission } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { colors } from '@/constants/theme';

export default function CartScreen() {
  const { lines, subtotal, setQuantity, removeLine, clear, itemCount } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const createOrder = useCreateOrder();
  const sendToKitchen = useSendOrderToKitchen();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission(user, 'orders.manage') || hasPermission(user, '*');
  const placeAsDraft = !canManage;

  async function placeOrder(fireKitchen: boolean) {
    if (lines.length === 0) return;
    setBusy(true);
    try {
      const result = await createOrder.mutateAsync({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        notes: notes.trim() || undefined,
        isDraft: !fireKitchen,
        idempotencyKey: createIdempotencyKey(),
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          variantId: l.variantId,
        })),
      });

      let order = result.order;

      if (fireKitchen && order.isDraft && canManage) {
        const sent = await sendToKitchen.mutateAsync(order.id);
        order = sent.order;
      }

      clear();
      setNotes('');
      Alert.alert(
        'Order placed',
        order.ticketLabel ?? `Order ${order.id.slice(0, 8)}`,
        [{ text: 'View', onPress: () => router.push(`/order/${order.id}`) }],
      );
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not place order';
      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  }

  if (itemCount === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Cart is empty. Add items from the Menu tab.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.key}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <TextInput
            style={styles.notes}
            placeholder="Order notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.unit}>
                {item.unitPrice.toFixed(2)} × {item.quantity}
              </Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable onPress={() => setQuantity(item.key, item.quantity - 1)} style={styles.qtyBtn}>
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable onPress={() => setQuantity(item.key, item.quantity + 1)} style={styles.qtyBtn}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => removeLine(item.key)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.subtotal}>Subtotal {subtotal.toFixed(2)}</Text>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void placeOrder(false)}>
              <Text style={styles.secondaryText}>
                {placeAsDraft ? 'Hold order (draft)' : 'Save as draft'}
              </Text>
            </Pressable>
            {canManage ? (
              <Pressable style={styles.primaryBtn} onPress={() => void placeOrder(true)}>
                <Text style={styles.primaryText}>Place & send to kitchen</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => void placeOrder(false)}>
                <Text style={styles.primaryText}>Submit draft order</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textMuted, textAlign: 'center' },
  notes: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  unit: { fontSize: 12, color: colors.textMuted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600' },
  qty: { minWidth: 24, textAlign: 'center', fontWeight: '600' },
  remove: { color: colors.danger, fontSize: 12 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  subtotal: { fontSize: 18, fontWeight: '800', color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryText: { color: colors.primary, fontWeight: '600' },
});