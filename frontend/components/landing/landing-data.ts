export const LANDING_IMAGES = {
  heroDevices: '/landing/hero-devices.png',
  dashboard: '/landing/dashboard1.jpg',
  floorPlan: '/landing/floor-plan3.jpg',
  ordersList: '/landing/orders1.jpg',
  posLaptop: '/landing/pos-laptop.png',
  qrMenu: '/landing/qr-menu.png',
} as const;

export const PLATFORM_STATS = [
  { value: '4-in-1', label: 'Order channels', sub: 'Dine-in · Takeaway · Delivery · QR' },
  { value: '5', label: 'Staff roles', sub: 'Owner to rider, permission-scoped' },
  { value: 'Real-time', label: 'Kitchen sync', sub: 'Live KDS & order status' },
  { value: 'Multi-tenant', label: 'SaaS ready', sub: 'Isolated data per business' },
] as const;

export const FEATURE_CATEGORIES = [
  {
    id: 'ordering',
    label: 'Ordering',
    icon: 'receipt_long',
    color: 'bg-primary-container text-on-primary-container',
    features: [
      {
        icon: 'table_restaurant',
        title: 'Dine-in & table service',
        description: 'Open tables, build orders, send to kitchen, and track status per table.',
      },
      {
        icon: 'takeout_dining',
        title: 'Takeaway',
        description: 'Fast counter orders with taxes, promotions, and receipt printing.',
      },
      {
        icon: 'delivery_dining',
        title: 'Delivery management',
        description: 'Create delivery orders, assign riders, and track status end-to-end.',
      },
      {
        icon: 'qr_code_2',
        title: 'QR customer ordering',
        description: 'Branded QR menus so guests order from their phones at the table.',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'skillet',
    color: 'bg-secondary-container text-on-secondary-container',
    features: [
      {
        icon: 'skillet',
        title: 'Kitchen display (KDS)',
        description: 'Real-time kitchen queue with status updates and WebSocket sync.',
      },
      {
        icon: 'map',
        title: 'Floor plan & tables',
        description: 'Visual floor layouts, table status, and waiter assignments.',
      },
      {
        icon: 'room_service',
        title: 'Waiter workflow',
        description: 'Dedicated waiter POS, my tables, drafts, and send-to-kitchen flow.',
      },
      {
        icon: 'two_wheeler',
        title: 'Rider workflow',
        description: 'Riders see assigned deliveries and update pickup & delivery status.',
      },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'storefront',
    color: 'bg-tertiary-fixed text-on-tertiary-fixed',
    features: [
      {
        icon: 'restaurant_menu',
        title: 'Menu & modifiers',
        description: 'Categories, items, images, modifier groups, and availability toggles.',
      },
      {
        icon: 'group',
        title: 'Customers & loyalty',
        description: 'Customer profiles, visit history, and loyalty point tracking.',
      },
      {
        icon: 'local_offer',
        title: 'Promotions',
        description: 'Percentage or fixed discounts with schedule and applicability rules.',
      },
      {
        icon: 'event',
        title: 'Reservations',
        description: 'Table bookings with confirm, seat, and no-show workflows.',
      },
    ],
  },
  {
    id: 'control',
    label: 'Control',
    icon: 'admin_panel_settings',
    color: 'bg-surface-container-high text-on-surface',
    features: [
      {
        icon: 'badge',
        title: 'Staff & RBAC',
        description: 'Owner, manager, employee, waiter, and rider roles with fine permissions.',
      },
      {
        icon: 'analytics',
        title: 'Reports & invoices',
        description: 'Sales summaries, payment breakdowns, and exportable invoice records.',
      },
      {
        icon: 'percent',
        title: 'Taxes & service charges',
        description: 'Configurable tax and service rates on every order.',
      },
      {
        icon: 'credit_card',
        title: 'Subscription & billing',
        description: 'Plan-based access control with subscription status per tenant.',
      },
    ],
  },
] as const;

/** Flat list for bento grid */
export const ALL_FEATURES = FEATURE_CATEGORIES.flatMap((cat) =>
  cat.features.map((f) => ({ ...f, category: cat.label, categoryIcon: cat.icon })),
);

export const SHOWCASE_SECTIONS = [
  {
    id: 'dashboard',
    eyebrow: 'Analytics',
    title: 'See your business at a glance',
    description:
      'Track revenue, active orders, and kitchen load from a real-time dashboard. Drill into reports for payment methods, daily trends, and invoice exports.',
    image: LANDING_IMAGES.dashboard,
    bullets: ['Live order queue', 'Revenue & ticket size', 'Exportable reports'],
    imagePosition: 'right' as const,
  },
  {
    id: 'floor-plan',
    eyebrow: 'Floor plan',
    title: 'Manage every table visually',
    description:
      'Design multi-level floor plans, monitor table status, and link active orders. Assign waiters to tables and see who is serving whom.',
    image: LANDING_IMAGES.floorPlan,
    bullets: ['Interactive table map', 'Occupied / available status', 'Waiter assignments'],
    imagePosition: 'left' as const,
  },
  {
    id: 'orders',
    eyebrow: 'Live orders',
    title: 'One place for every order',
    description:
      'Filter dine-in, takeaway, delivery, and QR orders. Update status, assign riders, handle change requests, and complete with payment method.',
    image: LANDING_IMAGES.ordersList,
    bullets: ['Multi-channel orders', 'Delivery rider assign', 'Audit trail'],
    imagePosition: 'right' as const,
  },
  {
    id: 'qr',
    eyebrow: 'QR ordering',
    title: 'Let customers order from their phone',
    description:
      'Generate branded QR codes per table. Guests browse your live menu, add modifiers, and place orders that flow straight to the kitchen.',
    image: LANDING_IMAGES.qrMenu,
    bullets: ['No app download', 'Modifier support', 'Table-linked orders'],
    imagePosition: 'left' as const,
    frame: 'phone' as const,
  },
] as const;

export const ROLE_CARDS = [
  {
    role: 'Owner',
    icon: 'verified_user',
    description: 'Full access — menu, staff, billing, reports, delivery, and business settings.',
    highlights: ['Subscription & billing', 'All reports', 'Staff management'],
  },
  {
    role: 'Manager',
    icon: 'supervisor_account',
    description: 'Run day-to-day operations — orders, kitchen, delivery, reservations, and promotions.',
    highlights: ['Delivery management', 'Assign riders', 'Approve changes'],
  },
  {
    role: 'Waiter',
    icon: 'room_service',
    description: 'Serve tables with a mobile-first POS — drafts, send-to-kitchen, and my orders.',
    highlights: ['Table POS', 'My tables', 'Change requests'],
  },
  {
    role: 'Rider',
    icon: 'two_wheeler',
    description: 'See assigned deliveries only. Update pickup, out-for-delivery, and delivered status.',
    highlights: ['My deliveries', 'Customer contact', 'Status updates'],
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your business',
    description: 'Sign up, set your brand colors, currency, and invite your team with the right roles.',
    icon: 'store',
  },
  {
    step: '02',
    title: 'Set up menu & floor',
    description: 'Build categories, modifiers, tables, and QR codes — ready in minutes.',
    icon: 'tune',
  },
  {
    step: '03',
    title: 'Start taking orders',
    description: 'POS, QR, kitchen display, and delivery — all synced in real time.',
    icon: 'rocket_launch',
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: 'What order types does Hisab Wise support?',
    a: 'Dine-in (table service), takeaway, delivery with rider workflow, and QR customer ordering — all in one platform.',
  },
  {
    q: 'How do waiter and rider roles work?',
    a: 'Waiters get a dedicated mobile POS for tables and drafts. Riders only see deliveries assigned to them and can update delivery status.',
  },
  {
    q: 'Is my data isolated from other restaurants?',
    a: 'Yes. Hisab Wise is multi-tenant — every query is scoped to your business. Staff can only access their tenant data.',
  },
  {
    q: 'Can I manage modifiers and promotions?',
    a: 'Yes. Create modifier groups (required/optional), run percentage or fixed promotions, and apply them at checkout.',
  },
  {
    q: 'Does Hisab Wise include a kitchen display?',
    a: 'Yes. The KDS shows live orders with real-time WebSocket updates. Draft orders stay out of the queue until sent.',
  },
  {
    q: 'What about reservations and customers?',
    a: 'Manage table reservations with status workflows and build customer profiles with loyalty points.',
  },
] as const;

export const PRICING_FEATURES = [
  'Unlimited orders',
  'Multi-channel ordering',
  'Kitchen display (KDS)',
  'Floor plan & tables',
  'QR ordering',
  'Delivery & rider management',
  'Waiter POS',
  'Staff roles (RBAC)',
  'Customers & loyalty',
  'Promotions',
  'Reservations',
  'Reports & invoices',
] as const;

export type PricingFeatureKey = (typeof PRICING_FEATURES)[number];

export const PRICING_PLANS = [
  {
    name: 'Starter',
    monthly: 29,
    column: 'bg-emerald-50/80',
    header: 'bg-emerald-100 text-emerald-800',
    check: 'bg-emerald-500',
    features: {
      'Unlimited orders': true,
      'Multi-channel ordering': true,
      'Kitchen display (KDS)': true,
      'Floor plan & tables': true,
      'QR ordering': true,
      'Delivery & rider management': false,
      'Waiter POS': false,
      'Staff roles (RBAC)': true,
      'Customers & loyalty': false,
      'Promotions': false,
      'Reservations': false,
      'Reports & invoices': true,
    } satisfies Record<PricingFeatureKey, boolean>,
  },
  {
    name: 'Growth',
    monthly: 59,
    best: true,
    column: 'bg-primary-container/50',
    header: 'bg-primary text-on-primary',
    check: 'bg-primary',
    features: {
      'Unlimited orders': true,
      'Multi-channel ordering': true,
      'Kitchen display (KDS)': true,
      'Floor plan & tables': true,
      'QR ordering': true,
      'Delivery & rider management': true,
      'Waiter POS': true,
      'Staff roles (RBAC)': true,
      'Customers & loyalty': true,
      'Promotions': true,
      'Reservations': true,
      'Reports & invoices': true,
    } satisfies Record<PricingFeatureKey, boolean>,
  },
  {
    name: 'Enterprise',
    monthly: 99,
    column: 'bg-violet-50/80',
    header: 'bg-violet-100 text-violet-800',
    check: 'bg-violet-500',
    features: {
      'Unlimited orders': true,
      'Multi-channel ordering': true,
      'Kitchen display (KDS)': true,
      'Floor plan & tables': true,
      'QR ordering': true,
      'Delivery & rider management': true,
      'Waiter POS': true,
      'Staff roles (RBAC)': true,
      'Customers & loyalty': true,
      'Promotions': true,
      'Reservations': true,
      'Reports & invoices': true,
    } satisfies Record<PricingFeatureKey, boolean>,
  },
] as const;
