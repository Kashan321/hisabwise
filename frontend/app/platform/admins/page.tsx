'use client';

import { useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Button, Icon, Input, SelectField, TableSkeleton } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import { useCreatePlatformAdmin, useUpdatePlatformAdmin } from '@/lib/hooks/mutations';
import { usePlatformAdmins } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';
import type { PlatformUser } from '@/lib/api/types';

const emptyCreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'PLATFORM_ADMIN' as 'SUPER_ADMIN' | 'PLATFORM_ADMIN',
};

export default function PlatformAdminsPage() {
  const { data: admins = [], isLoading } = usePlatformAdmins();
  const createAdmin = useCreatePlatformAdmin();
  const updateAdmin = useUpdatePlatformAdmin();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState('');
  const [editAdmin, setEditAdmin] = useState<PlatformUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'PLATFORM_ADMIN' as 'SUPER_ADMIN' | 'PLATFORM_ADMIN', isActive: true });
  const [editError, setEditError] = useState('');

  function openEdit(admin: PlatformUser) {
    setEditAdmin(admin);
    setEditForm({
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive !== false,
    });
    setEditError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    try {
      await createAdmin.mutateAsync(createForm);
      toast.success('Platform admin created');
      setCreateForm(emptyCreateForm);
      setCreateOpen(false);
    } catch (err) {
      const msg = formatApiError(err);
      setCreateError(msg);
      toast.error(msg);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editAdmin) return;
    setEditError('');
    try {
      await updateAdmin.mutateAsync({
        id: editAdmin.id,
        name: editForm.name.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      toast.success('Admin updated');
      setEditAdmin(null);
    } catch (err) {
      const msg = formatApiError(err);
      setEditError(msg);
      toast.error(msg);
    }
  }

  return (
    <PlatformLayout title="Platform Admins">
      <section className="bg-surface-bright rounded-lg border-hairline overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface">Platform Staff</h2>
            <p className="font-caption text-on-surface-variant mt-0.5">
              Super admins and platform administrators with system access
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-emphasis hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Icon name="person_add" className="text-[20px]" />
            Add Admin
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} cols={4} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-surface-container transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center font-caption text-on-primary-container">
                          {admin.name.charAt(0)}
                        </div>
                        <span className="font-body-emphasis">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-on-surface-variant">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-surface-container-high text-on-surface-variant">
                        {admin.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {admin.isActive !== false ? (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-tertiary-fixed/30 text-on-tertiary-fixed-variant flex items-center w-fit gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-fixed-variant" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-error-container text-on-error-container">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="platform-row-actions opacity-0 transition-opacity flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(admin)}
                          className="p-1.5 hover:bg-surface-container-high rounded text-on-surface-variant cursor-pointer"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 font-caption text-center text-on-surface-variant">
                      No platform admins found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError('');
          setCreateForm(emptyCreateForm);
        }}
        title="Add platform admin"
        description="Super admin access is required to create admins."
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="create-admin-form" loading={createAdmin.isPending}>
              Create admin
            </Button>
          </>
        }
      >
        <form id="create-admin-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
          />
          <SelectField
            label="Role"
            value={createForm.role}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, role: e.target.value as typeof f.role }))
            }
            options={[
              { value: 'PLATFORM_ADMIN', label: 'Platform Admin' },
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
            ]}
          />
          {createError && <p className="font-caption text-error">{createError}</p>}
        </form>
      </Modal>

      <Modal
        open={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        title="Edit platform admin"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setEditAdmin(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="edit-admin-form" loading={updateAdmin.isPending}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-admin-form" onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Full name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <SelectField
            label="Role"
            value={editForm.role}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, role: e.target.value as typeof f.role }))
            }
            options={[
              { value: 'PLATFORM_ADMIN', label: 'Platform Admin' },
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
            ]}
          />
          <SelectField
            label="Status"
            value={editForm.isActive ? 'active' : 'inactive'}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))
            }
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          {editError && <p className="font-caption text-error">{editError}</p>}
        </form>
      </Modal>
    </PlatformLayout>
  );
}
