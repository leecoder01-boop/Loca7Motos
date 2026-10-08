# Backup e recuperação — Loca7Moto

## Situação verificada em 08/10/2026

O projeto Supabase `rastro-motos-admin` está no plano **Free**. O painel informa que esse plano não inclui backups automáticos; o add-on de PITR também não está disponível nesse plano. Portanto, hoje não há uma restauração gerenciada confirmada para este projeto. O código e os logs de auditoria não substituem uma cópia independente.

Antes de guardar dados reais ou abrir o sistema para operação, escolha uma destas proteções:

1. **Recomendado para produção:** migrar a organização/projeto para um plano pago que inclua backups diários e verificar em `Database → Backups` que os backups aparecem como concluídos. Para recuperação mais precisa, avaliar PITR, que é add-on pago e exige configuração compatível do compute.
2. **Cópia independente:** agendar exportação lógica criptografada para armazenamento privado fora do projeto (outra conta/região), com retenção definida e alerta de falha. Não salvar dumps no repositório, pasta pública, e-mail ou computador compartilhado.

Backups gerenciados do Supabase cobrem o banco, não os arquivos dos buckets do Storage. Se o projeto usar Storage, exporte os objetos separadamente e teste sua restauração. O Supabase Auth (incluindo usuários) faz parte dos dados de banco no backup, mas credenciais/configurações de serviços externos precisam ser inventariadas e reconfiguradas à parte.

## Cópia lógica manual

Use a versão atual do Supabase CLI e uma conexão de banco obtida no painel pelo proprietário. Não cole a URI no chat, no código, no histórico do PowerShell ou em `.env` versionado. Defina `SUPABASE_DB_URL` apenas na sessão segura do terminal e rode os comandos a partir de uma pasta de backup privada fora do projeto:

```powershell
supabase db dump --db-url $env:SUPABASE_DB_URL -f roles.sql --role-only
supabase db dump --db-url $env:SUPABASE_DB_URL -f schema.sql
supabase db dump --db-url $env:SUPABASE_DB_URL -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Esses arquivos contêm dados pessoais e financeiros: criptografe-os, limite o acesso, registre a data/resultado do backup e defina uma política de retenção e exclusão segura. A cópia só conta como proteção depois de uma restauração de ensaio bem-sucedida em **outro projeto**, nunca diretamente sobre produção.

## Como recuperar

### Exclusão/alteração acidental de cliente ou moto

O painel agora arquiva esses registros em vez de apagá-los. Para restaurar, use o botão de restaurar no cadastro arquivado. A restauração é negada enquanto houver conflito operacional; finalize/cancele contratos em aberto antes.

### Contrato, pagamento, perfil ou log

O banco rejeita exclusão permanente de contratos, pagamentos, perfis e logs. Use os estados operacionais próprios (finalizar/cancelar contrato, cancelar pagamento, desativar usuário) em vez de apagar histórico. Se houver corrupção lógica, restaure uma cópia em projeto separado e compare os registros antes de qualquer correção em produção.

### Restauração do Supabase

1. O ADMIN/OWNER confirma que há backup concluído e escolhe um ponto **anterior** ao incidente.
2. Sempre que possível, restaure primeiro em um projeto separado e valide clientes, motos, contratos, pagamentos, usuários, policies e logs.
3. Uma restauração no projeto de produção pode deixar o app indisponível e descartar todas as gravações posteriores ao ponto escolhido. Avise os usuários, interrompa gravações, confirme a janela de perda e obtenha aprovação do proprietário antes de confirmar.
4. Após a restauração, valide login ADMIN/ATENDENTE, dashboard, integridade de contratos/pagamentos, RLS, funções e integrações. Reconfigure segredos e serviços externos conforme o inventário seguro; nunca copie segredos para logs.
5. Registre o incidente e faça uma nova cópia independente assim que o serviço estiver estável.

O procedimento oficial de restauração e as limitações atuais estão na [documentação de backups do Supabase](https://supabase.com/docs/guides/platform/backups). Não execute uma restauração sem identificar o ponto, o impacto de perda de dados e a autorização do proprietário.
