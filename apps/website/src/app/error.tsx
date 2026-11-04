'use client';
import { useEffect } from 'react';
import { Button, EmptyState } from '@void/ui/components';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Page unavailable', error.digest ?? 'unexpected-error'); }, [error]);
  return <main id="main" className="container error-page"><EmptyState title="A moment out of sync." description="This page could not load. Please try again."><Button onClick={reset}>Try again</Button></EmptyState></main>;
}

