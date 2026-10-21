import { API_BASE_URL } from '../config';
import { DEFAULT_BUSINESS_THEME } from '../theme/theme-css';
import type { ThemeColors } from '../theme/theme-css';

export async function fetchPublicBranding(): Promise<ThemeColors> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/branding`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return DEFAULT_BUSINESS_THEME;
    const json = (await res.json()) as {
      success: boolean;
      data?: { branding: ThemeColors };
    };
    if (!json.success || !json.data?.branding) return DEFAULT_BUSINESS_THEME;
    return json.data.branding;
  } catch {
    return DEFAULT_BUSINESS_THEME;
  }
}
