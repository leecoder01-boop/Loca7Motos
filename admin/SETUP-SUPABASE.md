# Ativação do painel Rastro Motos

## Identidade Loca7Moto e aba Vendas

O painel usa agora a identidade Loca7Moto. A landing page e as cópias imutáveis de documentos já emitidos não são alteradas pelo redesign. Dados jurídicos da locadora continuam sendo preenchidos no modelo de contrato; o nome visual do painel não substitui razão social/CNPJ.

Direção visual: sidebar clara para navegação, superfícies brancas para formulários/tabelas e azul como destaque; linhas de rota e o numeral 7 conectam a assinatura ao nome e à locação de motos. Vendas usa palco azul e gráfico azul-marinho inspirados na referência fornecida, com valores reais em vez de conteúdo de demonstração. O gráfico se adapta à largura móvel e possui tabela textual dos dados.

`/admin/vendas/` é uma visão autenticada dos pagamentos manuais existentes, não um módulo de venda de motocicletas. Mostra recebido hoje/ontem, intervalos de 7 ou 30 dias comparados com intervalos anteriores de mesma duração, recebido no mês, valor pendente, média por lançamento e distribuição por método. Datas seguem o dia operacional de São Paulo. Pagos no futuro e cancelados não entram na receita; pendentes não são vendas realizadas. Comparações percentuais sem base anterior não são inventadas. CSV exporta somente os totais diários apresentados, sem CPF, contato ou nome do cliente. A página não cria cobranças e não exige nova migração nem variável de ambiente.

O layout existente foi mantido. Apenas o app em `admin` passou de exportação estática para Next.js com servidor, sessão e leitura autenticada do Supabase. Os arquivos da landing page não são modificados pelo build.

## 1. Projeto e ambiente

Crie ou escolha seu projeto no Supabase. Em **Connect** obtenha a Project URL e a chave **publishable**. Crie `admin/.env.local` usando `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Projetos antigos também podem usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` no lugar da publishable key. Não use `service_role`, `sb_secret_...`, senha do banco ou token de gerenciamento nessas variáveis. A aplicação não precisa dessas credenciais. Não envie `.env.local` em ZIP ou Git.

## 2. Criar o banco

Execute `supabase/migrations/202610040001_admin.sql` no SQL Editor do projeto (ou via seu fluxo de migrações Supabase). A migração inicial é transacional e deve ser executada uma vez em um banco sem estas tabelas. Se já houver tabelas com esses nomes, adapte a migração antes de executá-la; ela não apaga nem sobrescreve tabelas existentes.

São criadas `clientes`, `motos`, `contratos`, `pagamentos` e `admin_users`, além de índices, regras de integridade, RLS, gatilhos e funções de consulta. A tabela extra `admin_users` controla quem pode acessar a operação. Um usuário autenticado sem associação nesta tabela não acessa os dados.

Depois execute `supabase/migrations/202610040002_clientes.sql` uma única vez. Ela amplia `clientes` com contatos, endereço estruturado, informações da CNH, nascimento, observações, status e controle de versão. Não apaga registros nem altera acesso/RLS. A função `painel_dados()` inclui automaticamente as novas colunas.

Execute também `supabase/migrations/202610040003_motos.sql` uma única vez, após as anteriores. Amplia a tabela `motos` com `cor`, `tipo_valor` (`diaria`/`mensalidade`), `observacoes` e `updated_at`; adiciona o status `indisponivel` e preserva os registros e as políticas RLS existentes.

Execute também `supabase/migrations/202610040004_contratos.sql` uma única vez. Adiciona preço semanal em motos, periodicidade, caução, observações e versão em contratos; permite cancelamento e calcula vencimentos pela janela de três dias. As regras de disponibilidade e o índice único são atualizados na mesma transação, sem excluir registros ou ampliar permissões.

Execute `supabase/migrations/202610040006_pagamentos.sql` após a migração documental 005, uma única vez. Amplia pagamentos com forma de pagamento, observações e controle de versão; adiciona cancelamento e mantém as políticas RLS existentes. Não há novas variáveis de ambiente.

## 3. Primeiro administrador

O módulo documental usa também `supabase/migrations/202610040005_documentos.sql`, executada uma única vez após as anteriores. Cria `modelos_contrato` e `documentos_contrato`, ambos restritos a administradores. As versões emitidas não permitem edição nem exclusão; gere uma nova versão para correções ou vistoria de devolução. Nenhuma regra de locação ou tabela de cliente/moto é alterada.

