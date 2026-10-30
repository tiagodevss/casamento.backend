# Cerimonialista digital - operação e deploy

A cerimonialista digital usa o backend NestJS como fonte de verdade para convidados, RSVP, templates, campanhas, fila e histórico. O WPPConnect Server roda em um container separado, ligado apenas à rede `casamento-internal`; o backend participa dessa rede e também da rede externa do Traefik. Assim o WPPConnect continua com saída para a internet, mas não fica exposto aos demais serviços da rede compartilhada.

## Segurança operacional

- As campanhas padrão são criadas como `DRAFT`. Nenhuma mensagem é disparada apenas pelo deploy.
- Uma campanha só pode ser agendada/enviada após `preview`, e qualquer alteração posterior no template invalida o preview.
- O destinatário é revalidado imediatamente antes do envio. RSVP concluído, opt-out e cancelamento impedem o disparo mesmo se o destinatário já estava na fila.
- A fila é persistida no PostgreSQL e possui unicidade por campanha + convite, evitando duplicidade após restart.
- Público, telefone e versão do template são aprovados no preview. Variáveis dinâmicas de RSVP e dias faltando são recalculadas imediatamente antes de cada entrega.
- Timeouts/resets após iniciar um envio viram falha de resultado incerto e nunca são reenviados automaticamente.
- Mídias recebidas não são baixadas para o webhook; áudio/foto/documento são encaminhados para atendimento humano por metadados.
- Webhooks inbound passam por `casamento_webhook_relay`: o relay persiste o evento em volume antes de responder ao WPPConnect e tenta entregá-lo ao Nest até receber 2xx. Reinícios não descartam a fila.
- O WPPConnect também inicia com `allUnreadOnStart=true` como segunda camada de recuperação para mensagens ainda não marcadas como lidas.
- A janela padrão de envio é 09:00-20:00 em `America/Sao_Paulo`; agendamentos fora dessa janela são rejeitados.
- Campanhas possuem validade (`expiresAt`). Campanhas vencidas viram `EXPIRED` e entregas restantes ficam `SKIPPED/CAMPAIGN_EXPIRED`.
- O WPPConnect não possui porta publicada no host/Traefik e não participa da rede compartilhada `inboxflow-network`; apenas o backend o acessa pela bridge `casamento-internal`.
- Automação via WPPConnect é não oficial e pode sofrer bloqueio pelo WhatsApp. O número deve ser dedicado ao casamento.

## Variáveis obrigatórias

Defina no `.env` remoto:

```env
WPP_SERVER_TAG=2.10.71
WPPCONNECT_URL=http://wppconnect:21465
WPPCONNECT_SESSION=casamento
WPPCONNECT_SECRET=<segredo-forte-e-aleatorio>
WHATSAPP_WEBHOOK_SECRET=<outro-segredo-forte-e-aleatorio>
COMMUNICATION_TIMEZONE=America/Sao_Paulo
COMMUNICATION_WINDOW_START=9
COMMUNICATION_WINDOW_END=20
PARTY_RSVP_OPEN=false
GIFT_PIX_KEY=<chave-pix-do-casal>
```

`WPPCONNECT_SECRET` e `WHATSAPP_WEBHOOK_SECRET` devem ser diferentes.

`PARTY_RSVP_OPEN=false` encerra novas respostas sobre a festa (site, API e menu do WhatsApp); a cerimônia continua aberta, quem já confirmou a festa mantém a resposta e o painel administrativo ainda consegue corrigi-la. `GIFT_PIX_KEY` alimenta `{{pix}}`; vazia, a campanha de Pix pula todos os envios (`NO_PIX_KEY`).

## Plano dos últimos 15 dias (30/10 a 16/11/2026)

O plano está em `src/communications/communication-defaults.ts`. Como `ensureDefaults()` só cria o que não existe, o banco já em uso precisa do script (depois do deploy, que aplica a migration dos ingressos):

```bash
npm run build
node scripts/apply-countdown-plan.mjs           # simulação
node scripts/apply-countdown-plan.mjs --apply   # grava
```

O script atualiza os templates, desativa os aposentados, remove só rascunhos antigos sem envios, recria o calendário e gera o ingresso (QR Code) de quem confirmou a festa. Pode rodar de novo (por exemplo, se alguém confirmar a festa depois). Todas as campanhas ficam em `DRAFT`: revise o preview e agende no painel.

| Grupo | Audiência | Mensagens |
|---|---|---|
| Não confirmaram | `RSVP_PENDING` | 30/10, 04/11, 09/11, 13/11 |
| Confirmaram só a cerimônia | `CEREMONY_ONLY_CONFIRMED` | semana, amanhã, hoje |
| Confirmaram a festa | `PARTY_CONFIRMED` | semana, QR Code (12/11), hoje |
| Todos os confirmados | `CONFIRMED` | apresentação (30/10), presentes (03/11), Pix (11/11), agradecimento (16/11) |

Convites sem telefone válido (`NO_VALID_PHONE` no preview) precisam ser avisados à mão.

## QR Code de entrada da festa

Cada convite que confirmou a festa tem um `ticketToken`. O convidado recebe `{{ingresso}}` (`/ingresso/<token>`), página pública com o QR Code, que aponta para `/admin/checkin/<token>`. Na porta, quem estiver logado como administrador lê o QR com a câmera do celular e vê o resultado (válido, já usado, inválido); "Liberar entrada" registra `checkedInAt` e cada QR vale uma entrada, com opção de desfazer. Teste a leitura com dois celulares reais antes do envio de 12/11.

## Primeiro deploy

1. Atualize o `.env` remoto antes de subir os containers.
2. Execute o deploy normal. O `docker-compose.yml` iniciará `casamento_api`, `casamento_webhook_relay` e `casamento_wppconnect`.
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
- `2`: horários/locais (cerimônia às 15h00). Detalhes da festa só são retornados para convite de festa com `partyAttending=true`, junto do aviso de lotação limitada e do QR Code.
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
- Após três tentativas falhas conhecidas, a entrega fica `FAILED` e pode ser retomada pelo painel.
- Falhas marcadas como `UNCERTAIN_SEND` não entram no retry automático/manual em lote para evitar duplicidade.
- Mensagens que deixaram de ser elegíveis ficam `SKIPPED` com o motivo registrado.

## Rollback

O container WPPConnect pode ser parado sem quebrar RSVP, pagamentos ou o restante do site. Enquanto estiver indisponível, a fila permanece no PostgreSQL. Não reverta a migration depois que existirem dados de campanhas; para rollback de aplicação, mantenha as novas tabelas e apenas desative o módulo/container.
