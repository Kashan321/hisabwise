'use client';

import { useEffect, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Button, Icon, Input, SelectField, Spinner, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import type { FeedbackTicket, FeedbackTicketStatus } from '@/lib/api/types';
import {
  useRejectFeedbackTicket,
  useResolveFeedbackTicket,
  useUpdatePlatformFeedbackContact,
} from '@/lib/hooks/mutations';
import { usePlatformFeedbackContact, usePlatformFeedbackTickets } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

export default function PlatformFeedbackPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<FeedbackTicketStatus | 'ALL'>('OPEN');
  const [selected, setSelected] = useState<FeedbackTicket | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: contact, isLoading: contactLoading } = usePlatformFeedbackContact();
  const { data: tickets = [], isLoading: ticketsLoading } = usePlatformFeedbackTickets(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
  );
  const updateContact = useUpdatePlatformFeedbackContact();
  const resolveTicket = useResolveFeedbackTicket();
  const rejectTicket = useRejectFeedbackTicket();

  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    whatsapp: '',
    websiteUrl: '',
    supportHours: '',
    extraNote: '',
  });

  useEffect(() => {
    if (contact) {
      setContactForm({
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        whatsapp: contact.whatsapp ?? '',
        websiteUrl: contact.websiteUrl ?? '',
        supportHours: contact.supportHours ?? '',
        extraNote: contact.extraNote ?? '',
      });
    }
  }, [contact]);

  async function saveContact() {
    try {
      await updateContact.mutateAsync({
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        whatsapp: contactForm.whatsapp.trim() || null,
        websiteUrl: contactForm.websiteUrl.trim() || null,
        supportHours: contactForm.supportHours.trim() || null,
        extraNote: contactForm.extraNote.trim() || null,
      });
      toast.success('Contact details saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleResolve() {
    if (!selected) return;
    try {
      await resolveTicket.mutateAsync({ id: selected.id, adminNote: adminNote.trim() || undefined });
      toast.success('Ticket resolved');
      setSelected(null);
      setAdminNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleReject() {
    if (!selected) return;
    try {
      await rejectTicket.mutateAsync({ id: selected.id, adminNote: adminNote.trim() || undefined });
      toast.success('Ticket rejected');
      setSelected(null);
      setAdminNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout hideHeaderTitle>
      <PageHeader
        title="Feedback & support"
        description="Review tenant tickets and manage public contact details shown in the Feedback page."
      />

      <div className="grid xl:grid-cols-[360px_1fr] gap-6">
        <section className="rounded-2xl border border-outline-variant/10 bg-white p-6 space-y-4 shadow-sm h-fit">
          <h2 className="font-title-lg text-primary">Contact details</h2>
          <p className="font-caption text-on-surface-variant">
            These details appear in every tenant&apos;s Feedback → Contact tab.
          </p>
          {contactLoading ? (
            <Spinner />
          ) : (
            <>
              <Input
                label="Email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                label="Phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                label="WhatsApp"
                value={contactForm.whatsapp}
                onChange={(e) => setContactForm((f) => ({ ...f, whatsapp: e.target.value }))}
              />
              <Input
                label="Website"
                value={contactForm.websiteUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
              <Textarea
                label="Support hours"
                value={contactForm.supportHours}
                onChange={(e) => setContactForm((f) => ({ ...f, supportHours: e.target.value }))}
                rows={3}
              />
              <Textarea
                label="Extra note"
                value={contactForm.extraNote}
                onChange={(e) => setContactForm((f) => ({ ...f, extraNote: e.target.value }))}
                rows={3}
              />
              <Button type="button" onClick={saveContact} loading={updateContact.isPending}>
                Save contact details
              </Button>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-outline-variant/10 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/10">
            <h2 className="font-title-lg text-primary">Tickets</h2>
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeedbackTicketStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'OPEN', label: 'Open' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
              className="min-w-[160px]"
            />
          </div>

          {ticketsLoading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center font-caption text-on-surface-variant">No tickets found</div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    setSelected(ticket);
                    setAdminNote('');
                  }}
                  className="w-full text-left px-6 py-4 hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-body-emphasis truncate">
                        {ticket.subject || (ticket.type === 'BUG_REPORT' ? 'Bug report' : 'Feedback')}
                      </p>
                      <p className="font-caption text-on-surface-variant mt-0.5">
                        {ticket.businessName} · {ticket.createdByName} ·{' '}
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-surface-container-high">
                        {ticket.priority}
                      </span>
                      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-secondary-fixed/30 text-on-secondary-fixed-variant">
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <p className="font-caption text-on-surface-variant mt-2 line-clamp-2">{ticket.message}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.subject || 'Ticket detail'}
        size="lg"
        footer={
          selected?.status === 'OPEN' ? (
            <>
              <Button variant="ghost" type="button" onClick={() => setSelected(null)}>Close</Button>
              <Button
                variant="outline"
                type="button"
                loading={rejectTicket.isPending}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                type="button"
                loading={resolveTicket.isPending}
                onClick={handleResolve}
              >
                Resolve
              </Button>
            </>
          ) : (
            <Button variant="ghost" type="button" onClick={() => setSelected(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Tenant</p>
                <p className="font-body-emphasis">{selected.businessName}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Submitted by</p>
                <p className="font-body-emphasis">{selected.createdByName}</p>
                <p className="font-caption text-on-surface-variant">{selected.createdByEmail}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Type</p>
                <p className="font-body-emphasis">{selected.type === 'BUG_REPORT' ? 'Bug report' : 'Feedback'}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Priority</p>
                <p className="font-body-emphasis">{selected.priority}</p>
              </div>
            </div>
            <div>
              <p className="font-caption text-on-surface-variant uppercase mb-1">Message</p>
              <p className="font-body-base whitespace-pre-wrap">{selected.message}</p>
            </div>
            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageUrl}
                alt="Attachment"
                className="mt-3 max-h-56 rounded-lg border border-outline-variant/20"
              />
            )}
            {selected.status === 'OPEN' && (
              <Textarea
                label="Admin note (optional)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Response visible to the tenant"
              />
            )}
            {selected.adminNote && selected.status !== 'OPEN' && (
              <div className="rounded-lg bg-surface-container-low px-3 py-2">
                <p className="font-caption text-on-surface-variant uppercase">Admin note</p>
                <p className="font-body-base mt-1">{selected.adminNote}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PlatformLayout>
  );
}
