import { notFound } from 'next/navigation';
import { getDatabase } from '@void/backend/database';
import { serviceState } from '@void/backend/env';
import { PageIntro } from '@void/ui/components';
export const dynamic='force-dynamic';
export const metadata={title:'Player profile',robots:{index:false,follow:false}};
export default async function Player({params}:{params:Promise<{id:string}>}){if(!serviceState().database)notFound();const {id}=await params;const profile=await getDatabase().accountProfile.findFirst({where:{userId:id,publicProfile:true},select:{bio:true,minecraftName:true,user:{select:{name:true}}}});if(!profile)notFound();return <main id="main"><PageIntro eyebrow="Void community profile" title={profile.user.name} description={profile.bio||'A place in the Void community.'}/><div className="container content-body">{profile.minecraftName&&<p>Minecraft name: {profile.minecraftName}</p>}</div></main>;}
