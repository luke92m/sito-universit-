'use client';

import { useSite } from '@/components/site/SiteProvider';

export function ProfileCtaButton() {
  const { user, openAuth, showToast } = useSite();
  return (
    <button
      className="button button-secondary"
      type="button"
      onClick={() => {
        if (user) showToast('Il tuo profilo è già attivo: i risultati vengono salvati nel tuo account.');
        else openAuth('register');
      }}
    >
      Salva i risultati (facoltativo)
    </button>
  );
}
