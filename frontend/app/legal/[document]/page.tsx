import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { LegalDocumentLayout } from '@/components/landing/legal-document-layout';
import { APP_NAME } from '@/lib/config';
import { LEGAL_DOCUMENTS, isLegalDocumentKey } from '@/lib/legal/legal-pages';

type PageProps = { params: Promise<{ document: string }> };

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((document) => ({ document }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { document: key } = await params;
  if (!isLegalDocumentKey(key)) return { title: 'Not found' };
  return {
    title: `${LEGAL_DOCUMENTS[key].title} | ${APP_NAME}`,
    description: LEGAL_DOCUMENTS[key].description,
  };
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { document: key } = await params;
  if (!isLegalDocumentKey(key)) notFound();
  if (key === 'about') redirect('/about');
  return <LegalDocumentLayout document={LEGAL_DOCUMENTS[key]} />;
}
