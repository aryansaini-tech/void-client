import { serviceState } from '@void/backend/env';
import { PageIntro } from '@void/ui/components';
import { getViewer } from '@/lib/data';
import { CheckoutView } from '@/components/checkout';
export const metadata={title:'Checkout',robots:{index:false,follow:false}};
export default async function Checkout({searchParams}:{searchParams:Promise<{canceled?:string}>}){const [viewer,params]=await Promise.all([getViewer(),searchParams]);return <main id="main"><PageIntro eyebrow="One step closer" title="Make it yours." description="Review your order and continue to secure payment when everything looks right."/><section className="container content-body" aria-label="Checkout"><CheckoutView enabled={serviceState().checkout} signedIn={Boolean(viewer)} email={viewer?.user.email} canceled={params.canceled==='1'}/></section></main>;}