Em Contratos, use **Editar modelo de contrato** para cadastrar os dados reais da locadora e os textos revisáveis. Em cada locação, **Gerar contrato** abre a preparação de dados, cláusulas, forma de pagamento, vistorias e aceite manual. Gerar salva uma minuta e copia no banco os dados atuais de cliente, moto e locação; o valor e a caução continuam vindo da locação. Chassi e Renavam complementam somente o documento, sem alterar o cadastro da moto. O modelo é usado para iniciar documentos novos; alterações não substituem documentos existentes. Histórico seleciona versões preservadas; impressão abre uma página autenticada sem o painel e permite salvar PDF pela janela de impressão do navegador.

Os textos começam vazios, com orientação de preenchimento e marcação de minuta. Campos incompletos são identificados no documento, não são inventados. Revisão jurídica externa é necessária antes do uso comercial. O aceite é apenas registro administrativo de evidência externa, com nome, data, meio e referência; não é assinatura eletrônica nem verificação de identidade. Aceites antigos não são herdados por novas versões. Não há upload de fotos ou assinatura digital nesta etapa; as vistorias aceitam referências a fotos/laudos externos. A emissão não muda o status da locação, não cria cobranças nem contrata seguro. Os PDFs contêm dados pessoais: guarde-os de forma segura.

Em **Authentication → Users**, crie o usuário administrativo com e-mail e senha. Deixe o e-mail confirmado conforme a configuração do projeto. Depois copie o UUID do usuário e execute no SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('UUID-DO-USUARIO-CRIADO')
on conflict (user_id) do nothing;
```

Não há cadastro público nem promoção administrativa pelo navegador. Desative a opção de permitir novos cadastros em Auth se o projeto for exclusivo para a equipe. Para retirar o acesso de alguém, remova a associação em `admin_users`; a próxima requisição verifica novamente a autorização.

## 4. Executar

Na pasta `admin`:

```powershell
npm ci
npm run dev
```

Abra `http://localhost:3001/admin/`. O painel redireciona usuários não autenticados para `/admin/login/`. Entre com o usuário autorizado.

Produção: `npm run build` seguido de `npm start`, com as mesmas variáveis no ambiente de build/execução. Mantenha a LP hospedada como já está. Para usar ambos no mesmo domínio, configure seu host/reverse proxy para encaminhar `/admin` e `/admin/*` ao servidor Next.js, deixando o restante no host estático da LP. Como alternativa, hospede o painel em outro domínio mantendo seu caminho `/admin`.

O painel autenticado não pode mais ser servido por `serve dist`: esse comando atende apenas à LP. A antiga cópia estática do painel foi preservada em `admin/legacy-static-preview` como backup, fora do diretório publicado; não a publique como o sistema funcional. Em produção use HTTPS: as sessões usam cookies HttpOnly, SameSite=Lax, Secure em produção e limitados a `/admin`.

## 5. Cadastrar dados nesta etapa

Clientes são cadastrados em `/admin/clientes/`: lista, busca por nome/CPF/telefone, filtro ativo/bloqueado, detalhes, cadastro, edição e exclusão confirmada. Nome, CPF, telefone, endereço e CNH são obrigatórios; os demais campos são opcionais. CPF é validado por dígitos verificadores no servidor; isso não comprova a identidade. A CNH aceita onze dígitos e sua validade pode estar vencida, para permitir o registro correto. Bloqueado é um status cadastral, não bloqueia o login administrativo e não implementa regras de contratação nesta etapa.

Todas as mutações verificam novamente a sessão e a permissão de administrador. CPF duplicado e exclusão de cliente com contratos geram mensagens específicas. O timestamp `updated_at` impede sobrescrever/excluir uma versão alterada por outra sessão. Os dados digitados permanecem no formulário em caso de erro. A lista é atualizada após cada gravação.

Motos são gerenciadas em `/admin/motos/`: cadastro, edição, detalhes, exclusão confirmada, busca por modelo/placa, filtro de status e ordenação. Marca, modelo, ano, placa, quilometragem, preço, período do preço e status são obrigatórios; cor e observações são opcionais. Placas antigas e Mercosul são normalizadas para maiúsculas sem hífen, com unicidade no banco. Quilometragem é um inteiro não negativo. O valor aceita `85,90`, `85.90` e `1.250,00`, com até dois centavos decimais, sem conversão de vazio para zero.

