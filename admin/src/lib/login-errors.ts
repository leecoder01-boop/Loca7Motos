type AuthFailure = {code?:string;status?:number;name?:string};

// Never display provider internals, submitted credentials or account existence.
export function loginErrorMessage(error:AuthFailure):string {
  if(error.status===429 || error.code==='over_request_rate_limit') return 'Muitas tentativas de entrada. Aguarde alguns minutos antes de tentar novamente.';
  if(error.code==='email_not_confirmed') return 'O e-mail ainda não foi confirmado no Supabase. Confirme pelo link recebido ou peça ao administrador para conferir o cadastro.';
  if(error.name==='AuthRetryableFetchError' || (error.status??0)>=500 || error.code==='request_timeout') return 'O serviço de autenticação está indisponível ou a conexão falhou. Tente novamente em instantes.';
  if(error.code==='invalid_credentials') return 'E-mail ou senha não foram aceitos. Confira o preenchimento, as maiúsculas e se esta é a conta criada em Authentication do Supabase — não a senha do site do Supabase.';
  return 'Não foi possível autenticar sua conta. Peça ao administrador para verificar o cadastro e a configuração de login no Supabase.';
}
