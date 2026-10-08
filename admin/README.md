# Rastro Motos — painel administrativo

Next.js, TypeScript, Tailwind CSS, shadcn/ui e Supabase Auth/PostgreSQL. A identidade e o layout do painel existente foram preservados.

Consulte [SETUP-SUPABASE.md](./SETUP-SUPABASE.md) para configurar o ambiente, aplicar a migração, autorizar o primeiro administrador e cadastrar dados.

Na pasta `admin`: `npm ci`, configure `.env.local`, execute a migração e use `npm run dev`. Acesse `http://localhost:3001/admin/`. Produção: `npm run build` e `npm start`.

Verificações: `npm test`, `npm run typecheck`, `npm run build`.

A aplicação agora exige servidor Next.js. O build não escreve em `../dist` nem modifica a LP. A cópia estática antiga do painel está arquivada fora da pasta publicada. Sem variáveis configuradas, o painel mostra a tela de configuração/acesso e não utiliza mocks.

Clientes, motos, contratos, documentos, pagamentos e alertas utilizam dados reais do Supabase. Configurações da empresa ficam em `/admin/configuracoes/` (migração `202610050008_empresa.sql`). Somente administradores autorizados podem ler e alterar esses dados.

Cobranças pelo WhatsApp são manuais: selecione um pagamento pendente/atrasado, revise a mensagem e abra a conversa por `wa.me`. O telefone prefere o WhatsApp cadastrado e usa o telefone como alternativa, com DDD brasileiro e prefixo 55. Nos contratos/alertas com vários pagamentos, selecione um lançamento; cada cobrança usa seu valor integral e seu vencimento, sem inventar dívida a partir do preço do contrato. Cadastre a chave Pix real e o recebedor nas configurações antes de cobrar. Abrir a conversa não envia a mensagem, não quita pagamentos e não resolve alertas.

O painel tem fundo azul e entradas suaves com GSAP (240 ms), desativadas para movimento reduzido e navegação por teclado. Não há envio por API, integração automática de Pix ou IA. A landing page em `../dist` permanece independente.

Pix estático: em Pagamentos, use **Gerar Pix** para ver QR Code/copia e cola de um lançamento pendente ou atrasado. Nome do recebedor e cidade também precisam estar configurados. O payload e CRC são implementados no projeto; somente o QR utiliza `qrcode`, carregado sob demanda. `jsqr` decodifica a imagem em testes e não entra na aplicação. O botão de WhatsApp nessa tela inclui o payload exato na mensagem. Nenhum status muda automaticamente; códigos já compartilhados não expiram nem são revogados pelo painel. Não é necessário executar nova migração.
