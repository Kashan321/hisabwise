'use client';

import { Icon, Input, SelectField } from '@/components/ui';
import {
  EMPTY_ORDER_TAKER,
  ORDER_TAKER_OTHER_VALUE,
  orderTakerSelectValue,
  type OrderTakerSelection,
} from '@/lib/order-taker';
import type { StaffMember } from '@/lib/api/types';

export function OrderTakerSelectField({
  staff,
  value,
  onChange,
  onCustomNameCommit,
  disabled,
  loading,
  compact,
}: {
  staff: StaffMember[];
  value: OrderTakerSelection;
  onChange: (value: OrderTakerSelection) => void;
  /** Called when the free-text name field loses focus (e.g. save on blur). */
  onCustomNameCommit?: (name: string) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Single-row picker for POS/cart footers */
  compact?: boolean;
}) {
  const active = staff.filter((m) => m.isActive).sort((a, b) => a.name.localeCompare(b.name));
  const selectValue = orderTakerSelectValue(value);
  const showCustomInput = selectValue === ORDER_TAKER_OTHER_VALUE;

  const options = [
    { value: '', label: loading ? 'Loading staff…' : 'Default (you)' },
    ...active.map((member) => ({
      value: member.id,
      label: member.name,
    })),
    { value: ORDER_TAKER_OTHER_VALUE, label: 'Other name…' },
  ];

  function handleSelectChange(next: string) {
    if (!next) {
      onChange(EMPTY_ORDER_TAKER);
      return;
    }
    if (next === ORDER_TAKER_OTHER_VALUE) {
      onChange({ staffId: ORDER_TAKER_OTHER_VALUE, customName: value.customName });
      return;
    }
    onChange({ staffId: next, customName: '' });
  }

  function handleCustomNameChange(name: string) {
    onChange({
      staffId: ORDER_TAKER_OTHER_VALUE,
      customName: name,
    });
  }

  if (compact) {
    return (
      <div
        className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 overflow-hidden"
        title="Leave unset to use whoever is logged in"
      >
        <label className="flex items-center gap-2 px-2.5 py-1 min-h-10 cursor-pointer">
          <Icon name="person" className="text-lg text-on-surface-variant shrink-0" aria-hidden />
          <span className="text-xs font-semibold text-on-surface-variant shrink-0">Order taker</span>
          <select
            className="flex-1 min-w-0 h-9 bg-transparent text-sm font-medium text-on-surface border-0 outline-none cursor-pointer appearance-none pr-1"
            value={selectValue}
            disabled={disabled || loading}
            onChange={(e) => handleSelectChange(e.target.value)}
            aria-label="Order taker"
          >
            {options.map((opt) => (
              <option key={opt.value || '__none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            className="text-lg text-on-surface-variant shrink-0 pointer-events-none"
            aria-hidden
          />
        </label>
        {showCustomInput && (
          <div className="px-2.5 pb-2 pt-0 border-t border-outline-variant/15">
            <input
              type="text"
              maxLength={120}
              placeholder="Enter name"
              value={value.customName}
              disabled={disabled || loading}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              onBlur={() => onCustomNameCommit?.(value.customName)}
              className="w-full h-9 px-2 rounded-md border border-outline-variant/25 bg-surface text-sm font-medium text-on-surface placeholder:text-on-surface-variant/70"
              aria-label="Order taker name"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SelectField
        label="Order taker"
        value={selectValue}
        disabled={disabled || loading}
        onChange={(e) => handleSelectChange(e.target.value)}
        options={options}
      />
      {showCustomInput && (
        <Input
          label="Name"
          value={value.customName}
          maxLength={120}
          disabled={disabled || loading}
          placeholder="Who served this table?"
          onChange={(e) => handleCustomNameChange(e.target.value)}
          onBlur={() => onCustomNameCommit?.(value.customName)}
        />
      )}
      <p className="font-caption text-on-surface-variant">
        Default uses whoever is logged in. Pick staff or &quot;Other name…&quot; to override.
      </p>
    </div>
  );
}
