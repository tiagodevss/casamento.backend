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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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


describe('WhatsAppService media handoff', () => {
  it('stores only media metadata and hands the thread to a human', async () => {
    const provider = {
      sendText: jest.fn().mockResolvedValue({ providerMessageId: 'reply-1' }),
    };
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
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new WhatsAppService(provider as any, prisma as any, {} as any);

    const hugeBase64 = 'A'.repeat(10_000);
    const result = await service.handleWebhook({
      event: 'onmessage',
      from: '5519999999999@c.us',
      body: hugeBase64,
      type: 'audio',
      mimetype: 'audio/ogg',
      fromMe: false,
      id: 'media-1',
    });

    expect(result).toEqual({ ok: true, handled: 'media' });
    expect(prisma.whatsAppMessage.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          body: '[Áudio recebido]',
          needsHuman: true,
          eventType: 'onmessage:media:audio',
        }),
      }),
    );
    expect(
      prisma.whatsAppMessage.create.mock.calls[0][0].data.body,
    ).not.toContain(hugeBase64);
    expect(provider.sendText).toHaveBeenCalledWith(
      '5519999999999',
      expect.stringContaining('sua mensagem ficou sinalizada'),
    );
  });
});


describe('WhatsAppService durable inbound retries', () => {
  it('reprocesses a duplicate provider event when the previous attempt was not completed', async () => {
    const provider = {
      sendText: jest.fn().mockResolvedValue({ providerMessageId: 'reply-optout' }),
    };
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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      whatsAppMessage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'P2002' }))
          .mockResolvedValueOnce({}),
        findUnique: jest.fn().mockResolvedValue({ processedAt: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new WhatsAppService(provider as any, prisma as any, {} as any);

    const result = await service.handleWebhook({
      event: 'onmessage',
      from: '5519999999999@c.us',
      body: 'PARAR',
      fromMe: false,
      id: 'same-provider-id',
    });

    expect(result).toEqual({ ok: true, handled: 'message' });
    expect(prisma.guestGroup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsappOptOut: true }),
      }),
    );
    expect(prisma.whatsAppMessage.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: 'same-provider-id', processedAt: null },
      data: { processedAt: expect.any(Date) },
    });
  });

  it('drops a duplicate provider event only after it is marked processed', async () => {
    const provider = { sendText: jest.fn() };
    const prisma = {
      guestGroup: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      whatsAppMessage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(Object.assign(new Error('duplicate'), { code: 'P2002' })),
        findUnique: jest.fn().mockResolvedValue({ processedAt: new Date() }),
      },
    };
    const service = new WhatsAppService(provider as any, prisma as any, {} as any);

    await service.handleWebhook({
      event: 'onmessage',
      from: '5519999999999@c.us',
      body: 'PARAR',
      fromMe: false,
      id: 'processed-provider-id',
    });

    expect(provider.sendText).not.toHaveBeenCalled();
  });
});

describe('WhatsAppService QR code', () => {
  const closed = { qrCode: null, raw: { status: 'CLOSED', message: 'QRCode is not available...' } };
  const ready = { qrCode: 'data:image/png;base64,AAAA', raw: { contentType: 'image/png', size: 4 } };

  it('waits for the QR code to be generated after start-session', async () => {
    const provider = {
      startSession: jest.fn(),
      getQrCode: jest
        .fn()
        .mockResolvedValueOnce({ qrCode: null, raw: { status: 'INITIALIZING' } })
        .mockResolvedValueOnce({ qrCode: null, raw: { status: 'INITIALIZING' } })
        .mockResolvedValueOnce(ready),
    };
    const service = new WhatsAppService(provider as any, {} as any, {} as any);

    await expect(service.qrCode(5, 1)).resolves.toBe(ready);
    expect(provider.getQrCode).toHaveBeenCalledTimes(3);
    expect(provider.startSession).not.toHaveBeenCalled();
  });

  it('restarts a closed session exactly once', async () => {
    const provider = {
      startSession: jest.fn().mockResolvedValue({}),
      getQrCode: jest.fn().mockResolvedValueOnce(closed).mockResolvedValueOnce(closed).mockResolvedValueOnce(ready),
    };
    const service = new WhatsAppService(provider as any, {} as any, {} as any);

    await expect(service.qrCode(5, 1)).resolves.toBe(ready);
    expect(provider.startSession).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempts are exhausted and stops when already connected', async () => {
    const never = { startSession: jest.fn(), getQrCode: jest.fn().mockResolvedValue({ qrCode: null, raw: { status: 'INITIALIZING' } }) };
    await expect(new WhatsAppService(never as any, {} as any, {} as any).qrCode(3, 1)).resolves.toEqual({
      qrCode: null,
      raw: { status: 'INITIALIZING' },
    });
    expect(never.getQrCode).toHaveBeenCalledTimes(3);

    const connected = { startSession: jest.fn(), getQrCode: jest.fn().mockResolvedValue({ qrCode: null, raw: { status: 'CONNECTED' } }) };
    await new WhatsAppService(connected as any, {} as any, {} as any).qrCode(3, 1);
    expect(connected.getQrCode).toHaveBeenCalledTimes(1);
  });
});