Os quatro status cadastrais são `disponivel`, `alugada`, `manutencao` e `indisponivel`. Nesta etapa é permitido marcar alugada manualmente para uma frota já em operação, sem criar contrato. Se existir contrato aberto, a liberação manual é impedida; motos vinculadas a qualquer contrato não podem ser excluídas. Indisponível não entra na contagem de disponíveis/alugadas. O grupo cinza da visão de frota mantém o layout e passa a se chamar “Manutenção / indisponíveis”. O preço em `valor_locacao` é referência da diária, semana ou mensalidade; novas motos sugerem semanal. Registros antigos mantêm o período já cadastrado. Não gera cobranças nem contratos.

As ações de motos também exigem administrador, usam RLS e conferem `updated_at` para evitar sobrescrever/excluir uma versão modificada por outra sessão. Contratos são gerenciados em `/admin/contratos/`: cadastro, busca, filtro, detalhes, edição, finalização e cancelamento confirmados. Selecionar a moto sugere seu preço e periodicidade (diária/semanal/mensal), que podem ser ajustados conforme o acordo. O valor é o total acordado da locação, sem multiplicação automática por períodos; caução é registrada separadamente e não gera pagamento. Somente motos disponíveis podem iniciar uma locação. Criar/alterar o vínculo e atualizar a frota ocorre atomicamente no banco. O índice único impede duas locações abertas por moto; `updated_at` impede alterações com versão antiga. Finalizar/cancelar libera a moto e mantém o histórico somente leitura, sem reabertura. O status cadastral bloqueado do cliente ainda não implementa regras adicionais de contratação. Pagamentos são gerenciados em `/admin/pagamentos/`: registro manual, edição, detalhes, filtros e alteração de status. Cliente e moto são derivados do contrato, sem cadastros duplicados. Marcar como pago exige data do recebimento (não futura) e forma de pagamento. Cada lançamento é quitado integralmente; vários lançamentos podem ser vinculados ao contrato, sem pagamento parcial nesta etapa. Cancelar preserva o histórico, exclui dos totais e alertas e não faz estorno. Reverter para pendente/atrasado limpa a data de recebimento. Não há exclusão de pagamentos pelo painel. Envio duplicado usa UUID estável e edição exige `updated_at` atual. Não há seed de dados fictícios no banco. Não registre documentos reais como dados de teste.

- CPF e CNH: onze dígitos, sem pontuação. A validação estrutural do banco não verifica autenticidade nem os dígitos verificadores dos documentos.
- Placa: maiúsculas sem hífen, no formato brasileiro de sete caracteres.
- `valor_locacao`: preço de referência da moto. `contratos.valor`: valor total contratado. `pagamentos.valor`: parcela/recebimento; pode haver vários pagamentos por contrato.
- Moto: `disponivel`, `alugada`, `manutencao`, `indisponivel`. Uma locação aberta existente passa a moto para alugada; a finalização libera a moto. Manutenção ou indisponibilidade não podem começar com contrato aberto.
- Contrato: `ativo`, `vencendo` (1–3 dias), `vencendo_hoje`, `atrasado`, `finalizado`, `cancelado`. Os quatro primeiros são calculados na leitura usando a data de vencimento; finalize/cancele pelo painel.
- Pagamento: `pendente`, `pago`, `atrasado`, `cancelado`. Para registrar recebimento, preencha `data_pagamento` e defina `status = 'pago'` na mesma alteração. Não é processada nenhuma cobrança.
- Datas de contratos/pagamentos são dias civis; `created_at` é um instante com fuso. O dia operacional é calculado no banco em `America/Sao_Paulo`.

## 6. Indicadores e alertas

### Central de alertas

A migração `202610050007_alertas.sql` adiciona `alertas_resolucoes`, protegida por RLS, e incorpora os tratamentos do dia à consulta transacional `painel_dados()`. Somente administradores leem e inserem; o usuário registrado deve ser o próprio administrador autenticado. Os registros não podem ser editados ou excluídos pela aplicação. Não altera clientes, motos, contratos ou pagamentos existentes.

`/admin/alertas` calcula uma ocorrência por contrato, pagamento, cliente ou moto: contratos em aberto até três dias; pagamentos vencendo hoje ou atrasados (inclusive atraso manual); CNH em até 30 dias ou vencida; motos em manutenção. Alertas do cadastro de CNH e manutenção não são multiplicados pela quantidade de contratos, e não recebem vínculos ou datas fictícios. O atraso tem prioridade urgente, proximidade/hoje tem atenção e manutenção é informativa. Os filtros usam origem e urgência; detalhes abrem o registro correspondente. Registrar pagamento utiliza o mesmo formulário e validações do módulo financeiro, sem criar um segundo lançamento para o alerta de um pagamento já existente.

