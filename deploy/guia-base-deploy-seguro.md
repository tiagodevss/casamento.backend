# Guia Base de Deploy Seguro

Este documento registra o padrão seguido no deploy do CRM WMS Empresarial e deve servir como base para novos projetos da Codi Solutions.

O objetivo é deixar um processo repetível, com foco em:

- segurança de acesso ao servidor
- isolamento de segredos
- deploy reproduzível
- reversibilidade operacional
- automação de entrega

## 1. Princípios usados

As decisões de deploy seguiram estes princípios:

- nunca deixar segredo hardcoded no código-fonte
- nunca depender de acesso SSH por senha no estado final
- separar o papel de proxy reverso, frontend, backend e banco
- deixar o servidor utilizável por usuário operacional, não por `root`
- automatizar deploy pelo repositório sempre que possível
- validar o serviço publicado com checagem real, não só com container "up"

## 2. Estrutura recomendada no servidor

Padrão adotado:

- `/apps/traefik`
- `/apps/<projeto>.frontend`
- `/apps/<projeto>.backend`

No caso deste projeto:

- `/apps/traefik`
- `/apps/wms-crm.frontend`
- `/apps/wms-crm.backend`

Essa estrutura facilita:

- leitura rápida da infraestrutura
- isolamento por serviço
- manutenção e backup
- reaproveitamento em outros projetos

## 3. Hardening inicial do servidor

Antes de publicar a aplicação, foram aplicadas medidas básicas de segurança no host:

- criação de usuário operacional dedicado
- desativação do uso contínuo do usuário `root`
- troca de acesso por senha para acesso por chave SSH
- ativação de firewall
- ativação de `fail2ban`
- criação de swap para melhorar estabilidade do host

Checklist recomendado:

1. criar usuário operacional com permissões controladas
2. adicionar chave pública SSH desse usuário
3. testar login por chave antes de desativar senha
4. desativar `PermitRootLogin`
5. desativar `PasswordAuthentication` quando o acesso por chave estiver validado
6. ativar `ufw` com somente as portas necessárias
7. instalar e ativar `fail2ban`

## 4. Configuração de acesso SSH

Padrão usado:

- gerar uma chave dedicada para o projeto
- cadastrar a chave pública no servidor
- registrar um alias no `~/.ssh/config` da máquina local

Exemplo de configuração local:

```sshconfig
Host projeto_prod
  HostName 0.0.0.0
  User deploy
  Port 22022
  IdentityFile ~/.ssh/projeto_prod_key
```

Boas práticas:

- usar uma chave por cliente ou por ambiente
- não reaproveitar a mesma chave em todos os servidores
- nunca depender apenas de senha
- documentar porta, usuário e alias do host

## 5. Gestão de segredos

Todos os dados sensíveis devem sair do código e ir para arquivo `.env` no servidor.

Itens típicos:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- chaves de integrações externas

Boas práticas:

- manter `.env.example` atualizado sem segredos reais
- garantir que `.env` esteja no `.gitignore`
- fazer o pipeline preservar o `.env` remoto
- não sobrescrever `.env` em deploy automatizado

## 6. Docker e composição dos serviços

O padrão recomendado é rodar cada parte principal em container:

- proxy reverso
- frontend
- backend
- postgres
- redis, se aplicável

Diretrizes:

- usar `docker compose`
- nomear serviços de forma previsível
- manter volumes explícitos para dados persistentes
- expor apenas as portas estritamente necessárias
- deixar banco sem exposição pública quando possível

Exemplo de regra:

- frontend e backend podem expor porta interna para a rede Docker
- acesso externo deve passar pelo Traefik
- banco deve permanecer acessível apenas internamente

## 7. Traefik como proxy reverso

O Traefik foi configurado para centralizar:

- roteamento por domínio
- HTTPS
- renovação automática de certificado
- headers de segurança

Itens que devem existir no setup:

- `traefik.yml`
- `dynamic.yml` ou estratégia equivalente
- rede Docker compartilhada
- regras por `Host(...)`
- entrypoints `web` e `websecure`

