# NOME SITO — prototipo universitario v3

Sito statico multi-pagina in HTML, CSS e JavaScript, senza framework e senza dipendenze esterne. È utilizzabile come demo locale oppure pubblicabile su Vercel.

## Avvio sul computer

Dalla cartella `sito-universita`:

```bash
python -m http.server 8000
```

Poi apri `http://localhost:8000`. È possibile aprire anche `index.html` direttamente, ma un server locale rende più uniforme il comportamento di `localStorage` e collegamenti tra pagine.

## Novità della versione 3

### Registrazione e profilo

- l’opzione è diventata **“Sono studente universitario o mi sto per immatricolare”**;
- per questo profilo vengono richiesti:
  - stato `già immatricolato` o `mi sto per immatricolare`;
  - ateneo scelto tra i 99 presenti nel sito;
  - corso facoltativo;
  - anno di studi, obbligatorio per chi è già immatricolato;
- i dati del percorso possono essere modificati dal menu del profilo;
- `Preparazione` e `Burocrazia` compaiono nel menu principale soltanto per il profilo **“Mi voglio iscrivere all’università”**.

### Borse di studio

- l’utente può scegliere se comunicare o meno dati economici e residenza;
- selezione tramite fasce ISEE e ISPE;
- verifica esclusivamente orientativa rispetto ai limiti nazionali indicati per l’a.a. 2026/27;
- stima del profilo di residenza `in sede`, `pendolare` o `fuori sede`;
- link al portale regionale di diritto allo studio e al sito dell’ateneo;
- possibilità di salvare un’opportunità e la data letta nel bando;
- le opportunità salvate confluiscono nella pagina Scadenze.

### Scadenze

- conteggio automatico dei giorni rispetto alla data attuale del dispositivo;
- categorie diverse per studenti già iscritti e futuri studenti;
- promemoria per rate, esami, test, immatricolazione, borse e procedure;
- integrazione con le borse salvate;
- nessuna data ufficiale viene inventata: l’utente la inserisce dopo averla verificata nel bando o nel portale dell’ateneo.

### Community e libri usati

- community associata allo stesso ateneo;
- filtro facoltativo per mostrare soltanto lo stesso corso;
- libri usati limitati alla combinazione esatta `stesso ateneo + stesso corso`;
- pubblicazione locale di messaggi e annunci per la demo;
- per comunicazione reale tra dispositivi servono backend, database, verifica email e moderazione.

### Preparazione

- accessibile soltanto al profilo **“Mi voglio iscrivere all’università”**;
- scelta di ateneo e macroarea;
- associazione orientativa al TOLC di riferimento o a un test interno dell’ateneo;
- nove macroaree e 45 quesiti originali fissi;
- ogni utente riceve gli stessi quesiti;
- correzione con punteggio e spiegazione;
- non vengono copiati quesiti protetti dalle prove ufficiali.

### Burocrazia

- scelta di ateneo e corso;
- sintesi orientativa di accesso, possibile prova di area, modalità didattica e contribuzione media aggregata;
- checklist di documenti e passaggi per l’immatricolazione;
- collegamento alla ricerca della pagina ufficiale del corso;
- collegamento al sito dell’ateneo;
- passaggio alla verifica delle borse con ateneo e corso già selezionati;
- passaggio alla creazione di una scadenza.

## Funzioni già presenti

- menu con `atenei`, `comparison`, `trova il mio corso`, sezioni condizionali e `scuole e aziende`;
- questionario di orientamento con salvataggio facoltativo delle preferenze;
- comparatore tra due università o due corsi;
- catalogo di 99 istituti universitari;
- filtri alfabetico, regionale, ranking, macroarea disciplinare e tipologia di istituzione;
- layout responsive per desktop, tablet e smartphone.

## Cambiare il nome del sito

Apri `js/config.js` e sostituisci:

```js
name: 'NOME SITO'
```

## Dati e aggiornamento

La **data odierna e i conti alla rovescia** vengono calcolati automaticamente dal browser. I dati ufficiali su bandi, importi, test, rette e scadenze non possono invece mantenersi aggiornati da soli in un sito statico: per una versione pubblica realmente aggiornata servono un backend, procedure di importazione da fonti ufficiali e controlli editoriali.

Il prototipo usa dati MUR/USTAT aggregati e il ranking generale QS già indicati in `data/NOTE_DATI.md`. I campi non disponibili in modo uniforme non vengono inventati.

## Sicurezza e privacy

Questa è una demo front-end. Account, hash della password demo, percorso, scadenze, messaggi e annunci vengono salvati nel `localStorage` del browser. ISEE, ISPE e residenza inseriti nella verifica non vengono conservati dal prototipo; se salvi un’opportunità restano soltanto l’esito orientativo, l’ateneo, il corso e l’eventuale scadenza. Non usare comunque credenziali o dati personali reali.

Per una versione pubblica servono almeno:

- autenticazione sicura lato server e verifica email;
- password cifrate con algoritmi adatti e mai conservate nel browser;
- database con permessi e separazione dei dati;
- informativa privacy, base giuridica, consensi e tempi di conservazione;
- moderazione, segnalazioni e protezioni anti-abuso;
- collegamento verificato alle fonti ufficiali.

## Aggiornamento su GitHub e Vercel

Nel repository collegato a Vercel, carica il **contenuto** di questa cartella nella stessa posizione già pubblicata. Non creare una seconda cartella `sito-universita` dentro quella esistente.

Struttura corretta:

```text
sito-universita/
├── index.html
├── atenei.html
├── comparison.html
├── trova-corso.html
├── preparazione.html
├── burocrazia.html
├── area-studente.html
├── assets/
├── data/
└── js/
```

Dopo il commit su `main`, Vercel dovrebbe creare automaticamente un nuovo deployment. Se la Root Directory del progetto è la radice del repository, lasciala vuota; se i file sono dentro una singola cartella `sito-universita`, imposta quella cartella come Root Directory.
