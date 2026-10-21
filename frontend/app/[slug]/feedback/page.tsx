'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input, SelectField, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { formatApiError } from '@/lib/api/errors';
import { getFileReadUrl } from '@/lib/api/upload';
import type { FeedbackPriority, FeedbackTicket } from '@/lib/api/types';
import { useCreateFeedbackTicket } from '@/lib/hooks/mutations';
import { useFeedbackContact, useFeedbackTickets } from '@/lib/hooks/queries';
import { APP_NAME } from '@/lib/config';
import { useToast } from '@/lib/toast';

type Tab = 'feedback' | 'bug' | 'tickets' | 'contact';

const PRIORITY_OPTIONS: Array<{ value: FeedbackPriority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function statusTone(status: FeedbackTicket['status']) {
  if (status === 'RESOLVED') return 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant';
  if (status === 'REJECTED') return 'bg-error-container text-on-error-container';
  return 'bg-secondary-fixed/30 text-on-secondary-fixed-variant';
}

function TicketImage({ imageKey }: { imageKey: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFileReadUrl(imageKey)
      .then((result) => {
        if (!cancelled) setUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageKey]);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Attachment" className="mt-2 max-h-40 rounded-lg border border-outline-variant/20" />
  );
}

export default function FeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: contact } = useFeedbackContact();
  const { data: tickets = [], isLoading } = useFeedbackTickets();
  const createTicket = useCreateFeedbackTicket();

  const [tab, setTab] = useState<Tab>('feedback');
  const [priority, setPriority] = useState<FeedbackPriority>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bugMessage, setBugMessage] = useState('');
  const [bugImageKey, setBugImageKey] = useState<string | null>(null);

  const wordCount = useMemo(() => countWords(message), [message]);
  const bugWordCount = useMemo(() => countWords(bugMessage), [bugMessage]);

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (wordCount > 1000) {
      toast.error('Message must be 1000 words or fewer.');
      return;
    }
    try {
      await createTicket.mutateAsync({
        type: 'FEEDBACK',
        priority,
        subject: subject.trim() || null,
        message: message.trim(),
      });
      toast.success('Feedback submitted');
      setSubject('');
      setMessage('');
      setTab('tickets');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function submitBugReport(e: React.FormEvent) {
    e.preventDefault();
    if (bugWordCount > 1000) {
      toast.error('Message must be 1000 words or fewer.');
      return;
    }
    try {
      await createTicket.mutateAsync({
        type: 'BUG_REPORT',
        priority: 'HIGH',
        subject: 'Bug report',
        message: bugMessage.trim(),
        imageKey: bugImageKey,
      });
      toast.success('Bug report submitted');
      setBugMessage('');
      setBugImageKey(null);
      setTab('tickets');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'feedback', label: 'Feedback', icon: 'rate_review' },
    { id: 'bug', label: 'Bug report', icon: 'bug_report' },
    { id: 'tickets', label: 'My tickets', icon: 'confirmation_number' },
    { id: 'contact', label: 'Contact', icon: 'support_agent' },
  ];

  return (
    <BusinessLayout slug={slug} title="Feedback">
      <PageHeader
        title="Feedback & support"
        description={`Share feedback, report bugs, and reach the ${APP_NAME} team.`}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === item.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Icon name={item.icon} className="text-lg" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'feedback' && (
        <form
          onSubmit={submitFeedback}
          className="max-w-2xl rounded-2xl border border-outline-variant/10 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-title-lg text-primary">Submit feedback</h2>
          <p className="font-caption text-on-surface-variant">
            Tell us what is working well or what we should improve.
          </p>
          <SelectField
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
            options={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary"
            maxLength={200}
          />
          <div>
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Describe your feedback..."
              required
            />
            <p className="font-caption text-on-surface-variant mt-1">
              {wordCount} / 1000 words
            </p>
          </div>
          <Button type="submit" loading={createTicket.isPending}>
            Submit feedback
          </Button>
        </form>
      )}

      {tab === 'bug' && (
        <form
          onSubmit={submitBugReport}
          className="max-w-2xl rounded-2xl border border-outline-variant/10 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-title-lg text-primary">Report a bug</h2>
          <p className="font-caption text-on-surface-variant">
            Describe what went wrong. Attach a screenshot if it helps.
          </p>
          <div>
            <Textarea
              label="What happened?"
              value={bugMessage}
              onChange={(e) => setBugMessage(e.target.value)}
              rows={8}
              placeholder="Steps to reproduce, expected vs actual behavior..."
              required
            />
            <p className="font-caption text-on-surface-variant mt-1">
              {bugWordCount} / 1000 words
            </p>
          </div>
          <ImageUploadField
            label="Screenshot (optional)"
            value={bugImageKey}
            onChange={setBugImageKey}
            folder="feedback"
            aspect="square"
            emptyIcon="screenshot_monitor"
          />
          <Button type="submit" loading={createTicket.isPending}>
            Submit bug report
          </Button>
        </form>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3 max-w-3xl">
          {isLoading && <p className="font-caption text-on-surface-variant">Loading tickets...</p>}
          {!isLoading && tickets.length === 0 && (
            <div className="rounded-2xl border border-outline-variant/10 bg-white p-8 text-center">
              <Icon name="inbox" className="text-4xl text-on-surface-variant/40 mb-2" />
              <p className="font-body-emphasis">No tickets yet</p>
              <p className="font-caption text-on-surface-variant mt-1">
                Submit feedback or a bug report to start a ticket.
              </p>
            </div>
          )}
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-2xl border border-outline-variant/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-body-emphasis">
                    {ticket.subject || (ticket.type === 'BUG_REPORT' ? 'Bug report' : 'Feedback')}
                  </p>
                  <p className="font-caption text-on-surface-variant mt-0.5">
                    {new Date(ticket.createdAt).toLocaleString()} · {ticket.priority} ·{' '}
                    {ticket.type === 'BUG_REPORT' ? 'Bug' : 'Feedback'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${statusTone(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="font-body-base text-on-surface mt-3 whitespace-pre-wrap">{ticket.message}</p>
              {ticket.imageKey && <TicketImage imageKey={ticket.imageKey} />}
              {ticket.adminNote && (
                <div className="mt-3 rounded-lg bg-surface-container-low px-3 py-2">
                  <p className="font-caption text-on-surface-variant uppercase">Admin response</p>
                  <p className="font-body-base mt-1">{ticket.adminNote}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div className="max-w-2xl rounded-2xl border border-outline-variant/10 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-title-lg text-primary">Contact support</h2>
          <p className="font-caption text-on-surface-variant">
            Reach the {APP_NAME} team using the details below.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {contact?.email && (
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Email</p>
                <a href={`mailto:${contact.email}`} className="font-body-emphasis text-secondary hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact?.phone && (
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Phone</p>
                <a href={`tel:${contact.phone}`} className="font-body-emphasis">{contact.phone}</a>
              </div>
            )}
            {contact?.whatsapp && (
              <div>
                <p className="font-caption text-on-surface-variant uppercase">WhatsApp</p>
                <p className="font-body-emphasis">{contact.whatsapp}</p>
              </div>
            )}
            {contact?.websiteUrl && (
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Website</p>
                <a
                  href={contact.websiteUrl.startsWith('http') ? contact.websiteUrl : `https://${contact.websiteUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-body-emphasis text-secondary hover:underline"
                >
                  {contact.websiteUrl}
                </a>
              </div>
            )}
          </div>
          {contact?.supportHours && (
            <div>
              <p className="font-caption text-on-surface-variant uppercase">Support hours</p>
              <p className="font-body-base whitespace-pre-wrap">{contact.supportHours}</p>
            </div>
          )}
          {contact?.extraNote && (
            <div>
              <p className="font-caption text-on-surface-variant uppercase">Note</p>
              <p className="font-body-base whitespace-pre-wrap">{contact.extraNote}</p>
            </div>
          )}
          {!contact?.email && !contact?.phone && !contact?.whatsapp && !contact?.websiteUrl && (
            <p className="font-caption text-on-surface-variant">
              Contact details have not been configured yet. Please submit a ticket and we will get back to you.
            </p>
          )}
        </div>
      )}
    </BusinessLayout>
  );
}
