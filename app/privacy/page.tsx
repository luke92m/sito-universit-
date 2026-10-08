import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informativa privacy',
  description: 'Come il sito tratta i dati personali degli utenti registrati.'
};

// Testo provvisorio: va completato e validato da un consulente privacy prima della pubblicazione.
export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article>
        <span className="placeholder-label">Bozza da validare</span>
        <span className="eyebrow">Informativa privacy</span>
        <h1>Come trattiamo i tuoi dati</h1>
        <p className="page-lead">
          Questa è una bozza provvisoria. Prima dell’apertura al pubblico deve essere completata con titolare del
          trattamento, contatti e basi giuridiche definitive.
        </p>

        <h2>Quali dati raccogliamo</h2>
        <p>
          Email e password (gestite dal servizio di autenticazione: la password non è mai visibile al sito), situazione di
          studio, ateneo, corso e anno indicati nel profilo, preferenze di orientamento che scegli di salvare (per esempio
          fascia ISEE e comune di residenza), messaggi pubblicati nella community e annunci di libri usati.
        </p>

        <h2>Perché li usiamo</h2>
        <p>
          Per personalizzare gli strumenti del sito (orientamento, scadenze, borse, community e libri usati). I dati
          economici sono facoltativi e usati solo per stime orientative: non vengono condivisi con atenei o terzi.
        </p>

        <h2>Dove sono conservati</h2>
        <p>
          In un database gestito da Supabase su server nell’Unione europea. Ogni utente può leggere e modificare soltanto i
          propri dati; messaggi e annunci sono visibili agli altri utenti registrati, insieme al recapito che scegli di
          indicare nell’annuncio.
        </p>

        <h2>Età minima</h2>
        <p>Per registrarti devi avere almeno 14 anni, come previsto dalla normativa italiana sul consenso digitale.</p>

        <h2>I tuoi diritti</h2>
        <p>
          Puoi chiedere accesso, rettifica o cancellazione del profilo e dei dati collegati. I contatti per l’esercizio dei
          diritti saranno indicati nella versione definitiva di questa informativa.
        </p>
      </article>
    </main>
  );
}
