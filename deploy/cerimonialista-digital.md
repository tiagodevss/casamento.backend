# Cerimonialista digital - operação e deploy

A cerimonialista digital usa o backend NestJS como fonte de verdade para convidados, RSVP, templates, campanhas, fila e histórico. O WPPConnect Server roda em um container separado e privado na mesma rede Docker.

## Segurança operacional

- As campanhas padrão são criadas como `DRAFT`. Nenhuma mensagem é disparada apenas pelo deploy.
- Uma campanha só pode ser agendada/enviada após `preview`, e qualquer alteração posterior no template invalida o preview.
- O destinatário é revalidado imediatamente antes do envio. RSVP concluído, opt-out e cancelamento impedem o disparo mesmo se o destinatário já estava na fila.
- A fila é persistida no PostgreSQL e possui unicidade por campanha + convite, evitando duplicidade após restart.
- A janela padrão de envio é 09:00-20:00 em `America/Sao_Paulo`.
- O WPPConnect não possui porta publicada no host/Traefik; apenas o backend fala com ele pela rede Docker.
- Automação via WPPConnect é não oficial e pode sofrer bloqueio pelo WhatsApp. O número deve ser dedicado ao casamento.

## Variáveis obrigatórias

Defina no `.env` remoto:

```env
WPPCONNECT_URL=http://wppconnect:21465
WPPCONNECT_SESSION=casamento
WPPCONNECT_SECRET=<segredo-forte-e-aleatorio>
WHATSAPP_WEBHOOK_SECRET=<outro-segredo-forte-e-aleatorio>
WPPCONNECT_WEBHOOK_URL=http://api:3000/api/whatsapp/webhook?secret=<mesmo-WHATSAPP_WEBHOOK_SECRET>
COMMUNICATION_TIMEZONE=America/Sao_Paulo
COMMUNICATION_WINDOW_START=9
COMMUNICATION_WINDOW_END=20
```

`WPPCONNECT_SECRET` e `WHATSAPP_WEBHOOK_SECRET` devem ser diferentes.

## Primeiro deploy

1. Atualize o `.env` remoto antes de subir os containers.
2. Execute o deploy normal. O `docker-compose.yml` iniciará `casamento_api` e `casamento_wppconnect`.
3. No painel administrativo, abra **Cerimonialista**.
4. Clique **Conectar WhatsApp**.
5. Gere/atualize o QR e leia pelo WhatsApp do número dedicado.
6. Confirme o status **Conectado**.
7. Envie uma mensagem de teste para Tiago/Gabriela.
8. Reinicie o container `casamento_wppconnect` e confirme que a sessão permaneceu conectada. Os volumes de token e `userDataDir` são persistentes.
9. Revise os templates e faça preview da primeira campanha.
10. Só então agende ou envie.

## Comportamento do atendimento sem IA

Mensagens recebidas são tratadas por regras fixas:

- `1`: link de RSVP e nomes ainda pendentes.
- `2`: horários/locais. Detalhes da festa só são retornados para convite de festa com `partyAttending=true`.
- `3`: link da lista de presentes com texto opcional/leve.
- `4`: sinaliza atendimento humano no painel.
- `PARAR`, `SAIR` ou `STOP`: ativa opt-out e remove o convite das próximas automações.
- Texto desconhecido: reapresenta o menu; não tenta interpretar com IA.

## Lista de presentes

Atualmente o frontend redireciona `/presentes` para o Casar.com. Por isso este projeto não sabe com segurança qual convidado efetivamente presenteou os noivos e **não** exclui automaticamente do lembrete quem já comprou um presente. Esse filtro só deve ser implementado se a compra voltar a passar pelo backend do casamento ou se houver integração confiável com a plataforma externa.

## Diagnóstico

- Status da sessão: painel **Cerimonialista > Visão geral**.
- Falha de envio: histórico da campanha em `CommunicationDelivery.lastError`.
- Sessão desconectada: entregas permanecem `PENDING`; não são descartadas.
- Após três tentativas falhas, a entrega fica `FAILED`.
- Mensagens que deixaram de ser elegíveis ficam `SKIPPED` com o motivo registrado.

## Rollback

O container WPPConnect pode ser parado sem quebrar RSVP, pagamentos ou o restante do site. Enquanto estiver indisponível, a fila permanece no PostgreSQL. Não reverta a migration depois que existirem dados de campanhas; para rollback de aplicação, mantenha as novas tabelas e apenas desative o módulo/container.
