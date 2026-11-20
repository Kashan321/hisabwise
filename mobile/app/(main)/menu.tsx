import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMenu } from '@/lib/hooks/queries';
import { useCart } from '@/lib/cart/CartContext';
import type { MenuItem, MenuItemVariant } from '@/lib/api/types';
import { canCreateOrders } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';
import { colors } from '@/constants/theme';

export default function MenuScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useMenu();
  const { addItem } = useCart();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');

  const categories = data?.menu ?? [];

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((c) => c.isActive)
      .map((c) => ({
        ...c,
        items: c.items.filter((item) => {
          if (!item.isAvailable) return false;
          const inCategory = categoryId === 'all' || c.id === categoryId;
          if (!inCategory) return false;
          if (!q) return true;
          return item.name.toLowerCase().includes(q);
        }),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, search, categoryId]);

  const flatItems = useMemo(
    () =>
      filteredCategories.flatMap((c) =>
        c.items.map((item) => ({ ...item, categoryName: c.name })),
      ),
    [filteredCategories],
  );

  function onAdd(item: MenuItem) {
    if (!canCreateOrders(user)) return;
    const variants = (item.variants ?? []).filter((v) => v.isAvailable);
    if (variants.length === 1) {
      addItem(item, variants[0]);
      return;
    }
    if (variants.length > 1) {
      // TODO: variant picker modal
      addItem(item, variants[0]);
      return;
    }
    addItem(item);
  }

  if (!canCreateOrders(user)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>You do not have permission to create orders.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search menu…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <Pressable
          style={[styles.chip, categoryId === 'all' && styles.chipActive]}
          onPress={() => setCategoryId('all')}>
          <Text style={[styles.chipText, categoryId === 'all' && styles.chipTextActive]}>All</Text>
        </Pressable>
        {categories
          .filter((c) => c.isActive)
          .map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, categoryId === c.id && styles.chipActive]}
              onPress={() => setCategoryId(c.id)}>
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>Could not load menu.</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={flatItems}
          keyExtractor={(item) => item.id + (item as MenuItem & { categoryName: string }).categoryName}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onAdd(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {(item as MenuItem & { categoryName: string }).categoryName}
                  {(item.variants?.length ?? 0) > 0
                    ? ` · ${(item.variants as MenuItemVariant[]).length} variants`
                    : ''}
                </Text>
              </View>
              <Text style={styles.price}>{Number(item.price).toFixed(2)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.muted}>No items match your search.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  chips: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    alignSelf: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.primary, marginTop: 8, fontWeight: '600' },
});