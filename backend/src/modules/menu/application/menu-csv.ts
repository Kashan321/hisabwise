export const MENU_CSV_HEADERS = [
  'category',
  'item_name',
  'description',
  'base_price',
  'image_url',
  'available',
  'variant_name',
  'variant_price',
  'modifier_group_name',
  'modifier_group_required',
  'modifier_group_max_select',
  'modifier_option_name',
  'modifier_option_price',
] as const;

export type MenuCsvHeader = (typeof MENU_CSV_HEADERS)[number];

export interface MenuCsvRow {
  lineNumber: number;
  category: string;
  itemName: string;
  description: string | null;
  basePrice: string;
  imageUrl: string | null;
  available: boolean;
  variantName: string | null;
  variantPrice: string | null;
  modifierGroupName: string | null;
  modifierGroupRequired: boolean | null;
  modifierGroupMaxSelect: number | null;
  modifierOptionName: string | null;
  modifierOptionPrice: string | null;
}

export interface MenuCsvParseError {
  lineNumber: number;
  message: string;
}

export const MENU_CSV_SAMPLE = `category,item_name,description,base_price,image_url,available,variant_name,variant_price,modifier_group_name,modifier_group_required,modifier_group_max_select,modifier_option_name,modifier_option_price
Beverages,Espresso,Single shot espresso,250,,yes,,,,,,,
Biryani,Chicken Biryani,Fragrant basmati rice,250,,yes,Half,250,,,,,
Biryani,Chicken Biryani,Fragrant basmati rice,250,,yes,Full,450,,,,,
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,Small,800,,,,,
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,Medium,1100,,,,,
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,Large,1400,,,,,
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,Family,1900,,,,,
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Crust,yes,1,Regular,0
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Crust,yes,1,Thin,0
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Crust,yes,1,Cheese Burst,250
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Extra Toppings,no,5,Extra Cheese,200
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Extra Toppings,no,5,Olives,100
Pizza,Chicken Fajita Pizza,Wood-fired pizza,800,,yes,,,Extra Toppings,no,5,Mushrooms,100
`;

const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

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

function validatePrice(value: string, field: string, lineNumber: number): string {
  const trimmed = value.trim();
  if (!PRICE_REGEX.test(trimmed)) {
    throw new Error(`Line ${lineNumber}: ${field} must be a valid price (e.g. 450 or 4.50)`);
  }
  return trimmed;
}

export function parseMenuCsv(content: string): { rows: MenuCsvRow[]; errors: MenuCsvParseError[] } {
  const errors: MenuCsvParseError[] = [];
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return { rows: [], errors: [{ lineNumber: 1, message: 'CSV file is empty' }] };
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ lineNumber: 1, message: 'CSV must include a header row and at least one data row' }],
    };
  }

  const headerFields = parseCsvLine(lines[0]).map(normalizeHeader);
  const expected = MENU_CSV_HEADERS as readonly string[];

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

  const rows: MenuCsvRow[] = [];

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

    const [
      category,
      itemName,
      description,
      basePrice,
      imageUrl,
      available,
      variantName,
      variantPrice,
      modifierGroupName,
      modifierGroupRequired,
      modifierGroupMaxSelect,
      modifierOptionName,
      modifierOptionPrice,
    ] = fields;

    if (!category.trim() || !itemName.trim()) {
      errors.push({ lineNumber, message: 'category and item_name are required' });
      continue;
    }

    try {
      const parsedBasePrice = validatePrice(basePrice, 'base_price', lineNumber);
      const parsedAvailable = parseBoolean(available, true);

      let parsedVariantPrice: string | null = null;
      if (variantName.trim()) {
        if (!variantPrice.trim()) {
          throw new Error('variant_price is required when variant_name is provided');
        }
        parsedVariantPrice = validatePrice(variantPrice, 'variant_price', lineNumber);
      } else if (variantPrice.trim()) {
        throw new Error('variant_name is required when variant_price is provided');
      }

      let parsedModifierRequired: boolean | null = null;
      let parsedModifierMaxSelect: number | null = null;
      let parsedModifierOptionPrice: string | null = null;

      if (modifierGroupName.trim()) {
        parsedModifierRequired = parseBoolean(modifierGroupRequired, false);
        const maxSelect = Number(modifierGroupMaxSelect.trim() || '1');
        if (!Number.isInteger(maxSelect) || maxSelect < 1) {
          throw new Error('modifier_group_max_select must be a positive integer');
        }
        parsedModifierMaxSelect = maxSelect;

        if (modifierOptionName.trim()) {
          parsedModifierOptionPrice = validatePrice(
            modifierOptionPrice || '0',
            'modifier_option_price',
            lineNumber,
          );
        }
      } else if (
        modifierGroupRequired.trim() ||
        modifierGroupMaxSelect.trim() ||
        modifierOptionName.trim() ||
        modifierOptionPrice.trim()
      ) {
        throw new Error('modifier_group_name is required for modifier columns');
      }

      if (modifierOptionName.trim() && !modifierGroupName.trim()) {
        throw new Error('modifier_group_name is required when modifier_option_name is provided');
      }

      rows.push({
        lineNumber,
        category: category.trim(),
        itemName: itemName.trim(),
        description: description.trim() || null,
        basePrice: parsedBasePrice,
        imageUrl: imageUrl.trim() || null,
        available: parsedAvailable,
        variantName: variantName.trim() || null,
        variantPrice: parsedVariantPrice,
        modifierGroupName: modifierGroupName.trim() || null,
        modifierGroupRequired: parsedModifierRequired,
        modifierGroupMaxSelect: parsedModifierMaxSelect,
        modifierOptionName: modifierOptionName.trim() || null,
        modifierOptionPrice: parsedModifierOptionPrice,
      });
    } catch (error) {
      errors.push({
        lineNumber,
        message: error instanceof Error ? error.message.replace(`Line ${lineNumber}: `, '') : 'Invalid row',
      });
    }
  }

  return { rows, errors };
}
