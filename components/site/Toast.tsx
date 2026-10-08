'use client';

import { useSite } from './SiteProvider';

export function Toast() {
  const { toast } = useSite();
  return (
    <div className={`site-toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
