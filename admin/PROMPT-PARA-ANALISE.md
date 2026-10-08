# Prompt para enviar junto com o ZIP

Analise o projeto anexado, principalmente o painel administrativo da locadora Rastro Motos, cujo código está na pasta `admin`.

A landing page já está pronta e deve ser preservada. NÃO altere a LP nem proponha sua migração. Ela está em `dist/index.html`, `dist/styles.css` e `dist/app.js`; use esses arquivos apenas como referência visual.

O painel é uma aplicação separada em Next.js, TypeScript, Tailwind CSS e shadcn/ui, com basePath `/admin`. Possui autenticação Supabase, dashboard, clientes, motos, contratos/locações, pagamentos e alertas ligados ao banco. Consulte `SETUP-SUPABASE.md` para ativar a conexão e aplicar a migração.

Avalie organização do código, consistência dos dados e indicadores, navegação, responsividade, acessibilidade e clareza visual. Aponte problemas concretos e sugira melhorias por prioridade, citando os arquivos relevantes.

Nesta etapa quero somente a análise, sem implementar alterações. Revise também autenticação, RLS e integridade do banco. NÃO implemente integrações com WhatsApp, Pix e IA.

Para executar: configure o Supabase seguindo `admin/SETUP-SUPABASE.md`; na pasta `admin`, use `npm ci` e `npm run dev`; abra `http://localhost:3001/admin/`. O painel requer servidor Next.js; a LP continua estática.
