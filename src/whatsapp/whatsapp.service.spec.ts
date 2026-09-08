import { CommunicationDeliveryStatus } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService reliability', () => {
  it('never downgrades a delivery when ACK events arrive out of order', async () => {
    const prisma = {
      communicationDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          status: CommunicationDeliveryStatus.READ,
          sentAt: new Date(),
          deliveredAt: new Date(),
          readAt: new Date(),
        }),
        update: jest.fn(),
      },
    };
    const service = new WhatsAppService({} as any, prisma as any, {} as any);

    await (service as any).handleAck({ id: 'provider-1', ack: 2 });

    expect(prisma.communicationDelivery.update).not.toHaveBeenCalled();
  });

  it('advances SENT directly to READ and preserves timestamps', async () => {
    const sentAt = new Date('2026-09-08T10:00:00-03:00');
    const prisma = {
      communicationDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          status: CommunicationDeliveryStatus.SENT,
          sentAt,
          deliveredAt: null,
          readAt: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new WhatsAppService({} as any, prisma as any, {} as any);

    await (service as any).handleAck({ id: 'provider-1', ack: 3 });

    expect(prisma.communicationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: CommunicationDeliveryStatus.READ,
          sentAt,
          deliveredAt: expect.any(Date),
          readAt: expect.any(Date),
        }),
      }),
    );
  });

  it('does not turn an audit-log failure into a duplicate-send retry', async () => {
    const provider = {
      sendText: jest.fn().mockResolvedValue({ providerMessageId: 'provider-1' }),
    };
    const prisma = {
      whatsAppMessage: {
        create: jest.fn().mockRejectedValue(new Error('database unavailable')),
      },
    };
    const service = new WhatsAppService(provider as any, prisma as any, {} as any);

    await expect(service.sendText('5519999999999', 'Teste')).resolves.toEqual({
      providerMessageId: 'provider-1',
    });
    expect(provider.sendText).toHaveBeenCalledTimes(1);
  });

  it('keeps the bot silent while a thread is handed off to a human', async () => {
    const provider = { sendText: jest.fn() };
    const prisma = {
      guestGroup: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'group-1',
            displayName: 'Família Teste',
            invitedToParty: false,
            phone: '(19) 99999-9999',
            phoneNormalized: '5519999999999',
            members: [{ name: 'João', attending: true }],
            rsvpResponse: null,
          },
        ]),
      },
      whatsAppMessage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'handoff-1' }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new WhatsAppService(provider as any, prisma as any, {} as any);

    await service.handleWebhook({
      event: 'onmessage',
      from: '5519999999999@c.us',
      body: 'Tenho mais uma dúvida',
      fromMe: false,
      id: 'message-2',
    });

    expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ needsHuman: true }),
      }),
    );
    expect(provider.sendText).not.toHaveBeenCalled();
  });
});
