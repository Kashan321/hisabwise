import {
  createMenuItemSchema,
  updateMenuItemSchema,
} from '../../../src/modules/menu/presentation/http/menu.validators';

describe('updateMenuItemSchema', () => {
  it('accepts availability-only patch without pricing fields', () => {
    const parsed = updateMenuItemSchema.parse({ isAvailable: false });
    expect(parsed).toEqual({ isAvailable: false });
    expect(parsed).not.toHaveProperty('pricingType');
  });

  it('accepts toggling availability back on', () => {
    const parsed = updateMenuItemSchema.parse({ isAvailable: true });
    expect(parsed.isAvailable).toBe(true);
  });

  it('rejects invalid price strings when price is sent', () => {
    expect(() => updateMenuItemSchema.parse({ price: '' })).toThrow();
    expect(() => updateMenuItemSchema.parse({ price: '-1' })).toThrow();
  });

  it('accepts valid partial price update', () => {
    const parsed = updateMenuItemSchema.parse({ price: '12.50' });
    expect(parsed.price).toBe('12.50');
  });
});

describe('createMenuItemSchema', () => {
  it('requires price for fixed-price create', () => {
    expect(() =>
      createMenuItemSchema.parse({
        categoryId: '00000000-0000-4000-8000-000000000001',
        name: 'Test',
      }),
    ).toThrow(/Price is required/);
  });
});
