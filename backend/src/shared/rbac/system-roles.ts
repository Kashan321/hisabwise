import type { PrismaClient } from '@prisma/client';

const SYSTEM_ROLES = ['owner', 'manager', 'employee', 'chef', 'waiter', 'rider'] as const;

const PERMISSIONS = [
  { key: '*', description: 'Full access to all resources' },
  { key: 'business.manage', description: 'Manage business settings and billing' },
  { key: 'staff.manage', description: 'Manage staff accounts and roles' },
  { key: 'menu.manage', description: 'Manage menu categories and items' },
  { key: 'floor.manage', description: 'Manage floor plan and tables' },
  { key: 'floor.view', description: 'View floor plan and table status' },
  { key: 'orders.manage', description: 'Manage and override orders' },
  { key: 'orders.create', description: 'Create staff-assisted orders' },
  { key: 'orders.serve', description: 'Serve tables and manage waiter orders' },
  { key: 'orders.view', description: 'View active orders and tables' },
  { key: 'delivery.manage', description: 'Manage delivery assignments and status' },
  { key: 'delivery.view', description: 'View delivery orders' },
  { key: 'delivery.execute', description: 'Execute delivery runs as a rider' },
  { key: 'reports.view', description: 'View sales reports, invoices, and exports' },
  { key: 'reservations.manage', description: 'Manage reservations' },
  { key: 'promotions.manage', description: 'Manage promotional campaigns' },
  { key: 'kitchen.manage', description: 'Manage kitchen display and order status' },
  { key: 'customers.manage', description: 'Manage customer profiles and loyalty' },
  { key: 'customers.view', description: 'View customer profiles' },
  { key: 'notifications.view', description: 'View notification audit logs' },
  { key: 'qr.manage', description: 'Generate QR codes for ordering' },
  { key: 'inventory.view', description: 'View inventory items and stock levels' },
  { key: 'inventory.manage', description: 'Manage inventory items, stock, and recipes' },
  { key: 'inventory.daily.view', description: 'View daily inventory sessions and shift reports' },
  { key: 'inventory.daily.manage', description: 'Open daily sessions, record purchases and wastage' },
  { key: 'inventory.daily.close', description: 'Close daily inventory sessions with stock counts' },
  { key: 'cash.shift', description: 'Open and close cash shifts and manage the cash drawer' },
  { key: 'feedback.manage', description: 'Submit feedback and bug reports to platform support' },
] as const;

const ROLE_PERMISSIONS: Record<(typeof SYSTEM_ROLES)[number], string[]> = {
  owner: ['*'],
  manager: [
    'menu.manage',
    'floor.manage',
    'floor.view',
    'orders.manage',
    'orders.view',
    'orders.create',
    'orders.serve',
    'delivery.manage',
    'delivery.view',
    'reports.view',
    'reservations.manage',
    'promotions.manage',
    'kitchen.manage',
    'staff.manage',
    'customers.manage',
    'customers.view',
    'notifications.view',
    'qr.manage',
    'inventory.view',
    'inventory.manage',
    'inventory.daily.view',
    'inventory.daily.manage',
    'inventory.daily.close',
    'cash.shift',
    'feedback.manage',
  ],
  employee: ['orders.create', 'orders.view', 'customers.view', 'cash.shift', 'kitchen.manage'],
  chef: ['kitchen.manage'],
  waiter: ['floor.view', 'orders.serve', 'orders.create', 'orders.view', 'customers.view'],
  rider: ['delivery.execute', 'delivery.view'],
};

export async function ensureSystemRolesAndPermissions(prisma: PrismaClient) {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const roleName of SYSTEM_ROLES) {
    let role = await prisma.role.findFirst({
      where: { name: roleName, businessId: null, isSystem: true },
    });

    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName, isSystem: true },
      });
    }

    for (const key of ROLE_PERMISSIONS[roleName]) {
      const permissionId = permissionByKey.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}
