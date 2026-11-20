import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useCurrentBusinessDay, useCurrentCashShift } from '@/lib/hooks/queries';
import { canViewBusinessDay, canViewCashShift } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';
import { colors } from '@/constants/theme';

export function OperationStatusBar() {
  const { user } = useAuth();
  const businessDayQuery = useCurrentBusinessDay();
  const shiftQuery = useCurrentCashShift();

  const showDay = canViewBusinessDay(user);
  const showShift = canViewCashShift(user);

  if (!showDay && !showShift) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {showDay ? (
        <View style={styles.chip}>
          <Text style={styles.label}>Business day</Text>
          {businessDayQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : businessDayQuery.data?.status === 'forbidden' ? (
            <Text style={styles.muted} accessibilityLabel="Business day status unavailable">
              Unavailable (permissions)
            </Text>
          ) : businessDayQuery.data?.status === 'error' ? (
            <Text style={styles.warn}>Error loading</Text>
          ) : businessDayQuery.data?.status === 'ok' ? (
            <Text
              style={
                businessDayQuery.data.data.businessDay?.status === 'OPEN'
                  ? styles.open
                  : styles.closed
              }>
              {businessDayQuery.data.data.businessDay?.status === 'OPEN'
                ? `Open · ${businessDayQuery.data.data.businessDay.businessDate}`
                : 'No open day'}
            </Text>
          ) : (
            <Text style={styles.muted}>—</Text>
          )}
        </View>
      ) : null}

      {showShift ? (
        <View style={styles.chip}>
          <Text style={styles.label}>Cash shift</Text>
          {shiftQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : shiftQuery.isError ? (
            <Text style={styles.warn}>Error loading</Text>
          ) : (
            <Text style={shiftQuery.data?.status === 'OPEN' ? styles.open : styles.closed}>
              {shiftQuery.data?.status === 'OPEN'
                ? `Open · ${shiftQuery.data.openedByName}`
                : 'No open shift'}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chip: {
    flex: 1,
    minWidth: 140,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' },
  open: { fontSize: 13, fontWeight: '700', color: colors.success },
  closed: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  warn: { fontSize: 13, color: colors.warning },
});