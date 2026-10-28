'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { Button, Input, SelectField } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-shell';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { suggestCurrencyFromIp } from '@/lib/geo/detect-currency';
import { formatApiError } from '@/lib/api/errors';
import { useUpdateBusiness } from '@/lib/hooks/mutations';
import { useAutoDetectCurrency } from '@/lib/hooks/use-auto-detect-currency';
import {
  businessPhonesDuplicate,
  formatBusinessPhonesDisplay,
  formatRestaurantReceiptPhones,
} from '@/lib/business-phones';
import { useBusiness, useSubscription } from '@/lib/hooks/queries';
import {
  formatDaysRemaining,
  getSubscriptionDaysRemaining,
  getSubscriptionPeriodEnd,
} from '@/lib/subscription-display';
import { APP_DOMAIN } from '@/lib/config';
import { useToast } from '@/lib/toast';
import {
  resolveTicketPrefix,
  sanitizeTicketPrefixInput,
  ticketPrefixFromSlug,
} from '@/lib/ticket-prefix';
export default function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: business } = useBusiness();
  const { data: subscription } = useSubscription();
  const updateBusiness = useUpdateBusiness();
  const { detecting: detectingCurrency } = useAutoDetectCurrency();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [branchNumber, setBranchNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');
  const [businessDayStartTime, setBusinessDayStartTime] = useState('05:00');
  const [businessDayTimezone, setBusinessDayTimezone] = useState('Asia/Karachi');
  const [businessDayAutoCloseEnabled, setBusinessDayAutoCloseEnabled] = useState(true);
  const [businessDayCloseReminderEnabled, setBusinessDayCloseReminderEnabled] = useState(true);
  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState('0');
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState('0');
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [error, setError] = useState('');

  const detectedCountryLabel =
    detectedCountry &&
    (() => {
      try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(detectedCountry);
      } catch {
        return detectedCountry;
      }
    })();

  useEffect(() => {
    if (!business) return;

    setName(business.name ?? '');
    setLocation(business.location ?? '');
    setCity(business.city ?? '');
    setBranchNumber(business.branchNumber ?? '');
    setPhone(business.phone ?? '');
    setPhoneSecondary(business.phoneSecondary ?? '');
    setLogoUrl(business.logoUrl ?? null);
    setTicketPrefix(resolveTicketPrefix(slug, business.orderTicketPrefix));
    setBusinessDayStartTime(business.businessDayStartTime ?? '05:00');
    setBusinessDayTimezone(business.businessDayTimezone ?? 'Asia/Karachi');
    setBusinessDayAutoCloseEnabled(business.businessDayAutoCloseEnabled ?? true);
    setBusinessDayCloseReminderEnabled(business.businessDayCloseReminderEnabled ?? true);
    setDefaultTaxRatePercent(
      String(Math.round(Number(business.defaultTaxRate ?? 0) * 10000) / 100),
    );
    setDefaultDeliveryCharge(String(Number(business.defaultDeliveryCharge ?? 0)));

    if (business.currency) {
      setCurrency(business.currency);
      setDetectedCountry(null);
      return;
    }

    let cancelled = false;
    suggestCurrencyFromIp().then((suggestion) => {
      if (cancelled || !suggestion) return;
      setDetectedCountry(suggestion.country ?? null);
      setCurrency(suggestion.currency);
    });

    return () => {
      cancelled = true;
    };
  }, [business, slug]);

  async function handleSaveTicketSettings() {
    try {
      const prefix = sanitizeTicketPrefixInput(ticketPrefix) || ticketPrefixFromSlug(slug);
      await updateBusiness.mutateAsync({ orderTicketPrefix: prefix });
      setTicketPrefix(prefix);
      toast.success('Ticket prefix updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveBusinessDaySettings() {
    try {
      await updateBusiness.mutateAsync({
        businessDayStartTime,
        businessDayTimezone,
        businessDayAutoCloseEnabled,
        businessDayCloseReminderEnabled,
      });
      toast.success('Business day settings updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const primary = phone.trim();
    const secondary = phoneSecondary.trim();
    if (secondary && primary && businessPhonesDuplicate(primary, secondary)) {
      const msg = 'Secondary phone must be a different number from primary.';
      setError(msg);
      toast.error(msg);
      return;
    }
    try {
      await updateBusiness.mutateAsync({
        name: name.trim(),
        location: location.trim() || null,
        city: city.trim() || null,
        branchNumber: branchNumber.trim() || null,
        phone: primary || null,
        phoneSecondary: secondary || null,
        logoUrl,
      });
      toast.success('Business profile updated');
      setModalOpen(false);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveTaxRate() {
    const percent = Number(defaultTaxRatePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error('Enter a tax rate between 0 and 100.');
      return;
    }
    try {
      await updateBusiness.mutateAsync({ defaultTaxRate: percent / 100 });
      toast.success('Default tax rate updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveDeliveryCharge() {
    const amount = Number(defaultDeliveryCharge);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid delivery charge (0 or more).');
      return;
    }
    try {
      await updateBusiness.mutateAsync({ defaultDeliveryCharge: amount });
      toast.success('Delivery charge updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveCurrency() {
    try {
      await updateBusiness.mutateAsync({ currency });
      toast.success('Currency updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="settings"
        title="Settings"
        description="Business profile, currency, billing, and setup shortcuts."
        actions={
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Edit profile
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Business profile</h3>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl border border-outline-variant/30 bg-surface-container overflow-hidden shrink-0 flex items-center justify-center">
              {business?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                  store
                </span>
              )}
            </div>
            <dl className="space-y-4 flex-1 min-w-0">
              <div>
                <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
                  Name
                </dt>
                <dd className="font-body-emphasis">{business?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
                  Branch
                </dt>
                <dd className="font-body-base">{business?.branchNumber ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
                  City
                </dt>
                <dd className="font-body-base">{business?.city ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
                  Address
                </dt>
                <dd className="font-body-base">{business?.location ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
                  Phone
                </dt>
                <dd className="font-body-base space-y-1">
                  <div>
                    {formatBusinessPhonesDisplay(business?.phone, business?.phoneSecondary)}
                  </div>
                  {businessPhonesDuplicate(business?.phone, business?.phoneSecondary) ? (
                    <p className="font-caption text-error">
                      Primary and secondary are the same — receipts show one number only.
                    </p>
                  ) : formatRestaurantReceiptPhones(business?.phone, business?.phoneSecondary) ? (
                    <p className="font-caption text-on-surface-variant">
                      Receipt header: Tel:{' '}
                      {formatRestaurantReceiptPhones(business?.phone, business?.phoneSecondary)}
                    </p>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <dt className="font-caption text-on-surface-variant uppercase tracking-wider mb-1">
              Public URL
            </dt>
            <dd className="font-mono text-sm">{APP_DOMAIN}/{business?.slug ?? slug}</dd>
          </div>
        </section>

        {/* <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Currency</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            All menu prices, orders, and reports use this currency. We auto-detect it from your
            country on first login — you can change it anytime.
          </p>
          {detectingCurrency && !business?.currency && (
            <p className="font-caption text-on-surface-variant">Detecting currency from your country…</p>
          )}
          {!business?.currency && detectedCountry && !detectingCurrency && (
            <p className="font-caption text-on-surface-variant">
              Detected from your country ({detectedCountryLabel ?? detectedCountry}). Save to confirm or
              pick another currency.
            </p>
          )}
          <SelectField
            label="Business currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={detectingCurrency && !currency}
            options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          />
          <Button
            type="button"
            variant="primary"
            className="cursor-pointer"
            loading={updateBusiness.isPending || detectingCurrency}
            disabled={!currency || currency === business?.currency}
            onClick={handleSaveCurrency}
          >
            Save currency
          </Button>
        </section> */}

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Business day</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            Orders, reports, and ticket numbers follow your business day — not midnight. For example,
            with a 5:00 PM start, sales after midnight still belong to the previous business day until
            you close it.
          </p>
          <Input
            label="Business day starts at"
            type="time"
            value={businessDayStartTime}
            onChange={(e) => setBusinessDayStartTime(e.target.value)}
          />
          <Input
            label="Timezone (IANA)"
            value={businessDayTimezone}
            onChange={(e) => setBusinessDayTimezone(e.target.value)}
            placeholder="Asia/Karachi"
          />
          <label className="flex items-start gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              checked={businessDayCloseReminderEnabled}
              onChange={(e) => setBusinessDayCloseReminderEnabled(e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium text-primary">Remind to close the business day</span>
              <span className="block text-on-surface-variant mt-0.5">
                Show a banner when a previous business day is still open after your business day start time.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              checked={businessDayAutoCloseEnabled}
              onChange={(e) => setBusinessDayAutoCloseEnabled(e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium text-primary">Auto-close at business day start</span>
              <span className="block text-on-surface-variant mt-0.5">
                When the new business day begins, automatically close the previous day if all cash shifts are already closed.
              </span>
            </span>
          </label>
          <Button
            type="button"
            variant="primary"
            loading={updateBusiness.isPending}
            onClick={handleSaveBusinessDaySettings}
          >
            Save business day settings
          </Button>
        </section>

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Tax rate</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            Set the default tax percentage applied to new orders. Staff can still override this on
            individual orders when needed. Use 0 if you do not charge tax.
          </p>
          <Input
            label="Default tax (%)"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={defaultTaxRatePercent}
            onChange={(e) => setDefaultTaxRatePercent(e.target.value)}
          />
          <Button
            type="button"
            variant="primary"
            className="cursor-pointer"
            loading={updateBusiness.isPending}
            onClick={handleSaveTaxRate}
          >
            Save tax rate
          </Button>
        </section>

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Delivery charge</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            Flat fee added automatically to delivery orders. Set to 0 if you do not charge for
            delivery.
          </p>
          <Input
            label="Default delivery charge"
            type="number"
            min={0}
            step={0.01}
            value={defaultDeliveryCharge}
            onChange={(e) => setDefaultDeliveryCharge(e.target.value)}
          />
          <Button
            type="button"
            variant="primary"
            className="cursor-pointer"
            loading={updateBusiness.isPending}
            onClick={handleSaveDeliveryCharge}
          >
            Save delivery charge
          </Button>
        </section>

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Inventory (Stock)</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            Allow sales to complete even when stock would go negative. Use only if you accept
            backorders or manual reconciliation. (Let staff sell even when stock is finished —
            only if you fix the count yourself later.)
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={business?.allowNegativeInventory ?? false}
              onChange={(e) => {
                updateBusiness.mutate(
                  { allowNegativeInventory: e.target.checked },
                  {
                    onSuccess: () => toast.success('Inventory setting updated'),
                    onError: (err) => toast.error(formatApiError(err)),
                  },
                );
              }}
            />
            <span className="font-body-base">Allow negative inventory (Allow selling when stock is finished)</span>
          </label>
        </section>

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Order tickets (Ticket numbers)</h3>
          <p className="font-body-base text-on-surface-variant text-sm">
            Order numbers use your prefix, the shift opening date (YYMMDD), and a running sequence —
            e.g. KB-260917-001, KB-260917-002. The sequence resets when a cash shift is closed and a
            new shift is opened, so late-night service past midnight keeps the same ticket run.
          </p>
          <Input
            label="Ticket prefix (Short code)"
            value={ticketPrefix}
            maxLength={8}
            placeholder={ticketPrefixFromSlug(slug)}
            onChange={(e) => setTicketPrefix(sanitizeTicketPrefixInput(e.target.value))}
            hint={`From your URL slug (${slug}): ${ticketPrefixFromSlug(slug)}`}
          />
          <p className="font-caption text-on-surface-variant">
            Example: prefix <strong>{ticketPrefix || ticketPrefixFromSlug(slug)}</strong> gives
            tickets like {ticketPrefix || ticketPrefixFromSlug(slug)}-260917-001,{' '}
            {ticketPrefix || ticketPrefixFromSlug(slug)}-260917-002…
          </p>
          <Button
            type="button"
            variant="secondary"
            loading={updateBusiness.isPending}
            onClick={handleSaveTicketSettings}
          >
            Save ticket prefix
          </Button>
          <p className="font-caption text-on-surface-variant rounded-lg bg-surface-container-low px-3 py-2">
            Order numbers use <strong>PREFIX-BUSINESSDATE-SEQUENCE</strong> (e.g. KB-260924-001). The
            sequence is shared across all shifts in a business day and resets when a new business day
            opens.
          </p>
        </section>

        <section className="p-6 rounded-2xl border-2 border-outline-variant/10 bg-white shadow-sm space-y-4">
          <h3 className="font-title-lg text-primary">Subscription</h3>
          <p className="font-body-emphasis">
            Status{' '}
            <span className="ml-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption">
              {subscription?.status ?? '—'}
            </span>
          </p>
          {subscription && getSubscriptionDaysRemaining(subscription) != null && (
            <p className="font-body-base text-on-surface-variant">
              {subscription.status === 'TRIAL' ? 'Trial' : 'Subscription'}{' '}
              {formatDaysRemaining(getSubscriptionDaysRemaining(subscription)!)}
              {getSubscriptionPeriodEnd(subscription)
                ? ` · ends ${getSubscriptionPeriodEnd(subscription)!.toLocaleDateString()}`
                : ''}
            </p>
          )}
          {subscription?.hasPendingPayment && (
            <p className="font-body-base text-secondary">Payment proof is under review.</p>
          )}
          <Link href={`/${slug}/subscription`}>
            <Button variant="outline" className="cursor-pointer">
              Manage subscription
            </Button>
          </Link>
        </section>

        <section className="md:col-span-2 p-6 bg-surface-container-lowest rounded-xl card-hairline">
          <h3 className="font-title-lg text-primary mb-4">Setup checklist</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: 'menu', label: 'Menu', icon: 'restaurant_menu' },
              { href: 'floor-plan', label: 'Floor plan', icon: 'table_restaurant' },
              { href: 'staff', label: 'Staff', icon: 'badge' },
              { href: 'order', label: 'QR menu', icon: 'qr_code_2', external: true },
            ].map((item) => (
              <a
                key={item.href}
                href={item.external ? `/${slug}/${item.href}` : `/${slug}/${item.href}`}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                className="flex items-center gap-3 p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-secondary">{item.icon}</span>
                <span className="font-body-emphasis">{item.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError('');
          if (business) {
            setName(business.name ?? '');
            setLocation(business.location ?? '');
    setCity(business.city ?? '');
    setBranchNumber(business.branchNumber ?? '');
    setPhone(business.phone ?? '');
    setPhoneSecondary(business.phoneSecondary ?? '');
            setLogoUrl(business.logoUrl ?? null);
          }
        }}
        title="Edit business profile"
        description="Update how your cafe appears across the dashboard and customer menu."
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="profile-form" loading={updateBusiness.isPending}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="profile-form" onSubmit={handleSave} className="space-y-4">
          <ImageUploadField
            label="Store logo"
            value={logoUrl}
            onChange={setLogoUrl}
            folder="branding"
            aspect="square"
            emptyIcon="store"
            hint="Shown on your QR menu and customer-facing pages."
          />
          <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Branch number"
              value={branchNumber}
              onChange={(e) => setBranchNumber(e.target.value)}
              placeholder="1"
            />
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Karachi"
            />
          </div>
          <Input
            label="Restaurant address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Street, area, landmark"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone (primary)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0321 1234567"
            />
            <Input
              label="Phone (secondary)"
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
              placeholder="021 1234567"
            />
          </div>
          <p className="font-caption text-on-surface-variant -mt-2">
            Both numbers print at the top of the receipt as Tel: primary | secondary. Use two
            different restaurant lines (not the POS support number in receipt settings).
          </p>
          {phone.trim() && phoneSecondary.trim() && businessPhonesDuplicate(phone, phoneSecondary) ? (
            <p className="font-caption text-error">Enter a different number for secondary.</p>
          ) : phone.trim() && phoneSecondary.trim() ? (
            <p className="font-caption text-on-surface-variant">
              Receipt preview: Tel: {formatRestaurantReceiptPhones(phone, phoneSecondary)}
            </p>
          ) : null}
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>
    </BusinessLayout>
  );
}
