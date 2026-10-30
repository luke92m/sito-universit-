# NOME SITO — orientamento universitario (v9, Next.js + Supabase)

Sito per la **scelta** dell’università: «Scopri quale università fa per te e quanto ti costa davvero, borsa compresa». Un solo percorso, senza account: “Trova il mio corso” → “Trova la mia università” → comparatore → burocrazia, con verifica della borsa e catalogo di 99 atenei. Nessun ateneo paga per comparire e ogni numero ha la sua fonte; l’account serve solo per salvare.

Preparazione ai test, community, libri usati, accompagnamento e scadenze automatiche sono spenti in `lib/features.ts` (codice e tabelle restano).

La v9 è la migrazione della demo v8 (HTML/JS statico con dati nel `localStorage`) a **Next.js + TypeScript + Supabase**. Le funzioni e la grafica sono le stesse della v8; cambiano le fondamenta:

- **account veri** con Supabase Auth (conferma email, recupero password, età minima 14 anni, presa visione privacy);
- **dati utente nel database** con Row Level Security: profilo, preferenze, borse salvate, community, libri usati;
- **dataset pesanti solo sul server**: il browser non scarica più i 1,25 MB di corsi MUR, il calcolo di finder e comparison avviene nelle route API;
- **niente HTML costruito a stringhe**: l’interfaccia è in React, i testi provenienti dai dati non passano più da `innerHTML`;
- **test automatici**: parità dei calcoli con la v8, test end-to-end, test delle policy RLS.

## Avvio in locale

Requisiti: Node.js 20.9 o successivo.

```bash
npm install
```

```bash
npm run dev
```

Il sito è su `http://localhost:3000`. Senza le variabili Supabase funzionano tutte le parti pubbliche (atenei, test, comparison); gli strumenti con account mostrano un avviso.

> Su questo PC Norton intercetta le connessioni HTTPS: per le funzioni di scraping (scadenze, link ai corsi) il server di sviluppo deve girare con `NODE_USE_SYSTEM_CA=1`, già impostato in `.claude/launch.json`.

## Configurare Supabase

1. Crea un progetto su [supabase.com](https://supabase.com) scegliendo una **regione UE** (es. Frankfurt).
2. In **SQL Editor** esegui il contenuto di `supabase/migrations/0001_init.sql`.
3. In **Authentication → URL Configuration** imposta:
   - *Site URL*: l’URL pubblico del sito (in locale `http://localhost:3000`);
   - *Redirect URLs*: `http://localhost:3000/auth/callback` e `https://<dominio>/auth/callback`.
4. Copia `.env.example` in `.env.local` e inserisci URL e chiave *anon* da **Project Settings → API**.
5. Riavvia `npm run dev`.

La chiave *anon* è pubblica per definizione: la protezione dei dati è data dalle policy RLS definite nella migrazione. Non inserire mai la chiave *service_role* nel sito.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` / `npm start` | build e avvio di produzione |
| `npm run lint` · `npm run typecheck` | controlli statici |
| `npm test` | test di parità con la v8 e test RLS (questi ultimi solo con Supabase configurato) |
| `npm run test:e2e` | test end-to-end con Playwright (usa Edge/Chrome già installato) |
| `npm run data:extract` | rigenera `lib/data/*.json` dai file della v8 in `legacy/` |
| `npm run parity:snapshot` | rigenera gli snapshot di parità eseguendo il codice della v8 |
| `npm run legacy` | serve la v8 originale su `http://localhost:8000` per il confronto visivo |

### Test con account

- **RLS** (`tests/rls`): servono due utenti confermati e queste variabili in `.env.local`: `RLS_USER_A_EMAIL`, `RLS_USER_A_PASSWORD`, `RLS_USER_B_EMAIL`, `RLS_USER_B_PASSWORD`.
- **E2E con accesso** (`tests/e2e/auth.spec.ts`): `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` di un utente “studente universitario”.

Usa account creati apposta per i test, mai credenziali personali.

## Struttura

```text
app/                    pagine (App Router) e route API
  api/finder            punteggio "Trova la mia università"
  api/comparison        righe del comparatore
  api/atenei/...        schede e ranking per area
  api/course-link       pagina ufficiale del corso (scraping)
  api/scholarship-link  pagina borse dell'ateneo o dell'ente DSU (scraping)
  api/deadlines         scadenze rilevate dalle fonti ufficiali (scraping)
components/             interfaccia React (site, atenei, finder, comparison, tools, area)
lib/data/               dataset statici (JSON) e accesso tipizzato, solo server
lib/domain/             logica di calcolo portata dalla v8 (ranking, finder, comparison…)
lib/scraping/           lettura dei siti ufficiali
lib/supabase/           client Supabase per browser e server
proxy.ts                rinnovo della sessione Supabase
supabase/migrations/    schema del database con policy RLS
tests/parity            confronto dei calcoli con la v8
tests/e2e               test Playwright
tests/rls               test delle policy del database
legacy/                 sito v8 originale, tenuto per confronto: da rimuovere dopo la verifica
```

Fonti, limiti e metodologia dei dati sono descritti in `legacy/data/NOTE_DATI.md` (invariati rispetto alla v8).

## Pubblicazione su Cloudflare Workers

Il sito gira su Cloudflare Workers tramite [vinext](https://vinext.dev/) (configurazione in `vite.config.ts` e `cloudflare.config.ts`). `npm run dev` e `npm run build` restano quelli di Next.js; per Cloudflare:

```
npm run build:vinext    # build del Worker
npm run start:vinext    # anteprima locale del Worker (porta 4173)
npm run deploy:vinext   # pubblicazione manuale
```

Con la build automatica da GitHub (Workers & Pages → collega il repository):

1. Worker `sito-universit` (deve coincidere con `name` in `cloudflare.config.ts`); comando di build vuoto, comando di deploy `npm run deploy:vinext` (fa già la build); branch di produzione `main`. Senza questi comandi Cloudflare lancia `wrangler deploy`, che prova a convertire il progetto con OpenNext e fallisce;
2. aggiungi le variabili di build `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`;
3. aggiungi il dominio di produzione (e quello delle anteprime) tra i *Redirect URLs* di Supabase;
4. le statistiche di visita si attivano da Cloudflare Web Analytics, senza codice nel sito.

Le pagine uguali per tutti dichiarano `export const revalidate = 3600`: il deploy (`--warm-cache`) le classifica come statiche e le mette nella cache Workers, che le rigenera al massimo ogni ora. In anteprima locale la cache non è attiva (le pagine escono `no-store`). Una pagina nuova uguale per tutti deve dichiarare lo stesso `revalidate`, altrimenti viene generata a ogni visita.

Il piano Workers Free concede 10 ms di CPU per richiesta: se nella dashboard compaiono errori *Exceeded CPU* (1102), serve il piano Workers Paid.

I vecchi indirizzi `*.html` reindirizzano automaticamente ai nuovi percorsi.

## Differenze rispetto alla v8

- Gli account demo salvati nel browser non vengono migrati: chi li usava deve registrarsi di nuovo.
- Libri usati: invece di mostrare l’email di chi pubblica, l’annuncio riporta un **recapito scelto dal venditore** (precompilato con la sua email, modificabile).
- Community e annunci sono visibili a tutti gli utenti registrati; ogni autore può cancellare i propri contenuti.
- Gli ospiti conservano preferenze e fascia ISEE nel browser; con un account gli stessi dati vanno nel profilo.
