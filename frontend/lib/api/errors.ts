import { ApiError } from './client';

const FIELD_LABELS: Record<string, string> = {
  businessName: 'Business name',
  businessSlug: 'Restaurant link',
  name: 'Full name',
  email: 'Email',
  password: 'Password',
};

function formatValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;

  const d = details as {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };

  const parts = Object.entries(d.fieldErrors ?? {}).flatMap(([field, msgs]) =>
    (msgs ?? []).map((m) => {
      const label = FIELD_LABELS[field] ?? field;
      if (m === 'Invalid slug format') {
        return `${label}: use lowercase letters, numbers, and hyphens only (e.g. kabab-tune)`;
      }
      if (field === 'password' && m.toLowerCase().includes('at least')) {
        return `${label}: must be at least 8 characters`;
      }
      return `${label}: ${m}`;
    }),
  );

  if (parts.length) return parts.join('. ');
  if (d.formErrors?.length) return d.formErrors.join('. ');
  return null;
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const details = formatValidationDetails(err.details);
    if (details) return details;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
