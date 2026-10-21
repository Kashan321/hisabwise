'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, Input } from '@/components/ui';
import type { Customer } from '@/lib/api/types';
import { useCustomerSearch } from '@/lib/hooks/queries';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

export function CustomerSearchField({
  label = 'Find customer',
  selectedCustomer,
  onSelect,
  onClear,
  placeholder = 'Search by name, phone, or address…',
  compact,
}: {
  label?: string;
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results = [], isFetching } = useCustomerSearch(debouncedQuery, open);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function handleSelect(customer: Customer) {
    onSelect(customer);
    setQuery('');
    setOpen(false);
  }

  const showResults = open && debouncedQuery.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative ${compact ? 'space-y-1' : 'space-y-2'}`}>
      {selectedCustomer ? (
        <div
          className={`rounded-lg border border-primary/25 bg-primary/5 ${
            compact ? 'p-2' : 'rounded-xl p-3'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`font-bold text-on-surface truncate ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
              >
                {selectedCustomer.name}
              </p>
              <p
                className={`text-on-surface-variant ${compact ? 'text-[10px] mt-0' : 'text-xs mt-0.5'}`}
              >
                {[selectedCustomer.phoneNumber, selectedCustomer.email].filter(Boolean).join(' · ') ||
                  'No contact info'}
              </p>
              {selectedCustomer.deliveryAddress && (
                <p
                  className={`font-medium text-primary leading-snug ${
                    compact
                      ? 'text-[10px] mt-1 rounded px-1.5 py-0.5 bg-primary/10 line-clamp-2'
                      : 'text-xs mt-2 rounded-lg bg-primary/10 px-2 py-1.5'
                  }`}
                >
                  {selectedCustomer.deliveryAddress}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClear}
              className={`shrink-0 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors ${
                compact ? 'p-1' : 'p-1.5'
              }`}
              aria-label="Clear selected customer"
            >
              <Icon name="close" className={compact ? 'text-sm' : 'text-base'} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <Input
            dense={compact}
            label={compact ? undefined : label}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder ?? (compact ? label : undefined)}
            autoComplete="off"
            className={compact ? '!h-8 !px-2.5 !text-xs' : undefined}
          />
          {showResults && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface shadow-lg">
              {isFetching && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-on-surface-variant">Searching…</p>
              )}
              {!isFetching && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-on-surface-variant">
                  No customers found. Enter details below to add a new customer on order placement.
                </p>
              )}
              {results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className="w-full text-left px-3 py-2.5 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low transition-colors"
                >
                  <p className="text-sm font-semibold text-on-surface truncate">{customer.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {[customer.phoneNumber, customer.email].filter(Boolean).join(' · ') ||
                      'No phone or email'}
                  </p>
                  {customer.deliveryAddress ? (
                    <p className="text-xs font-medium text-primary mt-1.5 rounded-md bg-primary/10 px-2 py-1 leading-snug">
                      {customer.deliveryAddress}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1 italic">
                      No saved delivery address
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
