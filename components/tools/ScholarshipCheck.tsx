'use client';

import { ScholarshipsSection } from '@/components/area/ScholarshipsSection';
import { useSite } from '@/components/site/SiteProvider';
import { LoadingGate } from './AccessGate';

/** Verifica della borsa aperta a tutti; l'account serve solo per salvare. */
export function ScholarshipCheck() {
  const { user, loading } = useSite();
  if (loading) return <LoadingGate />;
  return <ScholarshipsSection user={user} />;
}
