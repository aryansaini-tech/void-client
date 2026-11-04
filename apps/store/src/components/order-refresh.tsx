'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartLine } from '@void/shared/schemas';
import { useCart } from './cart-provider';
export function OrderRefresh({pending,paid,orderId,items}:{pending:boolean;paid:boolean;orderId:string;items:CartLine[]}){const router=useRouter();const {ready,clearPurchased}=useCart();const [stopped,setStopped]=useState(false);useEffect(()=>{if(paid&&ready)clearPurchased(orderId,items);},[paid,ready,clearPurchased,orderId,items]);useEffect(()=>{if(!pending)return;let attempts=0;const interval=setInterval(()=>{if(document.visibilityState==='visible'){router.refresh();attempts++;}if(attempts>=15){clearInterval(interval);setStopped(true);}},3000);return()=>clearInterval(interval);},[pending,router]);return pending?<div className="order-refresh"><p role="status" className="field-hint">{stopped?'Payment confirmation is taking longer than usual. You can refresh this page or check your orders later.':'Checking for a verified payment update…'}</p><button className="button button-secondary" onClick={()=>router.refresh()}>Check status</button></div>:null;}