Corrigir a origem remove automaticamente a ocorrência. A resolução manual registra tratamento com justificativa por identificador, versão da origem e dia operacional de São Paulo. Ela não representa quitação, devolução, renovação de CNH nem conclusão de manutenção. Se a situação continuar, o alerta reaparece amanhã ou quando sua origem mudar; a visão “Tratados hoje” permite consultar o que foi reconhecido neste dia. A ação confere os dados mais recentes antes de salvar e rejeita versões desatualizadas. Dashboard e navegação contam as mesmas ocorrências ativas. Durante atualização do banco, a ausência da migração desabilita apenas a resolução manual, com mensagem explícita; nunca simula persistência local.

Os dados vêm de uma única consulta transacional `painel_dados()`, sujeita a RLS. Todos os administradores autorizados compartilham a mesma operação; este não é um sistema multiempresa.

- Disponíveis/alugadas: contagem por status da frota.
- Vencendo hoje: contratos em aberto (não finalizados nem cancelados) com vencimento no dia operacional.
- Contratos atrasados: em aberto com vencimento anterior ao dia operacional.
- Pendentes: soma dos pagamentos pendentes e atrasados; pagos e cancelados não entram.
- Recebido no mês: soma dos pagamentos pagos cuja data de recebimento está no mês e ano do dia operacional, até hoje. As somas usam centavos inteiros.
- Pagamentos atrasados: quantidade com atraso automático pela data ou registrado manualmente.
- Pagamentos vencendo hoje: pendentes/atrasados com vencimento no dia operacional.
- Atenção aos vencimentos: a mesma fila ativa da central, com contratos até três dias, pagamentos de hoje/atrasados, CNH até 30 dias/vencida e manutenção. Um contrato pode ter uma ocorrência de devolução e outra de pagamento, que são situações diferentes, identificadas pela origem. O resumo mostra total ativo, urgentes e vencimentos de hoje.

A leitura calcula os status temporais a cada consulta: contratos finalizados/cancelados e pagamentos pagos/cancelados nunca se tornam atrasados. Não é necessário um cron para a passagem do tempo. O campo persistido pode continuar `ativo`/`pendente`; a situação efetiva exibida é calculada pela função e pelo domínio do painel.

Cada navegação lê os dados novamente. Enquanto a aba está visível, a atualização ocorre a cada minuto; ao retornar à aba, os dados são atualizados. Não é uma assinatura Realtime instantânea. Base vazia mostra valores zero e estados vazios; erros nunca substituem dados reais por mocks. O snapshot completo atende a operação inicial; para grandes volumes, evoluir para paginação e agregações no banco.

## 7. Verificação e limites

### Pix estático por pagamento

Em `/admin/pagamentos/`, **Gerar Pix** aparece somente para pendentes/atrasados. Usa chave/tipo, recebedor e cidade configurados; não cria lançamento nem modifica o status. Nenhuma migração ou variável de ambiente adicional é necessária. O vencimento exibido é informativo: Pix estático não impõe expiração, juros ou bloqueio por vencimento.

O payload é montado em `src/lib/pix.ts` conforme o [Manual BCB 2.10.0](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), com TLV, valor integral em reais com duas casas, moeda 986, país BR, chave, nome/cidade normalizados e CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF, incluindo `6304`). A referência de 25 caracteres alfanuméricos representa o UUID completo do pagamento em base 36. Nome/cidade são limitados a 25/15 caracteres; a chave não é truncada e tem máximo de 77. CPF/CNPJ são usados sem pontuação; CNPJ admite o formato alfanumérico indicado no manual atual. A validação é estrutural, não consulta o DICT nem comprova titularidade.

`qrcode` é a única dependência de execução adicionada e só carrega ao abrir o Pix. A codificação é local, com margem branca de quatro módulos e correção M, sem serviço externo de imagens nem transmissão da chave. `jsqr` é apenas dependência de teste, para leitura independente do QR gerado. O teste compara também o CRC com o vetor oficial BCB.

O botão de copiar usa a área de transferência e oferece seleção manual se ela for indisponível. A cobrança de WhatsApp dentro da tela Pix prepara mensagem com cliente, moto, placa, valor, vencimento e o mesmo payload; exige revisão e abertura manual. Não envia por API. Geração, cópia e abertura da conversa não quitam o pagamento. Códigos já enviados não podem ser revogados por este sistema: após mudanças no valor ou chave, compartilhe o código atualizado e confira manualmente os recebimentos. Uma baixa no painel não impede um código antigo de ser pago novamente.

