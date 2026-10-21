import { APP_COMPANY, APP_NAME } from '@/lib/config';

export type LegalDocumentKey =
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'onboarding'
  | 'status'
  | 'about'
  | 'security'
  | 'careers';

export type LegalSection = {
  heading?: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  description: string;
  sections: LegalSection[];
  updatedAt: string;
  externalCta?: { label: string; href: string };
};

const updated = 'September 27, 2026';

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'Terms and Conditions',
    description: `Terms governing use of the ${APP_NAME} platform.`,
    updatedAt: updated,
    sections: [
      {
        heading: 'Agreement',
        paragraphs: [
          `By creating an account or using ${APP_NAME} (operated by ${APP_COMPANY}), you agree to these Terms and Conditions. If you do not agree, do not use the service.`,
        ],
      },
      {
        heading: 'Service',
        paragraphs: [
          `${APP_NAME} provides cloud-based restaurant operations software including point of sale, kitchen display, floor management, QR ordering, delivery workflows, reporting, and related features. We may update features over time.`,
        ],
      },
      {
        heading: 'Accounts and subscriptions',
        paragraphs: [
          'You are responsible for accurate business information, safeguarding credentials, and activity under your tenant account. Subscription fees, trials, and billing intervals are shown at signup and in your admin billing area.',
        ],
      },
      {
        heading: 'Publicity and aggregated business metrics',
        paragraphs: [
          `You grant ${APP_COMPANY} permission to use aggregated, de-identified, or anonymized information derived from your use of the platform for marketing and publicity purposes. This may include high-level sales trends, order volumes, order counts, ticket size ranges, or similar metrics that do not identify your customers or disclose individual transactions.`,
          'We will not publish your business name, logo, or identifiable sales figures in marketing materials without your separate written consent, unless you opt in through a customer story or case study program.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'You may not misuse the platform, attempt unauthorized access, interfere with other tenants, or use the service for unlawful purposes. You retain ownership of your menu, customer, and operational data subject to our Privacy Policy.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'The service is provided on an "as is" basis to the extent permitted by law. Our liability is limited to the fees you paid for the service in the twelve months preceding a claim, except where prohibited by applicable law.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          `Questions about these terms: contact ${APP_COMPANY} through the demo request form on our website or your account support channel.`,
        ],
      },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    description: `How ${APP_COMPANY} collects, uses, and protects information.`,
    updatedAt: updated,
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          `This Privacy Policy describes how ${APP_COMPANY} ("we", "us") processes information when you use ${APP_NAME}.`,
        ],
      },
      {
        heading: 'Information we collect',
        paragraphs: [
          'We collect account and business profile data, staff user accounts, operational data you enter (orders, menus, customers, payments metadata), device and log data, and support communications.',
        ],
      },
      {
        heading: 'How we use information',
        paragraphs: [
          'We use data to provide and secure the service, process subscriptions, improve product performance, and comply with law.',
          'Aggregated or de-identified operational metrics (such as order counts or revenue bands) may be used for analytics and, as described in our Terms, for publicity and marketing without identifying your customers.',
        ],
      },
      {
        heading: 'Sharing',
        paragraphs: [
          'We use infrastructure and payment providers under contract. We do not sell personal customer lists. We may disclose information if required by law or to protect rights and safety.',
        ],
      },
      {
        heading: 'Retention and security',
        paragraphs: [
          'We retain data while your subscription is active and as needed for legal, billing, and backup purposes. We apply technical and organizational measures appropriate to a multi-tenant SaaS platform.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Depending on your jurisdiction, you may request access, correction, or deletion of personal data. Contact us through your account owner or the website demo form.',
        ],
      },
    ],
  },
  refund: {
    key: 'refund',
    title: 'Refund Policy',
    description: 'Subscription cancellation and refund rules.',
    updatedAt: updated,
    sections: [
      {
        heading: 'Trial period',
        paragraphs: [
          'If a free trial is offered, you may cancel before the trial ends without charge. When the trial converts to a paid subscription, the rules below apply.',
        ],
      },
      {
        heading: 'Cancellation eligibility',
        paragraphs: [
          'A paid subscription may be cancelled only if the cancellation request is submitted at least 15 calendar days after the subscription activation date (the date your paid plan first became active, including after trial conversion).',
          'Requests made before 15 days have elapsed will not be processed as a subscription cancellation for refund purposes; you may still contact support for account questions.',
        ],
      },
      {
        heading: 'Refund calculation',
        paragraphs: [
          'When an eligible cancellation is approved for the current billing period, we retain 20% of the subscription fee paid for that period and refund 80% to your original payment method where possible.',
          'Processing time depends on your bank or payment provider; allow up to 14 business days after approval.',
        ],
      },
      {
        heading: 'Non-refundable items',
        paragraphs: [
          'Onboarding add-ons, extra training or demo sessions beyond included entitlements, third-party fees, and taxes may be non-refundable unless required by law.',
        ],
        list: [
          'Partial months are not prorated unless stated in your invoice or a separate agreement.',
          'Chargebacks without contacting support first may result in account suspension.',
        ],
      },
      {
        heading: 'How to request',
        paragraphs: [
          'Submit a cancellation and refund request through your account billing contact or the website demo/support form. Include your business name, account email, and activation date.',
        ],
      },
    ],
  },
  onboarding: {
    key: 'onboarding',
    title: 'Onboarding Process',
    description: `How ${APP_NAME} helps you go live.`,
    updatedAt: updated,
    sections: [
      {
        heading: 'What we include',
        paragraphs: [
          `Our onboarding team works with you to launch on ${APP_NAME}. Standard onboarding includes:`,
        ],
        list: [
          'Account setup and tenant configuration (roles, taxes, receipt basics).',
          'Menu ingestion: we help feed your menu (categories, items, modifiers) from your existing sheets or exports where possible.',
          'One (1) complimentary live product demo tailored to your service model.',
          'One (1) complimentary training session for your core staff (POS, kitchen, or floor — agreed during onboarding).',
        ],
      },
      {
        heading: 'Additional sessions',
        paragraphs: [
          'Extra demo or training sessions beyond the included ones are available on request.',
          'Each additional demo or training session is charged at PKR 500 per session, payable before the session is scheduled.',
        ],
      },
      {
        heading: 'Your responsibilities',
        paragraphs: [
          'Provide accurate menu data, floor layouts, and staff emails. Designate an owner or manager as the primary contact. Ensure devices and printers meet our hardware guidelines.',
        ],
      },
      {
        heading: 'Timeline',
        paragraphs: [
          'Most single-location restaurants complete onboarding within a few business days after menu materials are received. Complex multi-location rollouts may follow a separate project plan.',
        ],
      },
      {
        heading: 'Book onboarding',
        paragraphs: [
          'Start from the website demo section or register for a trial; our team will reach out to schedule your included demo and training.',
        ],
      },
    ],
  },
  status: {
    key: 'status',
    title: 'System Status',
    description: 'Platform availability.',
    updatedAt: updated,
    sections: [
      {
        paragraphs: [
          'All core systems are operational.',
          'API, authentication, order processing, kitchen sync, and public marketing endpoints are running normally.',
          'If you experience an issue, contact support through your account or the demo form on the homepage.',
        ],
      },
    ],
  },
  about: {
    key: 'about',
    title: 'About Hisab Wise',
    description: `About ${APP_COMPANY}.`,
    updatedAt: updated,
    sections: [
      {
        paragraphs: [
          `${APP_NAME} is a multi-tenant restaurant operating system built for cafes, restaurants, and food businesses that need POS, kitchen display, floor plans, QR ordering, delivery, and real-time reporting in one place.`,
          `${APP_NAME} is a product of Nasmak Labs (SMC-Private) Limited. Nasmak Labs focuses on strategy-led software and digital products.`,
        ],
      },
    ],
  },
  security: {
    key: 'security',
    title: 'Security',
    description: 'How we protect tenant data.',
    updatedAt: updated,
    sections: [
      {
        paragraphs: [
          'Tenant data is isolated per business at the application and database layer. Staff access is controlled through role-based permissions.',
          'We use encrypted transport (HTTPS), secure authentication, and industry-standard hosting practices. Report security concerns through your account owner or the website contact form.',
        ],
      },
    ],
  },
  careers: {
    key: 'careers',
    title: 'Careers',
    description: `${APP_NAME} is built by Nasmak Labs. Explore open roles on our parent company careers site.`,
    updatedAt: updated,
    externalCta: {
      label: 'View job opportunities at Nasmak Labs',
      href: 'https://www.nasmaklabs.com/careers',
    },
    sections: [
      {
        heading: 'Build with Nasmak Labs',
        paragraphs: [
          `${APP_NAME} is a product of Nasmak Labs (SMC-Private) Limited. Nasmak Labs builds purposeful digital products across AI, apps, UI/UX, and product strategy.`,
          'Careers at Nasmak Labs include competitive salary, performance bonuses, paid leave, and an in-office culture focused on collaboration and shipping great products.',
        ],
      },
      {
        heading: 'View job opportunities',
        paragraphs: [
          'Open positions and hiring updates are published on the Nasmak Labs careers page. You will apply and interview through Nasmak Labs as the employer; some roles may work on Hisab Wise and other Nasmak products.',
          'Visit: https://www.nasmaklabs.com/careers',
        ],
      },
    ],
  },
};

export function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return value in LEGAL_DOCUMENTS;
}
