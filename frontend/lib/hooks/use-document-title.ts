'use client';

import { useEffect } from 'react';
import { APP_NAME } from '@/lib/config';
import { businessTabAbbreviation, formatDocumentTitle } from '@/lib/document-title';

/** Sets `document.title` to `{businessAbbrev} | {pageTitle}` for tenant pages. */
export function useTenantDocumentTitle(pageTitle: string, businessName?: string | null) {
  useEffect(() => {
    const prefix = businessTabAbbreviation(businessName?.trim() || APP_NAME);
    document.title = formatDocumentTitle(prefix, pageTitle);
  }, [pageTitle, businessName]);
}

/** Sets a full document title string (e.g. platform admin). */
export function useDocumentTitle(fullTitle: string) {
  useEffect(() => {
    document.title = fullTitle.trim() || APP_NAME;
  }, [fullTitle]);
}
