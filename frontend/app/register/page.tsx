'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AuthScreen } from '@/components/auth/auth-screen';
import { Button, Input, Textarea } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { formatApiError } from '@/lib/api/errors';
import {
  isValidPakistaniPhone,
  normalizePakistaniPhone,
  PAKISTANI_PHONE_MESSAGE,
} from '@/lib/validation/pakistani-phone';
import { isValidSlug, sanitizeSlugInput, slugify } from '@/lib/validation/slug';
import { APP_DOMAIN } from '@/lib/config';

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const slugTouched = useRef(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: '',
    businessSlug: '',
    phone: '',
    city: '',
    restaurantAddress: '',
    branchNumber: '',
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'businessName' && !slugTouched.current) {
        next.businessSlug = slugify(value);
      }
      return next;
    });
  }

  function updateSlug(value: string) {
    slugTouched.current = true;
    setForm((f) => ({ ...f, businessSlug: sanitizeSlugInput(value) }));
  }

  function validateBusinessStep(): string | null {
    const businessName = form.businessName.trim();
    const businessSlug = form.businessSlug.trim();
    const phone = normalizePakistaniPhone(form.phone);
    const city = form.city.trim();
    const restaurantAddress = form.restaurantAddress.trim();
    const branchNumber = form.branchNumber.trim();

    if (businessName.length < 2) return 'Business name must be at least 2 characters.';
    if (!isValidSlug(businessSlug)) {
      return 'Restaurant link must use lowercase letters, numbers, and hyphens only.';
    }
    if (!isValidPakistaniPhone(phone)) return PAKISTANI_PHONE_MESSAGE;
    if (city.length < 2) return 'City must be at least 2 characters.';
    if (restaurantAddress.length < 5) return 'Restaurant address must be at least 5 characters.';
    if (branchNumber.length < 1) return 'Branch number is required.';
    return null;
  }

  function validateForm(): string | null {
    const businessError = validateBusinessStep();
    if (businessError) return businessError;

    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2) return 'Full name must be at least 2 characters.';
    if (!email.includes('@')) return 'Enter a valid email address.';
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
  }

  function handleContinue() {
    setError('');
    const validationError = validateBusinessStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        businessName: form.businessName.trim(),
        businessSlug: form.businessSlug.trim(),
        phone: normalizePakistaniPhone(form.phone),
        city: form.city.trim(),
        restaurantAddress: form.restaurantAddress.trim(),
        branchNumber: form.branchNumber.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      await register(payload);
      router.push(`/${payload.businessSlug}/dashboard`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      size="lg"
      title="Create your restaurant"
      subtitle={step === 1 ? 'Step 1 of 2 — Restaurant details' : 'Step 2 of 2 — Your account'}
      footer={
        <p className="text-xs sm:text-sm text-on-surface-variant text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-outline-variant/30'}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-outline-variant/30'}`} />
      </div>

      {step === 1 ? (
        <div className="space-y-3 sm:space-y-4">
          <Input
            label="Business name"
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            placeholder="Kabab Tune"
            required
            className="!h-10 sm:!h-11"
          />
          <div className="space-y-1">
            <label className="font-caption text-on-surface-variant font-bold block text-xs sm:text-sm">
              Restaurant link
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 sm:left-4 font-mono text-on-surface-variant/60 select-none text-[10px] sm:text-xs">
                {APP_DOMAIN}/
              </span>
              <input
                className="w-full h-10 sm:h-11 pl-[6.5rem] sm:pl-[7.5rem] pr-3 sm:pr-4 bg-surface-container border border-outline-variant/25 rounded-lg sm:rounded-xl font-mono text-xs sm:text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.businessSlug}
                onChange={(e) => updateSlug(e.target.value)}
                placeholder="kabab-tune"
                required
                minLength={2}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Phone number"
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="03001234567"
              required
              autoComplete="tel"
              inputMode="numeric"
              maxLength={15}
              hint="11-digit Pakistani mobile (03XX XXXXXXX)"
              className="!h-10 sm:!h-11"
            />
            <Input
              label="Branch number"
              value={form.branchNumber}
              onChange={(e) => update('branchNumber', e.target.value)}
              placeholder="1"
              required
              className="!h-10 sm:!h-11"
            />
          </div>

          <Input
            label="City"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Karachi"
            required
            autoComplete="address-level2"
            className="!h-10 sm:!h-11"
          />

          <Textarea
            label="Restaurant address"
            value={form.restaurantAddress}
            onChange={(e) => update('restaurantAddress', e.target.value)}
            placeholder="Street, area, landmark"
            required
            rows={3}
            className="text-sm"
          />

          {error && (
            <p className="text-xs sm:text-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <Button
            type="button"
            variant="primary"
            className="w-full !h-10 sm:!h-12 rounded-xl"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Your name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              className="!h-10 sm:!h-11"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              autoComplete="email"
              className="!h-10 sm:!h-11"
            />
          </div>
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
            autoComplete="new-password"
            className="!h-10 sm:!h-11"
          />

          {error && (
            <p className="text-xs sm:text-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="!h-10 sm:!h-12 rounded-xl shrink-0 px-4"
              onClick={() => {
                setError('');
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 !h-10 sm:!h-12 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </div>
        </form>
      )}
    </AuthScreen>
  );
}
