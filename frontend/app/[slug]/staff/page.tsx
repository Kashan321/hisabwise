'use client';

import { use, useMemo, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input, SelectField } from '@/components/ui';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import type { StaffMember } from '@/lib/api/types';
import { formatApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useCreateStaff, useDeleteStaff, useUpdateStaff, useUpdateStaffStatus } from '@/lib/hooks/mutations';
import { useStaff } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

type StaffRole = 'manager' | 'employee' | 'chef' | 'waiter' | 'rider';
type EditStaffRole = StaffRole | 'owner';

const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'rider', label: 'Rider' },
];

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  roleName: 'employee' as StaffRole,
};

export default function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { user } = useAuth();
  const { data: staff = [], isLoading } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const updateStatus = useUpdateStaffStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    roleName: EditStaffRole;
    password: string;
  }>({
    name: '',
    roleName: 'employee',
    password: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [error, setError] = useState('');

  const isOwner = user?.roles.includes('owner') ?? false;

  const roleOptions = useMemo((): Array<{ value: EditStaffRole; label: string }> => {
    if (!editingMember?.roles.includes('owner')) return ROLE_OPTIONS;
    return [{ value: 'owner', label: 'Owner' }, ...ROLE_OPTIONS];
  }, [editingMember]);

  function openEdit(member: StaffMember) {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      roleName: (member.roles[0] ?? 'employee') as EditStaffRole,
      password: '',
    });
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createStaff.mutateAsync(createForm);
      toast.success('Staff member invited');
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateOpen(false);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setError('');

    const payload: {
      id: string;
      name?: string;
      roleName?: EditStaffRole;
      password?: string;
    } = { id: editingMember.id };

    const trimmedName = editForm.name.trim();
    if (trimmedName && trimmedName !== editingMember.name) {
      payload.name = trimmedName;
    }

    const currentRole = editingMember.roles[0];
    if (editForm.roleName && editForm.roleName !== currentRole) {
      payload.roleName = editForm.roleName;
    }

    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    if (!payload.name && !payload.roleName && !payload.password) {
      setError('Change at least one field to save.');
      return;
    }

    try {
      await updateStaff.mutateAsync(payload);
      toast.success('Staff member updated');
      setEditingMember(null);
      setEditForm({ name: '', roleName: 'employee', password: '' });
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteStaff.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Staff member removed');
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(formatApiError(err)),
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    updateStatus.mutate(
      { id, isActive: !isActive },
      {
        onSuccess: () =>
          toast.success(isActive ? 'Staff deactivated' : 'Staff activated'),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  return (
    <BusinessLayout slug={slug} hideFab>
      <div className="md:hidden mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#3d8a7e] text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Icon name="badge" className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary leading-tight">Team</h1>
            <p className="text-xs text-on-surface-variant">
              {staff.length} member{staff.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Button variant="primary" className="w-full mt-2.5 !h-9 !text-xs" onClick={() => setCreateOpen(true)}>
          <Icon name="person_add" className="text-base" />
          Add staff
        </Button>
      </div>

      <div className="hidden md:block">
        <PageHeader
          icon="badge"
          title="Team"
          description="Invite managers, chefs, waiters, and riders with role-based access."
          actions={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Icon name="person_add" />
              Add staff
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="space-y-2 md:space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 md:h-20 rounded-2xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon="badge"
          title="Just you for now"
          description="Add managers and employees so they can log in with their own accounts."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Invite staff member
            </Button>
          }
        />
      ) : (
        <div className="space-y-2 md:space-y-3">
          {staff.map((member) => {
            const isSelf = member.id === user?.id;
            const isMemberOwner = member.roles.includes('owner');
            const statusClass = member.isActive
              ? 'bg-tertiary-fixed/50 text-on-tertiary-fixed-variant border-tertiary-fixed-dim/30'
              : 'bg-error-container/40 text-on-error-container border-error-container/50';

            return (
              <div
                key={member.id}
                className="app-list-card p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-base md:text-lg shadow-md shadow-primary/20">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <p className="font-bold text-sm md:text-base text-on-surface truncate">{member.name}</p>
                      {isSelf && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                          You
                        </span>
                      )}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => toggleActive(member.id, member.isActive)}
                          className={`md:hidden shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors ${statusClass}`}
                        >
                          {member.isActive ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-on-surface-variant truncate">{member.email}</p>
                    <p className="text-[11px] md:text-xs text-on-surface-variant/80 mt-0.5 capitalize">
                      {member.roles.join(', ')}
                    </p>
                  </div>
                </div>

                {!isSelf && (
                  <div className="flex items-center justify-end gap-1.5 md:gap-2 shrink-0 border-t border-outline-variant/10 pt-2 md:border-0 md:pt-0">
                    <button
                      type="button"
                      onClick={() => openEdit(member)}
                      aria-label={`Edit ${member.name}`}
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 md:px-3 md:py-2 md:h-auto rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-outline-variant/25 bg-surface hover:bg-surface-container-low transition-colors"
                    >
                      <Icon name="edit" className="text-base" />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(member.id, member.isActive)}
                      className={`hidden md:inline-flex px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${statusClass}`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </button>
                    {!(isMemberOwner && !isOwner) && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(member)}
                        aria-label={`Delete ${member.name}`}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 md:px-3 md:py-2 md:h-auto rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-error/20 text-error hover:bg-error-container/30 transition-colors"
                      >
                        <Icon name="delete" className="text-base" />
                        <span className="hidden md:inline">Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setError('');
        }}
        title="Invite staff member"
        description="They'll use these credentials to log in at your cafe slug."
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              className="!h-10 sm:!h-auto"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="staff-create-form"
              className="!h-10 sm:!h-auto"
              loading={createStaff.isPending}
            >
              Send invite
            </Button>
          </>
        }
      >
        <form id="staff-create-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Work email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Temporary password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            minLength={8}
            hint="Minimum 8 characters — ask them to change after first login."
            required
          />
          <SelectField
            label="Role"
            value={createForm.roleName}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                roleName: e.target.value as StaffRole,
              }))
            }
            options={ROLE_OPTIONS}
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={editingMember !== null}
        onClose={() => {
          setEditingMember(null);
          setError('');
        }}
        title="Edit staff member"
        description={editingMember ? editingMember.email : undefined}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              className="!h-10 sm:!h-auto"
              onClick={() => setEditingMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="staff-edit-form"
              className="!h-10 sm:!h-auto"
              loading={updateStaff.isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form id="staff-edit-form" onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Full name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <SelectField
            label="Role"
            value={editForm.roleName}
            onChange={(e) =>
              setEditForm((f) => ({
                ...f,
                roleName: e.target.value as EditStaffRole,
              }))
            }
            options={roleOptions}
            disabled={editingMember?.roles.includes('owner') && !isOwner}
          />
          <Input
            label="New password"
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            minLength={8}
            hint="Leave blank to keep the current password."
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete staff member"
        message={`Remove ${deleteTarget?.name ?? 'this staff member'}? They will lose access immediately. If they have linked activity, deactivate them instead.`}
        confirmLabel="Delete staff"
        destructive
        loading={deleteStaff.isPending}
      />
    </BusinessLayout>
  );
}
