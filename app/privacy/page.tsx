import type { Metadata } from 'next';
import Link from 'next/link';
import { isEnabled } from '@/lib/features';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Informativa privacy',
  description: 'Come il sito tratta i dati: niente account, niente dati personali salvati sui nostri server.'
};

// Testo provvisorio: va completato (titolare e contatti) e validato da un consulente privacy prima della
// pubblicazione definitiva. Descrive il sito con gli account spenti (lib/features.ts); se si riaccendono,
// la sezione sugli account torna a valere e va ricontrollata.
export default function PrivacyPage() {
  const accounts = isEnabled('account');
  return (
    <main className="legal-page">
      <article>
        <span className="placeholder-label">Bozza da validare</span>
        <span className="eyebrow">Informativa privacy</span>
        <h1>Come trattiamo i tuoi dati</h1>
        <p className="page-lead">
          In breve: {accounts ? 'l’account è facoltativo e' : 'non ci sono account,'} il sito non chiede il tuo nome
          né la tua email e non vende né condivide dati con atenei o terzi. Questa bozza va completata con il titolare
          del trattamento e i contatti prima dell’apertura definitiva.
        </p>

        <h2>Cosa resta nel tuo browser</h2>
        <p>
          Le risposte ai questionari e le preferenze che scegli di ricordare (per esempio fascia ISEE, regione e comune
          di residenza, corso cercato) vengono salvate solo nella memoria locale del tuo browser, su questo dispositivo,
          per non doverle reinserire. Non arrivano a un nostro database. Puoi cancellarle svuotando i dati del sito dal
          browser.
        </p>

        <h2>Cosa passa dal server, senza essere salvato</h2>
        <p>
          Per calcolare risultati, costo reale e borsa, il browser invia al sito le risposte necessarie (per esempio
          ateneo, fascia o valore ISEE e ISPE, comune di residenza). Servono solo per quel calcolo: non vengono salvate
          né collegate a te. I link condivisibili dei risultati non contengono ISEE e comune, a meno che tu non scelga di
          includerli.
        </p>

        <h2>Statistiche di visita</h2>
        <p>
          Per capire quali pagine sono utili il sito può usare statistiche anonime e aggregate senza cookie (Cloudflare Web
          Analytics): conteggi di pagine viste, paese e tipo di dispositivo, senza identificare chi visita. Il sito è
          ospitato su Cloudflare, che come ogni servizio di hosting registra per motivi tecnici e di sicurezza dati come
          l’indirizzo IP.
        </p>

        <h2>Cookie</h2>
        <p>
          {accounts
            ? 'Il sito usa solo cookie tecnici per mantenere l’accesso a chi ha un account.'
            : 'Il sito non usa cookie di profilazione né cookie di terze parti, e senza account non servono cookie di accesso.'}
        </p>

        {accounts ? (
          <>
            <h2>Se crei un account</h2>
            <p>
              Email e password (gestite dal servizio di autenticazione Supabase, su server nell’Unione europea),
              situazione di studio, ateneo e corso, preferenze e borse che scegli di salvare. Per registrarti devi avere
              almeno 14 anni. Puoi chiedere accesso, rettifica o cancellazione dei tuoi dati.
            </p>
          </>
        ) : null}

        <h2>Link a siti esterni</h2>
        <p>
          Accanto ai numeri trovi i link ai documenti ufficiali (atenei, enti per il diritto allo studio, MUR, INPS):
          aprendoli passi ai loro siti, con le loro regole sulla privacy.
        </p>

        <h2>I tuoi diritti e i contatti</h2>
        <p>
          I contatti del titolare del trattamento saranno indicati nella versione definitiva di questa informativa. Per
          sapere da dove vengono i numeri del sito, leggi <Link href="/metodo">come calcoliamo i costi</Link>.
        </p>
      </article>
    </main>
  );
}
