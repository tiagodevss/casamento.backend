import { normalizeBrazilPhone, phoneFromWhatsAppId } from './phone.util';

describe('phone utilities', () => {
  it.each([
    ['(19) 99999-9999', '5519999999999'],
    ['19 99999-9999', '5519999999999'],
    ['5519999999999', '5519999999999'],
    ['(19) 3333-4444', '551933334444'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeBrazilPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '001234567890', '551999999999999'])('rejects invalid phone %s', (input) => {
    expect(normalizeBrazilPhone(input)).toBeNull();
  });

  it('extracts phone from WhatsApp id', () => {
    expect(phoneFromWhatsAppId('5519999999999@c.us')).toBe('5519999999999');
  });
});
