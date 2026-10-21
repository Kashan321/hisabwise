'use client';

import { useEffect, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { ThemeEditor, isThemeValid, normalizeTheme, themeFromBusiness } from '@/components/theme/theme-editor';
import { Button, Input } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import { useUpdatePlatformSettings } from '@/lib/hooks/mutations';
import { usePlatformSettings } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';
import { APP_NAME } from '@/lib/config';
import type { ThemeEditorValue } from '@/components/theme/theme-editor';

export default function PlatformSettingsPage() {
  const toast = useToast();
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();
  const [theme, setTheme] = useState<ThemeEditorValue | null>(null);
  const [calendlyUrl, setCalendlyUrl] = useState('');

  useEffect(() => {
    if (settings) {
      setTheme(themeFromBusiness(settings));
      setCalendlyUrl(settings.calendlyUrl ?? '');
    }
  }, [settings]);

  async function handleSave() {
    if (!theme || !isThemeValid(theme)) {
      toast.error('Please enter valid hex colors for all theme fields.');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        ...normalizeTheme(theme),
        calendlyUrl: calendlyUrl.trim() || null,
      });
      toast.success('Platform settings updated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout title="Appearance">
      <PageHeader
        title="Platform appearance"
        description={`Customize landing page branding, Calendly demo scheduling, and admin dashboard colors.`}
      />

      <section className="max-w-3xl p-6 bg-surface-container-lowest rounded-xl card-hairline space-y-6">
        {isLoading || !theme ? (
          <p className="font-body-base text-on-surface-variant">Loading settings…</p>
        ) : (
          <>
            <ThemeEditor value={theme} onChange={setTheme} />
            <Input
              label="Calendly demo URL"
              hint="Shown on the landing page #demo section. Optional webhook for server-side sync: POST /api/v1/public/calendly/webhook (events: invitee.created, invitee.canceled)."
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/..."
            />
            <Button
              type="button"
              variant="primary"
              loading={updateSettings.isPending}
              disabled={!isThemeValid(theme)}
              onClick={handleSave}
            >
              Save settings
            </Button>
          </>
        )}
      </section>
    </PlatformLayout>
  );
}
