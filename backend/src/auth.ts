import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { site } from '@void/shared/config';
import { getDatabase } from './database';
import { serverEnv, serviceState, validateProduction, isLocalPreview } from './env';
import { queueEmail } from './mail';

function createAuth() {
  validateProduction();
  const env = serverEnv(); const db = getDatabase();
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('AUTH_NOT_CONFIGURED');
  return betterAuth({
    appName:'Void Client',baseURL:new URL(env.BETTER_AUTH_URL ?? site.urls.account).origin,basePath:'/api/auth',secret:env.BETTER_AUTH_SECRET,
    database:prismaAdapter(db,{provider:'postgresql'}),
    trustedOrigins:[...new Set(Object.values(site.urls).map(url => new URL(url).origin))],
    onAPIError:{errorURL:`${site.urls.account}/login`},
    emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:true,revokeSessionsOnPasswordReset:true,
      sendResetPassword:async ({user,url}) => queueEmail({to:user.email,subject:'Reset your Void password',text:`A password reset was requested for your Void account.\n\n${url}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`}),
      resetPasswordTokenExpiresIn:3600,
    },
    emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:false,expiresIn:3600,
      sendVerificationEmail:async ({user,url}) => queueEmail({to:user.email,subject:'Verify your Void email',text:`Welcome to Void Client. Verify your email address to finish creating your account.\n\n${url}\n\nThis link expires in one hour. If you did not create an account, ignore this email.`}),
    },
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*10,cookieCache:{enabled:false}},
    // Microsoft may omit email_verified. Trust it only for an explicit,
    // session-bound connection; matching emails and local verification remain
    // required. Automatic same-email account merging stays disabled.
    account:{encryptOAuthTokens:true,accountLinking:{enabled:true,disableImplicitLinking:true,trustedProviders:['microsoft'],allowDifferentEmails:false}},
    socialProviders:{
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? {discord:{clientId:env.DISCORD_CLIENT_ID,clientSecret:env.DISCORD_CLIENT_SECRET,disableSignUp:true}} : {}),
      ...(serviceState().microsoft && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET ? {microsoft:{
        clientId:env.MICROSOFT_CLIENT_ID,clientSecret:env.MICROSOFT_CLIENT_SECRET,tenantId:env.MICROSOFT_TENANT_ID,
        disableProfilePhoto:true,disableDefaultScope:true,scope:['openid','profile','email'],
        disableIdTokenSignIn:true,prompt:'select_account' as const,
        // Keep the portal's verified-email boundary. Microsoft does not always
        // attest email ownership; unverified new users receive Void verification.
        requireEmailVerification:true,
      }} : {}),
    },
    rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:3},'/sign-in/social':{window:60,max:10},'/link-social':{window:60,max:10},'/unlink-account':{window:600,max:8},'/request-password-reset':{window:600,max:3},'/send-verification-email':{window:600,max:3},'/change-password':{window:600,max:5}}},
    advanced:{disableOriginCheck:false,disableCSRFCheck:false,useSecureCookies:env.NODE_ENV === 'production' && !isLocalPreview(),cookiePrefix:'void',defaultCookieAttributes:{httpOnly:true,sameSite:'lax'},ipAddress:{ipAddressHeaders:[env.AUTH_IP_HEADER]},
      ...(env.AUTH_COOKIE_DOMAIN ? {crossSubDomainCookies:{enabled:true,domain:env.AUTH_COOKIE_DOMAIN}} : {}),
    },
    databaseHooks:{
      user:{create:{after:async user => { await db.accountProfile.upsert({where:{userId:user.id},create:{userId:user.id},update:{}}); }}},
      session:{create:{after:async session => { await db.auditEvent.create({data:{userId:session.userId,action:'Signed in'}}); }}},
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { if (!serviceState().auth) return null; instance ??= createAuth(); return instance; }
export async function getSession(headers: Headers) { const auth = getAuth(); return auth ? auth.api.getSession({headers}) : null; }
export type Auth = ReturnType<typeof createAuth>;
