export const LANDING_NAV = [
  { href: '#product', label: 'Product' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#operations', label: 'Operations' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#demo', label: 'Resources' },
] as const;

export const FRAGMENTED_STACK_ITEMS = [
  { label: 'Legacy POS (Manual re-keying)', tag: 'Discrepancy' },
  { label: 'Paper Kitchen Tickets', tag: 'Lost Modifiers' },
  { label: 'Aggregator Delivery Tablets', tag: 'Manual Transfer' },
  { label: 'End-of-day Excel reconciliations', tag: '3+ Hours Lost' },
] as const;

export const UNIFIED_ENGINE_ITEMS = [
  { label: 'Point of Sale & QR Scans', tag: 'Direct ingestion' },
  { label: 'Station Kitchen Display (KDS)', tag: 'Instant dispatch' },
  { label: 'Interactive Floor Maps', tag: 'Live table states' },
  { label: 'Real-time Financial Ledger', tag: 'Live P&L stream' },
] as const;

export type ServiceStageVisualLine = {
  name: string;
  price: string;
  note?: string;
};

export type ServiceStage = {
  step: string;
  title: string;
  description: string;
  bullets: string[];
  visualTitle: string;
  visualStatus: string;
  lines: ServiceStageVisualLine[];
  subtotal?: string;
};

export const SERVICE_STAGES: ServiceStage[] = [
  {
    step: 'STAGE 01 OF 05',
    title: 'Take the Order',
    description:
      'Rapid search, modifier chaining, guest coursing, and split ticketing built for high-traffic environments. Waiters punch in orders with zero friction.',
    bullets: [
      'Dynamic modifier presets (temperature, allergies)',
      'One-touch seat mapping and table linking',
      'Automatic 86 inventory checks upon order build',
    ],
    visualTitle: 'ACTIVE COUNTER TICKETING',
    visualStatus: 'READY TO FIRE',
    lines: [
      { name: 'Dry Aged Ribeye (10oz)', price: 'PKR 12,600', note: 'Rare · Chimichurri on side' },
      { name: 'House Sourdough Butter', price: 'PKR 2,700' },
      { name: 'Pinot Noir Bottle (2021)', price: 'PKR 20,400' },
    ],
    subtotal: 'PKR 35,700',
  },
  {
    step: 'STAGE 02 OF 05',
    title: 'Fire to Kitchen',
    description:
      'Instant station splitting. The grill receives steaks, the bar gets drinks, and the cold pantry prepares appetizers — completely in sync.',
    bullets: [
      'Automated prep timers and color-coded bump queues',
      'Custom station ticket breakdown',
      'Recall and re-fire without duplicating orders',
    ],
    visualTitle: 'KDS · GRILL STATION',
    visualStatus: 'TICKET #1042',
    lines: [
      { name: 'Dry Aged Ribeye (10oz)', price: '4m', note: 'Medium Rare' },
      { name: 'Garlic Butter Baste', price: 'Prep' },
    ],
    subtotal: '2 items routing',
  },
  {
    step: 'STAGE 03 OF 05',
    title: 'Floor Coordination',
    description:
      'Hosts and managers see live table states, course timing, and server assignments without radio chatter.',
    bullets: [
      'Occupied, bill pending, and reserved states',
      'Server sections and handoff notes',
      'QR session linked to table ledger',
    ],
    visualTitle: 'FLOOR STATUS · TABLE 07',
    visualStatus: 'OCCUPIED',
    lines: [
      { name: 'Assigned Server', price: 'Marco R.' },
      { name: 'Guests Seated', price: '2 Guests' },
      { name: 'Course Status', price: 'Mains Cooking' },
    ],
  },
  {
    step: 'STAGE 04 OF 05',
    title: 'Checkout & Split',
    description:
      'Split by seat, item, or percentage. Apply promotions, service charge, and tax with audit-friendly receipts.',
    bullets: [
      'Partial payments and split tenders',
      'Printed or digital guest receipts',
      'Manager override with reason codes',
    ],
    visualTitle: 'CHECKOUT · TABLE 07',
    visualStatus: 'BILL OPEN',
    lines: [
      { name: 'Subtotal', price: 'PKR 24,750' },
      { name: 'Service charge (10%)', price: 'PKR 2,475' },
      { name: 'Tax', price: 'PKR 1,238' },
    ],
    subtotal: 'PKR 28,463',
  },
  {
    step: 'STAGE 05 OF 05',
    title: 'Instant Ledger',
    description:
      'Completed orders flow into live sales, payment mix, and shift reports — no overnight batch jobs.',
    bullets: [
      'Business-day aware reporting',
      'Payment method breakdown',
      'Export for accounting',
    ],
    visualTitle: 'SHIFT LEDGER',
    visualStatus: 'LIVE SYNC',
    lines: [
      { name: 'Gross sales (shift)', price: 'PKR 482,050' },
      { name: 'Orders completed', price: '63' },
      { name: 'Avg. ticket', price: 'PKR 7,652' },
    ],
  },
];

export const OPERATIONS_CARDS = [
  {
    icon: 'alt_route',
    title: 'Unified Pipeline',
    description:
      'Dine-in, pickup, delivery, and self-order flow into one central pipeline. No duplicate tickets or missing receipts.',
    rows: [
      { left: 'Dine-In #1042', right: 'Preparing', tone: 'emerald' as const },
      { left: 'Takeaway #1043', right: 'Packed', tone: 'secondary' as const },
      { left: 'QR Self #1044', right: 'Received', tone: 'default' as const },
    ],
  },
  {
    icon: 'kitchen',
    title: 'Station Routing',
    description:
      'Orders parse directly to Grill, Saute, Cold Bar, or Drinks. Timers alert chefs to balance course completion.',
    rows: [
      { left: 'Grill Station', right: '3 Active Tickets', tone: 'default' as const },
      { left: 'Bar & Beverage', right: '1 Active Ticket', tone: 'default' as const },
      { left: 'Pantry / Cold', right: '2 Active Tickets', tone: 'default' as const },
    ],
  },
  {
    icon: 'two_wheeler',
    title: 'Delivery & Riders',
    description:
      'Internal or third-party fleet tracking with real-time ETA recalculations and customer status feeds.',
    rows: [
      { left: 'Rider Alex K.', right: 'En route (4m)', tone: 'default' as const },
      { left: 'Rider Faisal M.', right: 'At Doorstep', tone: 'default' as const },
      { left: 'Dispatch Queue', right: '1 Pending Pick', tone: 'default' as const },
    ],
  },
] as const;

export type FloorTableStatus = 'occupied' | 'available' | 'bill' | 'reserved';

export type FloorTable = {
  id: string;
  label: string;
  status: FloorTableStatus;
  seats: string;
  server?: string;
  statusLabel?: string;
  ticket?: string;
  amount?: string;
  footer?: string;
};

export const FLOOR_TABLES: FloorTable[] = [
  { id: 't01', label: 'T-01', status: 'occupied', seats: '4 / 4', server: 'Sarah K.', ticket: '#1038 · Main', amount: 'PKR 39,675' },
  { id: 't02', label: 'T-02', status: 'occupied', seats: '2 / 2', server: 'Sarah K.', ticket: '#1040 · Dessert', amount: 'PKR 15,120' },
  { id: 't03', label: 'T-03', status: 'available', seats: '0 / 4', footer: 'Cleaned & Ready' },
  { id: 't04', label: 'T-04', status: 'bill', seats: '6 / 6', server: 'Marco R.', amount: 'PKR 78,400', statusLabel: 'Checkout' },
  { id: 't05', label: 'T-05', status: 'occupied', seats: '2 / 2', server: 'Marco R.', ticket: '#1041 · Drinks', amount: 'PKR 19,074' },
  { id: 't06', label: 'T-06', status: 'reserved', seats: '0 / 2', footer: 'Reserved 8:30 PM' },
  { id: 't07', label: 'T-07', status: 'occupied', seats: '2 / 2', server: 'Marco R.', ticket: '#1042 · Appetizer', amount: 'PKR 22,950' },
  { id: 't08', label: 'T-08', status: 'available', seats: '0 / 8', footer: 'Private Room Ready' },
];

export const FLOOR_FILTERS = [
  { id: 'all' as const, label: 'All (8)' },
  { id: 'occupied' as const, label: 'Occupied (5)' },
  { id: 'available' as const, label: 'Available (2)' },
  { id: 'bill' as const, label: 'Bill Pending (1)' },
];

export type RoleKey = 'owner' | 'manager' | 'waiter' | 'rider';

export const ROLE_MATRIX: Record<
  RoleKey,
  {
    icon: string;
    shortTitle: string;
    subtitle: string;
    badge: string;
    title: string;
    description: string;
    permissions: string[];
    uiRows: { left: string; right: string }[];
    uiHeader: string;
    uiStatus: string;
  }
> = {
  owner: {
    icon: 'shield_person',
    shortTitle: 'Owner',
    subtitle: 'Full P&L and store config',
    badge: 'Role Scope: Global Enterprise',
    title: 'Owner & Multi-Location Partner',
    description:
      'Administrative control over billing, branches, payout routing, menu pricing, and audit logs. Access consolidated reports across locations.',
    permissions: [
      'Real-time net margin & labor cost analytics',
      'Settlement account management',
      'Role & permission hierarchy controls',
    ],
    uiHeader: 'PERMISSIONS PROFILE: OWNER',
    uiStatus: 'ALL ACCREDITED',
    uiRows: [
      { left: 'Branch consolidated revenue', right: 'PKR 4,291,000' },
      { left: 'Labor cost ratio (current)', right: '21.4% (Optimal)' },
      { left: 'Tax & service charge settings', right: '10% SC, 5% Tax' },
    ],
  },
  manager: {
    icon: 'manage_accounts',
    shortTitle: 'Manager',
    subtitle: 'Shift logs & overrides',
    badge: 'Role Scope: Location Manager',
    title: 'Shift Manager',
    description:
      'Override discounts, manage open shifts, reassign tables, and resolve kitchen bottlenecks during service.',
    permissions: [
      'Shift open/close and cash reconciliation',
      'Promotion and discount overrides',
      'Staff assignment on floor plan',
    ],
    uiHeader: 'PERMISSIONS PROFILE: MANAGER',
    uiStatus: 'SHIFT ACTIVE',
    uiRows: [
      { left: 'Open shifts', right: '2 registers' },
      { left: 'Pending approvals', right: '3 discount requests' },
      { left: 'Floor alerts', right: '1 bill pending' },
    ],
  },
  waiter: {
    icon: 'room_service',
    shortTitle: 'Waiter',
    subtitle: 'Handheld table ticketing',
    badge: 'Role Scope: Front of House',
    title: 'Server / Waiter',
    description:
      'Mobile POS for tableside ordering, course firing, and guest requests — synced to kitchen and floor in real time.',
    permissions: [
      'My tables and active tickets',
      'Send to kitchen and void with reason',
      'Guest notes and allergy flags',
    ],
    uiHeader: 'PERMISSIONS PROFILE: WAITER',
    uiStatus: '4 TABLES ASSIGNED',
    uiRows: [
      { left: 'Active tables', right: 'T-02, T-05, T-07' },
      { left: 'Open tickets', right: '3 in progress' },
      { left: 'Last fire', right: '2m ago · Grill' },
    ],
  },
  rider: {
    icon: 'two_wheeler',
    shortTitle: 'Rider',
    subtitle: 'Deliveries & status',
    badge: 'Role Scope: Delivery Fleet',
    title: 'Delivery Rider',
    description:
      'See assigned runs only, update pickup and delivered status, and share ETA with customers.',
    permissions: [
      'Assigned delivery queue',
      'Contactless proof of delivery',
      'Cash-on-delivery collection flags',
    ],
    uiHeader: 'PERMISSIONS PROFILE: RIDER',
    uiStatus: 'ON ROUTE',
    uiRows: [
      { left: 'Active dispatch #892', right: '4.2 km · 12 min' },
      { left: 'Payment method', right: 'Prepaid' },
      { left: 'Next stop', right: 'Block 4, Gulberg' },
    ],
  },
};

export const ANALYTICS_KPIS = [
  { label: "Today's gross sales", value: 'PKR 5,127,000', sub: '+14.2% vs last Thursday', subTone: 'emerald' as const },
  { label: 'Average ticket size', value: 'PKR 15,126', sub: '340 orders placed today', subTone: 'dim' as const },
  { label: 'Peak rush velocity', value: '112 Covers/hr', sub: 'Recorded 7:15 PM – 8:30 PM', subTone: 'dim' as const },
] as const;

export const PAYMENT_MIX = [
  { label: 'Credit / Debit Cards (74%)', amount: 'PKR 3,793,980', percent: 74 },
  { label: 'Cash Settlements (16%)', amount: 'PKR 820,320', percent: 16 },
  { label: 'QR Digital Checkout (10%)', amount: 'PKR 512,700', percent: 10 },
] as const;

export const ARCHETYPES = [
  {
    icon: 'wine_bar',
    title: 'Fine Dining',
    description:
      'Multi-course routing, wine tracking, seat numbering, and tab transfers across dining rooms.',
  },
  {
    icon: 'coffee',
    title: 'Cafés & Fast Casual',
    description:
      'Lightning counter ticketing, customer-facing displays, modifiers, and loyalty cards.',
  },
  {
    icon: 'domain',
    title: 'Multi-Location Groups',
    description:
      'Centralized recipes, enterprise menu deployment, and unified royalty reporting.',
  },
  {
    icon: 'takeout_dining',
    title: 'Cloud Kitchens',
    description:
      'Virtual brand switching from one terminal, multi-courier dispatch, and pack-station bump bars.',
  },
] as const;

export const ONBOARDING_STEPS = [
  {
    step: '01',
    title: 'Build your menu & floor',
    description:
      'Import menus via CSV or use our builder. Create dining rooms and generate QR cards in minutes.',
  },
  {
    step: '02',
    title: 'Connect standard devices',
    description:
      'Runs on modern iPads, Android POS hardware, and standard network receipt printers — no proprietary lock-in.',
  },
  {
    step: '03',
    title: 'Start taking orders',
    description:
      'Invite staff with role-limited accounts. Counter, kitchen, and floor stay in sync from day one.',
  },
] as const;

export const MARKETING_FAQ = [
  {
    q: 'What hardware devices does Hisab Wise run on?',
    a:
      'Hisab Wise is cloud-native and runs on iPads (iOS 14+), Android tablets, desktop browsers (Chrome, Safari, Edge), and standard ESC/POS network thermal printers.',
  },
  {
    q: 'How do waiter mobile handhelds sync with the central counter?',
    a:
      'Orders from tableside devices hit the central ledger and kitchen displays instantly via real-time sync with low latency.',
  },
  {
    q: 'Does Hisab Wise operate during network or internet outages?',
    a:
      'Local client caching keeps tickets printing on the LAN until connectivity returns, then cloud records reconcile automatically.',
  },
  {
    q: 'Can I manage multiple branch locations under one dashboard?',
    a:
      'Multi-tenant architecture lets groups switch branches, deploy shared menus, and view consolidated reports with per-outlet tax settings.',
  },
  {
    q: 'How do customer QR payments settle into our bank account?',
    a:
      'Integrations with payment providers settle guest payments to your registered merchant account on standard payout schedules.',
  },
] as const;

export type FooterLink = { label: string; href: string };

export const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'POS & Ordering', href: '/#walkthrough' },
      { label: 'Kitchen Display System', href: '/#operations' },
      { label: 'Floor Plan & Tables', href: '/#floor-plan' },
      { label: 'QR Menu', href: '/#qr' },
      { label: 'Delivery & Riders', href: '/#operations' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { label: 'Waiter Workflow', href: '/#roles' },
      { label: 'Onboarding Process', href: '/legal/onboarding' },
      { label: 'Inventory & Modifiers', href: '/#product' },
      { label: 'Analytics & Reports', href: '/#analytics' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Customers', href: '/#solutions' },
      { label: 'Security', href: '/legal/security' },
      { label: 'Careers', href: 'https://www.nasmaklabs.com/careers' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms and Conditions', href: '/legal/terms' },
      { label: 'Refund Policy', href: '/legal/refund' },
      { label: 'Status', href: '/legal/status' },
    ],
  },
];
