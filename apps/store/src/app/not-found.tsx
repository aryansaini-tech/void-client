import { ButtonLink, EmptyState } from '@void/ui/components';
export default function NotFound() { return <main id="main" className="container error-page"><h1 className="sr-only">Page not found</h1><EmptyState title="Lost in the void." description="This page does not exist, or it has moved."><ButtonLink href="/">Back to home</ButtonLink></EmptyState></main>; }

