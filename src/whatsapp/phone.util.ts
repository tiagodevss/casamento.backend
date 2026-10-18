export function normalizeBrazilPhone(value?: string | null): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return null;
}

export function phoneFromWhatsAppId(value?: unknown): string | null {
  if (typeof value !== 'string') return null;
  return normalizeBrazilPhone(value.split('@')[0].replace(/^\+/, ''));
}
