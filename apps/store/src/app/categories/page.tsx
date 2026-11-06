import { storeUrl } from '@void/shared/config';
import Link from 'next/link';
import { Layers3 } from 'lucide-react';
import { PageIntro,EmptyState,ButtonLink } from '@void/ui/components';
import { getCatalog } from '@void/store/lib/data';
export const metadata={title:'Categories'};
export default async function Categories() {
  const catalog = await getCatalog();
  const categories = Array.from(new Map(catalog.products.map(product => [product.category.id, product.category])).values());
  return (
    <main id="main">
      <PageIntro eyebrow="The collection, your way" title="A place for every favorite." description="Browse the official collection by category. Categories appear when they contain published products." />
      <section className="container content-body" aria-label="Store categories">
        {categories.length ? (
          <div className="module-grid">
            {categories.map(category => {
              const count = catalog.products.filter(product => product.category.id === category.id).length;
              return (
                <Link className="module-card" href={storeUrl(`/categories/${category.slug}`)} key={category.id}>
                  <Layers3 size={26} />
                  <h2>{category.name}</h2>
                  <p>{count} {count === 1 ? 'product' : 'products'}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="The collection is taking shape." description="Categories will appear here when genuine products are published." icon={<Layers3 size={28} strokeWidth={1.3} />}>
            <ButtonLink href={storeUrl('/products')} variant="secondary">View the collection</ButtonLink>
          </EmptyState>
        )}
      </section>
    </main>
  );
}
