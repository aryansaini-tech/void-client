/* eslint-disable @next/next/no-img-element -- ImageResponse renders a server-side image, not browser HTML. */
import { officialWordmarkData } from '@void/ui/brand-image-data';
import { ImageResponse } from 'next/og';
export const alt = 'Void Client — Play beyond limits.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage() { return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',background:'#E8E8E0',color:'#252525',padding:80,flexDirection:'column',justifyContent:'space-between',border:'1px solid rgba(185,149,77,0.35)',backgroundImage:'radial-gradient(ellipse at 85% 30%, rgba(245,223,171,0.65), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(235,241,255,0.7), #E8E8E0 70%)'}}><img src={officialWordmarkData} width={210} height={70} alt="Void Client"/><div style={{display:'flex',fontSize:92,fontWeight:800,letterSpacing:-5,lineHeight:1.05}}>PLAY BEYOND<br/>LIMITS.</div><div style={{display:'flex',fontSize:20,color:'#65615A'}}>The Minecraft Bedrock client.</div></div>,size); }

