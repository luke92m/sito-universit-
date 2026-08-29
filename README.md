# NOME SITO — prototipo universitario v5

Progetto multi-pagina in HTML, CSS e JavaScript, con funzioni serverless per Vercel. Non usa framework front-end né dipendenze esterne.

## Avvio sul computer

Dalla cartella `sito-universita`:

```bash
python -m http.server 8000
```

Poi apri `http://localhost:8000`.

Le pagine statiche, il login dimostrativo e i selettori funzionano anche in locale. Le funzioni automatiche contenute nella cartella `api/` — sincronizzazione delle scadenze e risoluzione della pagina ufficiale del corso — richiedono il deploy su Vercel oppure un ambiente compatibile con funzioni serverless.

## Novità della versione 5

### “Trova la mia università” dentro Trova il mio corso

La pagina `trova-corso.html` contiene ora due strumenti accessibili dallo stesso menu:

- **Trova il mio corso**, il questionario già presente;
- **Trova la mia università**, utilizzabile anche senza completare prima il test sul corso.

Dopo il risultato del primo test compare la frase **“Ora che hai trovato il corso adatto a te, trova la tua università”** con il relativo pulsante. Il secondo test può partire dal corso principale appena suggerito oppure da uno qualunque dei corsi ricordati nelle preferenze dell’account. In assenza di preferenze, la prima domanda chiede direttamente un corso generale o una macroarea.

Il questionario universitario considera:

- livello del titolo desiderato;
- regione e città di residenza, con riuso e conferma dei dati già inseriti;
- disponibilità al pendolarismo entro 90 minuti stimati con servizi regionali;
- disponibilità al trasferimento nella stessa regione, in regioni confinanti o in tutta Italia;
- fascia ISEE, con riuso e conferma quando già disponibile;
- preferenza per corsi in italiano o inglese.

Il risultato mostra al massimo cinque atenei in ordine decrescente di affinità. Il punteggio combina coerenza dell’offerta formativa, geografia, costo orientativo, sostegni economici, ranking QS generale disponibile e indice disciplinare del prototipo. Ogni scheda collega alla pagina ufficiale del corso e alla pagina ufficiale o regionale più pertinente per le borse di studio.

Le stime di percorrenza ferroviaria e costo della città sono dichiaratamente dimostrative: non sostituiscono orari, tariffe, affitti o dati ufficiali.

### Riuso locale di ISEE e residenza

Quando l’utente completa la verifica delle borse o il test sull’università, fascia ISEE, regione e città vengono conservate nel `localStorage` del dispositivo. Negli strumenti successivi sono mostrate già compilate e devono soltanto essere confermate o modificate.

### Nuova funzione serverless per le borse

`api/scholarship-link.js` analizza il dominio ufficiale dell’ateneo e, quando necessario, il portale regionale per il diritto allo studio. Reindirizza alla pagina più pertinente per borse, benefici o agevolazioni; se non trova una corrispondenza affidabile, usa il portale regionale o la homepage ufficiale.

## Novità della versione 4

### Scadenze automatiche

- la pagina non chiede più all’utente di inserire manualmente una data;
- usa l’ateneo e il corso salvati nel profilo, nell’ultima ricerca di Burocrazia oppure nell’ultima opportunità di borsa salvata;
- cerca date pubblicate sulle pagine ufficiali dell’ateneo e dell’ente regionale per il diritto allo studio;
- mostra per impostazione predefinita un calendario mensile;
- permette di passare a un elenco ordinato dalle scadenze future più vicine a quelle più lontane, con le date già scadute in fondo;
- ogni risultato collega direttamente alla pagina ufficiale dalla quale è stato rilevato;
- non inventa date quando non riesce a trovare una fonte verificabile.

Il riconoscimento automatico è orientativo: siti e bandi possono cambiare struttura oppure contenere date riferite a categorie diverse di studenti. Prima di effettuare pagamenti o presentare domande va sempre aperta la fonte collegata.

### Ricerca dell’ateneo mentre si scrive

Tutti i campi in cui si sceglie un ateneo sono diventati selettori ricercabili. Si può:

- digitare l’inizio del nome, per esempio `un`;
- usare freccia su/giù e Invio da tastiera;
- aprire l’elenco completo con il pulsante a destra;
- continuare a usare il menu su smartphone.