Boas práticas aplicadas:

- publicar frontend e backend por subdomínios separados
- adicionar middleware com headers de segurança
- manter a configuração do proxy desacoplada da aplicação

## 8. Domínios e subdomínios

Padrão recomendado:

- frontend em um subdomínio principal
- API em subdomínio separado

Exemplo:

- `crm.wmsempresarial.com.br`
- `api-crm.wmsempresarial.com.br`

Checklist:

1. apontar os registros DNS para o IP do servidor
2. validar propagação DNS antes do deploy final
3. confirmar emissão de certificado HTTPS
4. testar rota do frontend e rota da API separadamente

## 9. Banco de dados e persistência

Medidas recomendadas:

- usar volume persistente para Postgres
- documentar processo de restore e backup
- validar conexão do backend com health check real
- aplicar migrations no deploy

No padrão adotado, o health check da API deve testar:

- disponibilidade da aplicação
- conectividade real com o banco

Isso evita falso positivo de ambiente "no ar" com banco indisponível.

## 10. Endpoint de health

Todo projeto novo deve expor um endpoint de health simples e confiável.

Recomendação:

- rota pública de health
- consulta real ao banco com `SELECT 1`
- resposta com status da aplicação e do banco
- retorno `503` quando a conexão falhar

Isso ajuda em:

- monitoramento
- troubleshooting
- validação pós-deploy
- integração com uptime checks

## 11. Pipeline de deploy automático

O deploy automático deve ser controlado pelo repositório.

Fluxo recomendado:

1. push para branch de deploy
2. workflow conecta no servidor
3. prepara diretório remoto
4. envia código
5. preserva `.env`
6. sobe dependências como banco e redis
7. builda imagens
8. executa migrations
9. sobe ou reinicia os containers
10. validar health endpoint

Cuidados importantes:

- o workflow não deve apagar o `.env`
- o workflow deve falhar se o `.env` remoto não existir
- o deploy deve ser idempotente
- logs do pipeline devem ser suficientes para troubleshooting

## 12. Segurança adicional recomendada

Além do básico, vale adotar:

- rotação periódica de senhas e secrets
- política de backup do banco
- monitoramento de espaço em disco
- monitoramento de uso de memória
- bloqueio de portas desnecessárias
- revisão de SPF, DKIM e DMARC para emails transacionais
- logs de envio de email com `messageId` e resposta do provedor

## 13. Itens que deram certo neste padrão

Este padrão se mostrou bom porque:

- separa infraestrutura e aplicação
- facilita repetir o processo em outros clientes
- reduz risco de vazamento de segredo
- simplifica diagnóstico de falha
- encaixa bem com GitHub Actions
- deixa o ambiente previsível para manutenção futura

## 14. Checklist reutilizável para novos projetos

Antes do deploy:

- servidor provisionado
- usuário operacional criado
- acesso SSH por chave testado
- firewall ativo
- `fail2ban` ativo
- Docker instalado
- Traefik preparado
- DNS apontado
- `.env` remoto criado
- `docker-compose.yml` validado
- migrations revisadas
- health endpoint implementado

Depois do deploy:

- frontend abre em HTTPS
- API responde em HTTPS
- health endpoint responde corretamente
- banco conectado
- envio de email testado
- logs sem erro crítico
- pipeline automático funcionando

## 15. Erros comuns a evitar

- manter segredo no código
- usar `root` para operação diária
- publicar banco diretamente na internet sem necessidade
- fazer deploy sem health check
- sobrescrever `.env` do servidor
- misturar configuração de proxy e app de forma desorganizada
- não registrar as decisões de infraestrutura

## 16. Recomendação final

Para novos projetos, a melhor base é:

- um servidor com hardening mínimo já aplicado
- um template de Traefik reutilizável
- um template de `docker compose` para frontend/backend/banco
- um workflow de deploy padrão
- um guia como este acompanhado de `.env.example`

Se esse padrão for seguido, o tempo de deploy diminui bastante e o risco operacional também.
