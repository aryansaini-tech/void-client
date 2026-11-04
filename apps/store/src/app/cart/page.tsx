import { PageIntro } from '@void/ui/components';
import { CartView } from '@/components/cart';
export const metadata={title:'Your cart',robots:{index:false,follow:false}};
export default function Cart(){return <main id="main"><PageIntro eyebrow="A collection in the making" title="Good choices start here." description="Review your items, make a few changes, and take the next step when you’re ready."/><section className="container content-body" aria-label="Shopping cart"><CartView/></section></main>;}