Il filtro privilegia i nomi che iniziano con il testo digitato. Se non esistono corrispondenze iniziali, prova anche l’inizio delle singole parole e infine una corrispondenza interna, così ricerche come `boc` possono trovare Bocconi.

### Collegamento diretto al corso in Burocrazia

Nel riquadro **Azioni successive**:

- `Apri la pagina ufficiale del corso` usa una funzione serverless che analizza il dominio ufficiale dell’ateneo e reindirizza alla pagina del corso più probabile;
- non viene più aperto un motore di ricerca;
- l’azione `Aggiungi una scadenza` è stata rimossa.

Se il sito dell’ateneo non rende individuabile una pagina specifica, il collegamento ripiega sul catalogo ufficiale dei corsi o sulla homepage dell’ateneo, mai su una ricerca generica.

## Funzioni delle versioni precedenti

### Registrazione e profilo

- profilo **“Sono studente universitario o mi sto per immatricolare”**;
- stato `già immatricolato` o `mi sto per immatricolare`;
- scelta di ateneo, corso e, quando necessario, anno di studi;
- modifica successiva dei dati dal menu del profilo;
- `Preparazione` e `Burocrazia` visibili soltanto per il profilo **“Mi voglio iscrivere all’università”**.

### Borse di studio

- condivisione facoltativa di fascia ISEE, ISPE e residenza;
- verifica esclusivamente orientativa;
- stima del profilo di residenza;
- collegamenti al portale regionale e all’ateneo;
- salvataggio dell’opportunità; fascia ISEE e residenza possono essere ricordate localmente per riutilizzarle negli strumenti di orientamento.

### Community e libri usati

- community associata allo stesso ateneo, con filtro facoltativo per corso;
- mercatino dei libri limitato a stesso ateneo e stesso corso;
- messaggi e annunci locali al browser nella demo.

### Preparazione

- scelta di ateneo e macroarea;
- associazione orientativa a TOLC o test interno;
- 45 quesiti originali e fissi, uguali per tutti;
- correzione con punteggio e spiegazione.

### Burocrazia

- scelta di ateneo e corso;
- sintesi orientativa di accesso, prova di area, modalità didattica e contribuzione aggregata;
- checklist di documenti e passaggi;
- collegamento diretto alla pagina ufficiale del corso, al sito dell’ateneo e alla verifica delle borse.

### Altre funzioni

- menu con `atenei`, `comparison`, `trova il mio corso`, voci condizionali e `scuole e aziende`;
- questionario di orientamento con salvataggio facoltativo delle preferenze;
- confronto tra università o corsi;
- catalogo di 99 istituzioni;
- filtri alfabetico, regionale, ranking, macroarea e tipologia;
- layout responsive.

## Cambiare il nome del sito

Apri `js/config.js` e sostituisci:

```js
name: 'NOME SITO'
```

## Struttura importante

```text
sito-universita/
├── api/
│   ├── _shared.js
│   ├── course-link.js
│   ├── deadlines.js
│   └── scholarship-link.js
├── assets/
├── data/
│   ├── atenei.json
│   └── university-directory.json
├── js/
├── index.html
├── atenei.html
├── comparison.html
├── trova-corso.html
├── preparazione.html
├── burocrazia.html
└── area-studente.html
```

Non omettere la cartella `api/` né `data/university-directory.json`: sono necessarie per le nuove funzioni online.

## Sicurezza e privacy

Questa rimane una demo. Account e password demo, percorso, preferenze, messaggi e annunci sono salvati nel `localStorage` del browser. Non usare credenziali o dati personali reali.

Per utenti reali servono autenticazione lato server, verifica email, database, gestione sicura delle password, informativa privacy, controlli sui consensi, moderazione e monitoraggio delle fonti.

## Aggiornamento su GitHub e Vercel

Nel repository collegato a Vercel, carica il **contenuto** di questa cartella nella posizione già pubblicata. Nel repository usato durante lo sviluppo, la versione nuova deve stare nella radice accanto a `index.html`; non va caricata dentro la vecchia sottocartella `sito-universita`.

Dopo il commit su `main`, Vercel crea normalmente un nuovo deployment. Se i file sono nella radice del repository, la **Root Directory** di Vercel deve essere vuota.
