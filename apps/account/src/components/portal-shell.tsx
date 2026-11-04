'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, LayoutDashboard, LogOut, Settings2, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { site, accountUrl } from '@void/shared/config';
import { setMotionPreference } from '@void/ui/motion';
import { DiscordIcon } from '@void/ui/brand';
import { authClient } from '@void/account/lib/auth-client';
const navigation=[{href:'/dashboard',name:'Overview',icon:LayoutDashboard},{href:'/profile',name:'Profile',icon:UserRound},{href:'/security',name:'Security',icon:ShieldCheck},{href:'/discord',name:'Linked Discord',icon:DiscordIcon},{href:'/purchases',name:'Purchase history',icon:ShoppingBag},{href:'/settings',name:'Settings',icon:Settings2}];
export function PortalShell({name,reducedMotion,children}:{name:string;reducedMotion:boolean;children:React.ReactNode}){
  const path=usePathname();const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{setMotionPreference(reducedMotion);},[reducedMotion]);
  async function logout(){setBusy(true);setError('');try{const result=await authClient.signOut();if(result.error)throw new Error();router.replace(accountUrl('/login'));router.refresh();}catch{setError('Could not sign out. Try again.');setBusy(false);}}
  return <main id="main" className="portal-layout"><aside className="portal-sidebar"><div className="portal-identity"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><span>Your Void account</span></div></div><nav className="portal-nav" aria-label="Account navigation">{navigation.map(({href,name:label,icon:Icon})=><Link key={href} href={accountUrl(href)} aria-current={(path===new URL(accountUrl(href)).pathname || path===href)?'page':undefined}><Icon width={16} height={16}/>{label}</Link>)}<button className="button button-ghost" onClick={logout} disabled={busy}><LogOut size={15}/>{busy?'Signing out…':'Sign out'}</button></nav>{error&&<p role="alert" className="field-error">{error}</p>}<div className="portal-sidebar-bottom"><Link href={site.urls.website} className="text-link">Back to Void <ArrowUpRight size={13}/></Link></div></aside><div className="portal-content">{children}</div></main>;
}