### Cobranças manuais e configurações da empresa

Aplique `supabase/migrations/202610050008_empresa.sql` após 007. Cria uma única configuração da locadora, restrita a administradores por RLS, e a inclui em `painel_dados()`. Não exclui registros e não modifica documentos antigos. Não exige nova variável de ambiente.

Em `/admin/configuracoes/`, preencha nome, telefone, cidade, tipo/chave Pix e nome do recebedor. A chave começa vazia. A validação é de formato, não verifica propriedade ou existência da conta Pix: confira diretamente com sua instituição. Dados jurídicos nos modelos de contrato continuam independentes.

“Cobrar no WhatsApp” aparece em pagamentos pendentes/atrasados, contratos vencendo/atrasados e alertas financeiros da central/dashboard. Prefere o campo WhatsApp do cliente e usa o telefone se esse campo estiver vazio. Números brasileiros com DDD são normalizados com 55. Números inválidos ou Pix não configurado impedem abertura e oferecem o caminho do cadastro necessário.

A revisão apresenta um pagamento real integral, com valor e vencimento próprios; se houver vários no contrato, escolha um. Não usa o preço da locação como dívida fictícia. O link `https://wa.me/NUMERO?text=MENSAGEM` usa `encodeURIComponent`, abre em outra aba e não envia por API. Você precisa enviar no WhatsApp. Não marca como pago nem resolve alertas; registre manualmente o recebimento após conferência. Não abrir links reais em testes sem autorização para compartilhar telefone e dados financeiros.

Fundo azul no painel, superfícies claras para leitura e GSAP em entradas de cabeçalhos/resumos (240 ms, intervalo 30 ms). Não anima filtros ou atualizações periódicas, respeita movimento reduzido e navegação por teclado. A LP e a impressão documental não recebem esses estilos.

### Interface Loca7Moto — caderno de rota

Clientes, motos, contratos, pagamentos e alertas compartilham cabeçalhos por capítulo, indicadores consolidados e tabelas claras. A frota inclui uma distribuição dos quatro status baseada no snapshot real. Documentos têm navegação por âncoras, sem alterar as versões preservadas nem a impressão. Login, formulários, carregamento e erros seguem a mesma identidade azul. Os componentes `PageHeading` e `OperationBrief` concentram a apresentação; ações, autenticação, validações e tabelas do Supabase permanecem independentes do redesign. A landing page não participa destas alterações.

`npm test` executa os testes de indicadores e a migração em PostgreSQL local embarcado (PGlite), verificando RLS, autorização, integridade e gatilhos. `npm run typecheck` e `npm run build` validam o código Next.js.

Esses testes não substituem verificar login, renovação de sessão e consultas no seu projeto Supabase após configurar as variáveis e executar a migração. O código não cria um projeto remoto automaticamente.

Pix continua sendo somente uma forma de pagamento informada manualmente; registrar pagamento não movimenta dinheiro. A API do WhatsApp ainda não está conectada.

### Atendimento com IA (simulador interno)

Aplique `supabase/migrations/202610080009_atendimento_ia.sql` após a migração 008. Ela cria configurações de ativação e tabelas de conversas/mensagens, com RLS administrativa; canais `simulador` e `whatsapp` ficam separados. Ela não altera clientes, motos, contratos, pagamentos nem a landing page.

Configure `OPENAI_API_KEY` no `admin/.env.local` e, na hospedagem, nos segredos do servidor. Não use `NEXT_PUBLIC_` no nome. `OPENAI_MODEL` é opcional e o padrão configurado no projeto é `gpt-6-luna`. Depois reinicie o servidor local e abra `/admin/atendimento/` para ativar a IA. Sem chave, a opção permanece desativada.

O simulador exige que o administrador selecione um cliente. A IA consulta os dados atuais apenas desse cliente por uma função restrita, e o histórico fica salvo no Supabase. Assumir conversa pausa respostas automáticas nela; devolver à IA retoma o atendimento. As mensagens do simulador não são enviadas pelo WhatsApp.

Este recurso usa a OpenAI Responses API e encaminha para ela as perguntas e os fatos consultados para responder. A chave permanece no servidor. A ativação automática do WhatsApp depende de uma etapa separada: configurar a plataforma Meta, o número e os modelos aprovados.

Referências: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [chaves de API](https://supabase.com/docs/guides/api/api-keys), [exclusão com filtros](https://supabase.com/docs/reference/javascript/delete).
