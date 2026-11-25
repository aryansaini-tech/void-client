import {randomUUID} from 'node:crypto';

const one=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0] ?? null;
const rows=async(db,sql,args=[]) => (await db.query(sql,args)).rows;
const itemQuery=`SELECT e.*,p.name,COALESCE(c.kind,'store_item') AS kind,c.slot,
 EXISTS(SELECT 1 FROM "VoidEquipped" q WHERE q.user_id=e.user_id AND q.item_id=e.item_id) AS equipped
 FROM "VoidEntitlement" e JOIN "Product" p ON p.id=e.item_id LEFT JOIN "VoidCosmetic" c ON c.item_id=p.id`;
const avatar=p=>p.avatar_hash?`https://cdn.discordapp.com/avatars/${p.discord_id}/${p.avatar_hash}.png?size=128`:null;
export function createAccountStore(db,{now=Date.now}={}) {
  const audit=async(tx,actor,player,item,action,reason='')=>tx.query('INSERT INTO "VoidAudit"(actor_id,player_id,item_id,action,reason) VALUES($1,$2,$3,$4,$5)',[actor,player,item,action,reason]);
  const profile=async(userId)=>{
    const p=await one(db,'SELECT * FROM "VoidDiscordIdentity" WHERE user_id=$1',[userId]);
    return p?{id:p.user_id,discord_id:p.discord_id,display_name:p.display_name,displayName:p.display_name,avatar_hash:p.avatar_hash,avatar_url:avatar(p),avatarUrl:avatar(p),created_at:p.created_at,last_login:p.last_login,provider:'discord',identities:[{provider:'discord',displayName:p.display_name,avatarUrl:avatar(p)}]}:null;
  };
  const entitlements=userId=>rows(db,`${itemQuery} WHERE e.user_id=$1 ORDER BY e.granted_at DESC,e.id`,[userId]);
  const equipped=userId=>rows(db,'SELECT q.slot,q.item_id FROM "VoidEquipped" q WHERE q.user_id=$1 AND EXISTS(SELECT 1 FROM "VoidEntitlement" e WHERE e.user_id=q.user_id AND e.item_id=q.item_id AND e.status=\'active\')',[userId]);
  const catalogue=()=>rows(db,`SELECT p.id,p.name,p.slug,p.price,p.currency,p.published,p.available,COALESCE(c.kind,'store_item') AS kind,c.slot FROM "Product" p LEFT JOIN "VoidCosmetic" c ON c.item_id=p.id ORDER BY p.name,p.id`);
  return {
    db,profile,entitlements,equipped,catalogue,audit,
    async saveDiscord({discord_id,display_name,avatar_hash},isValid=async()=>true,sessionHash=null) {
      return db.transaction(async tx=>{
        // Serialize mapping: an existing Discord Account keeps its original purchase-bearing User.
        await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[discord_id]);
        if(!await isValid())throw new Error('Sign-in ended.');
        let mapped=await one(tx,'SELECT user_id FROM "VoidDiscordIdentity" WHERE discord_id=$1',[discord_id]);
        if(!mapped){const legacy=await one(tx,'SELECT "userId" FROM "Account" WHERE "providerId"=$1 AND "accountId"=$2',['discord',discord_id]);mapped=legacy?{user_id:legacy.userId}:null;}
        const id=mapped?.user_id ?? randomUUID();
        // Serialize profile writes against deletion on any device; validate the initiating session in this transaction.
        if(mapped){await tx.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE',[id]);const link=await one(tx,'SELECT user_id FROM "VoidDiscordIdentity" WHERE discord_id=$1 AND user_id=$2',[discord_id,id])??await one(tx,'SELECT "userId" FROM "Account" WHERE "providerId"=\'discord\' AND "accountId"=$1 AND "userId"=$2',[discord_id,id]);if(!link)throw new Error('Sign-in ended.');}
        if(sessionHash&&!await one(tx,'SELECT token_hash FROM "VoidSession" WHERE token_hash=$1 AND expires_at>$2',[sessionHash,new Date(now())]))throw new Error('Sign-in ended.');
        if(!mapped) {
          // A non-deliverable random placeholder satisfies the old required email column. No email is requested.
          await tx.query('INSERT INTO "User"(id,name,email,"emailVerified",image,"createdAt","updatedAt") VALUES($1,$2,$3,false,NULL,$4,$4)',[id,display_name,`${randomUUID()}@accounts.invalid`,new Date(now())]);
          await tx.query('INSERT INTO "Account"(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES($1,$2,\'discord\',$3,$4,$4)',[randomUUID(),discord_id,id,new Date(now())]);
        }
        await tx.query('INSERT INTO "VoidDiscordIdentity"(discord_id,user_id,display_name,avatar_hash,created_at,last_login) VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(discord_id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_hash=EXCLUDED.avatar_hash,last_login=EXCLUDED.last_login',[discord_id,id,display_name,avatar_hash,new Date(now())]);
        await tx.query('UPDATE "User" SET name=$2,image=NULL,"updatedAt"=$3 WHERE id=$1',[id,display_name,new Date(now())]);
        if(!await isValid())throw new Error('Sign-in ended.');
        if(sessionHash&&!await one(tx,'SELECT token_hash FROM "VoidSession" WHERE token_hash=$1 AND expires_at>$2',[sessionHash,new Date(now())]))throw new Error('Sign-in ended.');
        return id;
      });
    },
    async account(userId){return {user:await profile(userId),entitlements:await entitlements(userId),equipped:await equipped(userId),launcher_tokens:await rows(db,'SELECT id,created_at,expires_at,last_used_at FROM "VoidLauncherToken" WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>$2 ORDER BY created_at DESC',[userId,new Date(now())])};},
    async players({q='',sort='last_login',order='desc',page=1,page_size=25}){
      const column={last_login:'d.last_login',created_at:'d.created_at',display_name:'d.display_name',discord_id:'d.discord_id',owned_count:'owned_count'}[sort] ?? 'd.last_login';
      const direction=order==='asc'?'ASC':'DESC';
      const where=`WHERE d.display_name ILIKE $1 ESCAPE '\\' OR d.discord_id LIKE $1 ESCAPE '\\'`;
      const needle=`%${q.replace(/[\\%_]/g,'\\$&')}%`;
      const total=Number((await one(db,`SELECT COUNT(*) AS total FROM "VoidDiscordIdentity" d ${where}`,[needle])).total);
      const players=await rows(db,`SELECT d.*, (SELECT COUNT(DISTINCT e.item_id) FROM "VoidEntitlement" e WHERE e.user_id=d.user_id AND e.status='active') AS owned_count FROM "VoidDiscordIdentity" d ${where} ORDER BY ${column} ${direction},d.discord_id LIMIT $2 OFFSET $3`,[needle,page_size,(page-1)*page_size]);
      return {players:players.map(p=>({...p,avatar_url:avatar(p),owned_count:Number(p.owned_count)})),total,page,page_size};
    },
    async player(discordId){const p=await one(db,'SELECT * FROM "VoidDiscordIdentity" WHERE discord_id=$1',[discordId]);if(!p)return null;return {player:{...p,avatar_url:avatar(p)},entitlements:await entitlements(p.user_id),payments:await rows(db,'SELECT p."providerPaymentId" AS provider_payment_id,p.amount,p.currency,p.status,p."createdAt" AS created_at FROM "Payment" p JOIN "Order" o ON o.id=p."orderId" WHERE o."userId"=$1 ORDER BY p."createdAt" DESC',[p.user_id])};},
    async grant(actor,discordId,itemId,note){return db.transaction(async tx=>{
      const player=await one(tx,'SELECT * FROM "VoidDiscordIdentity" WHERE discord_id=$1 FOR UPDATE',[discordId]);
      const item=await one(tx,'SELECT id FROM "Product" WHERE id=$1',[itemId]);
      if(!player||!item)return null;
      const owned=await one(tx,'SELECT id FROM "VoidEntitlement" WHERE user_id=$1 AND item_id=$2 AND status=\'active\'',[player.user_id,itemId]);
      if(!owned)await tx.query('INSERT INTO "VoidEntitlement"(id,user_id,item_id,source,status,granted_at) VALUES($1,$2,$3,\'admin\',\'active\',$4) ON CONFLICT(user_id,item_id) WHERE source=\'admin\' DO UPDATE SET status=\'active\',granted_at=EXCLUDED.granted_at,revoked_at=NULL,revoked_by=NULL,reason=NULL',[randomUUID(),player.user_id,itemId,new Date(now())]);
      await audit(tx,actor,player.user_id,itemId,owned?'admin.grant.noop':'admin.grant',note);
      return {granted:!owned,already_owned:Boolean(owned)};
    });},
    async revoke(actor,discordId,itemId,reason){return db.transaction(async tx=>{
      const p=await one(tx,'SELECT user_id FROM "VoidDiscordIdentity" WHERE discord_id=$1 FOR UPDATE',[discordId]);
      if(!p||!await one(tx,'SELECT id FROM "VoidEntitlement" WHERE user_id=$1 AND item_id=$2',[p.user_id,itemId]))return null;
      const bought=Boolean(await one(tx,'SELECT id FROM "VoidEntitlement" WHERE user_id=$1 AND item_id=$2 AND source=\'purchase\'',[p.user_id,itemId]));
      await tx.query('UPDATE "VoidEntitlement" SET status=\'revoked\',revoked_at=$3,revoked_by=$4,reason=$5 WHERE user_id=$1 AND item_id=$2 AND status=\'active\'',[p.user_id,itemId,new Date(now()),actor,reason]);
      await tx.query('DELETE FROM "VoidEquipped" WHERE user_id=$1 AND item_id=$2',[p.user_id,itemId]);
      await audit(tx,actor,p.user_id,itemId,'admin.revoke',reason);return {revoked:true,payment_refunded:false,purchased:bought};
    });},
    async equip(userId,itemId){return db.transaction(async tx=>{
      await tx.query('SELECT user_id FROM "VoidDiscordIdentity" WHERE user_id=$1 FOR UPDATE',[userId]);
      const item=await one(tx,'SELECT c.slot FROM "VoidCosmetic" c WHERE c.item_id=$2 AND c.slot IS NOT NULL AND EXISTS(SELECT 1 FROM "VoidEntitlement" e WHERE e.user_id=$1 AND e.item_id=c.item_id AND e.status=\'active\')',[userId,itemId]);
      if(!item)return false;
      await tx.query('INSERT INTO "VoidEquipped"(user_id,slot,item_id) VALUES($1,$2,$3) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=EXCLUDED.item_id',[userId,item.slot,itemId]);return true;
    });},
    async auditList({page=1,page_size=25}){return {entries:await rows(db,'SELECT a.id,COALESCE(actor.discord_id,\'Deleted account\') AS actor_id,COALESCE(player.discord_id,\'Deleted account\') AS player_id,a.item_id,a.action,a.created_at,a.reason FROM "VoidAudit" a LEFT JOIN "VoidDiscordIdentity" actor ON actor.user_id=a.actor_id LEFT JOIN "VoidDiscordIdentity" player ON player.user_id=a.player_id ORDER BY a.id DESC LIMIT $1 OFFSET $2',[page_size,(page-1)*page_size]),total:Number((await one(db,'SELECT COUNT(*) AS total FROM "VoidAudit"')).total),page,page_size};},
    async deleteAccount(userId){return db.transaction(async tx=>{
      await tx.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE',[userId]);
      for(const table of ['VoidSession','VoidLauncherCode','VoidLauncherToken','VoidEquipped','VoidDiscordIdentity']) await tx.query(`DELETE FROM "${table}" WHERE user_id=$1`,[userId]);
      await tx.query('DELETE FROM "Session" WHERE "userId"=$1',[userId]);
      await tx.query('DELETE FROM "Account" WHERE "userId"=$1',[userId]);
      await tx.query('UPDATE "AccountProfile" SET bio=\'\',"minecraftName"=\'\',"publicProfile"=false WHERE "userId"=$1',[userId]);
      await tx.query('UPDATE "VoidEntitlement" SET status=\'revoked\',revoked_at=$2,revoked_by=NULL,reason=NULL WHERE user_id=$1',[userId,new Date(now())]);
      await tx.query('UPDATE "User" SET name=\'Deleted account\',email=$2,image=NULL,"updatedAt"=$3 WHERE id=$1',[userId,`${randomUUID()}@deleted.invalid`,new Date(now())]);
      await audit(tx,null,userId,null,'account.delete','Account data anonymised; statutory payment records retained.');
    });}
  };
}
