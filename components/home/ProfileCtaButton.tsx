'use client';

import { useSite } from '@/components/site/SiteProvider';

export function ProfileCtaButton() {
  const { user, openAuth, showToast } = useSite();
  return (
    <button
      className="button button-secondary"
      type="button"
      onClick={() => {
        if (user) showToast('Il tuo profilo è già attivo: aprilo dal menu in alto a destra.');
        else openAuth('register');
      }}
    >
      Crea il tuo profilo
    </button>
  );
}
