import { CommunicationTemplateScope } from '@prisma/client';
import { DEFAULT_CAMPAIGN_PLAN, DEFAULT_COMMUNICATION_TEMPLATES } from './communication-defaults';

describe('default communication plan', () => {
  it('references only existing templates', () => {
    const keys = new Set(DEFAULT_COMMUNICATION_TEMPLATES.map((item) => item.key));
    expect(DEFAULT_CAMPAIGN_PLAN.every((item) => keys.has(item.templateKey))).toBe(true);
  });

  it('keeps every template with individual and group copy', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      expect(template.bodySingle.trim()).not.toBe('');
      expect(template.bodyGroup.trim()).not.toBe('');
    }
  });

  it('keeps planned sends in chronological order', () => {
    const timestamps = DEFAULT_CAMPAIGN_PLAN.map((item) => new Date(item.suggestedAt).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });
});


  it('gives every planned campaign a validity after its suggested send time', () => {
    for (const item of DEFAULT_CAMPAIGN_PLAN) {
      expect(new Date(item.expiresAt).getTime()).toBeGreaterThan(
        new Date(item.suggestedAt).getTime(),
      );
    }
  });

  it('marks every default template containing party location data as PARTY scoped', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      const body = `${template.bodySingle}\n${template.bodyGroup}`;
      if (
        body.includes('{{maps_festa}}') ||
        body.includes('Praxiteles F. Neves')
      ) {
        expect(template.scope).toBe(CommunicationTemplateScope.PARTY);
      }
    }
  });
