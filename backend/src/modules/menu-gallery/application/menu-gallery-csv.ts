import { z } from 'zod';
import { storageReferenceSchema } from '../../../shared/files/storage-reference-schema';

export const MENU_GALLERY_CSV_HEADERS = [
  'label',
  'search_terms',
  'image_url',
  'display_order',
  'active',
] as const;

export type MenuGalleryCsvHeader = (typeof MENU_GALLERY_CSV_HEADERS)[number];

export interface MenuGalleryCsvRow {
  lineNumber: number;
  label: string;
  searchTerms: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuGalleryCsvParseError {
  lineNumber: number;
  message: string;
}

export const MENU_GALLERY_CSV_SAMPLE = `label,search_terms,image_url,display_order,active
Chai,"tea,karak,doodh patti",menu-gallery/platform/PASTE-STORAGE-KEY-AFTER-UPLOAD.jpg,0,yes
Coffee,"espresso,cappuccino,latte",menu-gallery/platform/PASTE-STORAGE-KEY-AFTER-UPLOAD.jpg,1,yes
Chicken Biryani,"biryani,rice,chicken",menu-gallery/platform/PASTE-STORAGE-KEY-AFTER-UPLOAD.jpg,2,yes
Beef Biryani,"biryani,rice,beef",menu-gallery/platform/PASTE-STORAGE-KEY-AFTER-UPLOAD.jpg,3,yes
Lemonade,"drinks,cold,refreshing",menu-gallery/platform/PASTE-STORAGE-KEY-AFTER-UPLOAD.jpg,4,yes
`;

function parseBoolean(value: string, defaultValue = true): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['yes', 'true', '1', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n'].includes(normalized)) return false;
  throw new Error(`Invalid yes/no value "${value}"`);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

const imageUrlSchema = storageReferenceSchema;

export function parseMenuGalleryCsv(content: string): {
  rows: MenuGalleryCsvRow[];
  errors: MenuGalleryCsvParseError[];
} {
  const errors: MenuGalleryCsvParseError[] = [];
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return { rows: [], errors: [{ lineNumber: 1, message: 'CSV is empty' }] };
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ lineNumber: 1, message: 'CSV must include a header row and at least one data row' }],
    };
  }

  const headerFields = parseCsvLine(lines[0]).map(normalizeHeader);
  const expected = MENU_GALLERY_CSV_HEADERS as readonly string[];

  if (headerFields.length !== expected.length || !expected.every((h, i) => headerFields[i] === h)) {
    return {
      rows: [],
      errors: [
        {
          lineNumber: 1,
          message: `Invalid header. Expected: ${expected.join(',')}`,
        },
      ],
    };
  }

  const rows: MenuGalleryCsvRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const fields = parseCsvLine(lines[index]);

    if (fields.length !== expected.length) {
      errors.push({
        lineNumber,
        message: `Expected ${expected.length} columns but found ${fields.length}`,
      });
      continue;
    }

    const [label, searchTerms, imageUrl, displayOrder, active] = fields;

    if (!label.trim()) {
      errors.push({ lineNumber, message: 'label is required' });
      continue;
    }

    if (!imageUrl.trim()) {
      errors.push({ lineNumber, message: 'image_url is required (storage key or https URL)' });
      continue;
    }

    try {
      const parsedImageUrl = imageUrlSchema.parse(imageUrl.trim());
      const parsedActive = parseBoolean(active, true);

      let parsedDisplayOrder = 0;
      if (displayOrder.trim()) {
        const n = Number(displayOrder.trim());
        if (!Number.isInteger(n) || n < 0 || n > 10_000) {
          throw new Error('display_order must be a whole number between 0 and 10000');
        }
        parsedDisplayOrder = n;
      }

      rows.push({
        lineNumber,
        label: label.trim(),
        searchTerms: searchTerms.trim() || null,
        imageUrl: parsedImageUrl,
        displayOrder: parsedDisplayOrder,
        isActive: parsedActive,
      });
    } catch (error) {
      const message = error instanceof z.ZodError
        ? 'image_url must be a storage key or https URL'
        : error instanceof Error
          ? error.message
          : 'Invalid row';
      errors.push({ lineNumber, message });
    }
  }

  return { rows, errors };
}
