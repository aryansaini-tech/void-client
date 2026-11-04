import { serverEnv,serviceState,validateProduction } from '../backend/src/env';
import { site } from '../packages/shared/src/config';

try {
  validateProduction();
  const state=serviceState();const env=serverEnv();
  console.log('Void deployment configuration (secret values are never printed)');
  console.table({website:site.urls.website,account:site.urls.account,store:site.urls.store});
  console.table({database:state.database?'configured':'missing',authentication:state.auth?'configured':'missing database or secret',email:state.email?'configured — backend worker required':'missing email configuration',discord:state.discord?'configured':'optional — not configured',microsoft:state.microsoft?'configured':'optional — needs account, email, and Microsoft credentials',checkout:state.checkout?'enabled':'disabled or incomplete',cookieScope:env.AUTH_COOKIE_DOMAIN?'shared across configured domain':'host-only (localhost shares across ports)'});
  if(env.NODE_ENV==='production'&&(!state.auth||!state.email)){console.error('Account launch requires database, a random auth secret, SMTP configuration, and a running mail worker.');process.exitCode=1;}
}catch(error){console.error(error instanceof Error?error.message:'Invalid configuration.');process.exitCode=1;}
