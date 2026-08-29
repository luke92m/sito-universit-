# NOME SITO — prototipo universitario v7

Progetto multi-pagina in HTML, CSS e JavaScript, con funzioni serverless per Vercel. Non usa framework front-end né dipendenze esterne.

## Avvio sul computer

Dalla cartella `sito-universita`:

```bash
python -m http.server 8000
```

Poi apri `http://localhost:8000`.

Le pagine statiche, il login dimostrativo e i selettori funzionano anche in locale. Le funzioni automatiche contenute nella cartella `api/` — sincronizzazione delle scadenze e risoluzione della pagina ufficiale del corso — richiedono il deploy su Vercel oppure un ambiente compatibile con funzioni serverless.

## Novità della versione 7

### Ranking QS per materia

Il test **Trova la mia università** usa ora una base locale di posizioni **QS World University Rankings by Subject 2026**, associando ogni corso generale alle materie QS più pertinenti. Per esempio, Economia aziendale combina principalmente *Business & Management Studies* e *Accounting & Finance*. Un ateneo specializzato che non compare nel ranking generale, come Bocconi, può quindi ricevere il punteggio accademico derivante dalle classifiche per materia.

Il file `js/qs-subject-rankings-2026.js` contiene materie, pesi, posizioni o fasce e collegamenti alle pagine QS. La copertura è curata ma non completa per tutti i 99 atenei e tutte le materie. Quando manca un dato QS by Subject, viene mostrato un fallback disciplinare interno con un punteggio più prudente; il sito non lo presenta come dato QS.

### Corsi a distanza esclusi per impostazione predefinita

Oltre agli atenei telematici, anche i singoli corsi indicati come `a distanza` sono esclusi dalla graduatoria iniziale. Due interruttori separati permettono di includere:

- gli atenei telematici e i loro corsi online;
- i corsi a distanza offerti da atenei tradizionali.

### Corrispondenza più precisa del corso

Il confronto tra corso desiderato e corso effettivamente offerto usa quattro livelli:

- corrispondenza esatta: **100 punti**;
- corrispondenza molto vicina: **90–95 punti**;
- stessa classe di laurea ma focus diverso: **75–89 punti**;
- sola appartenenza alla stessa macroarea: **60–74 punti**.

Il punteggio considera titolo, denominazioni equivalenti, parole chiave e classe di laurea. Lo stesso corso generale può quindi ricevere valori diversi in atenei diversi.

### Borse e sostegni più selettivi

Il parametro borse non raggiunge più facilmente 100. L’indice, sempre comparativo e non personale, combina percentuale potenziale di beneficiari, copertura/qualità relativa degli interventi, alloggi, esoneri, sistema regionale, componente legata all’ISEE e sostegni di merito. Il massimo tecnico è limitato e la scheda completa mostra ogni sottopunteggio.

### Calcolo completo e classifica fino a 30 università

Le prime cinque università restano la visualizzazione predefinita. Ogni scheda contiene però il comando **Vedi il calcolo completo**, con punteggio, peso e contributo di ogni parametro, fonti QS e dettaglio dell’indice borse. In fondo è disponibile, chiusa per impostazione predefinita, una classifica sintetica fino alle prime 30 università.

## Novità della versione 6

### Classifica universitaria senza telematiche per impostazione predefinita

Nei risultati di **Trova la mia università**, gli atenei telematici sono esclusi per impostazione predefinita. Un interruttore sopra la classifica permette di includerli immediatamente senza ripetere il questionario. Quando l’interruttore viene attivato, gli atenei telematici entrano nella stessa graduatoria e vengono ordinati con gli stessi criteri delle altre università.

### Nuova interpretazione della geografia

Per pendolarismo si intende esclusivamente una percorrenza stimata entro **90 minuti** con treni regionali o regionali veloci, senza considerare l’alta velocità. Una sede raggiungibile da pendolare non riceve un vantaggio rispetto a una sede che richiede un trasferimento compatibile con le preferenze indicate: le due situazioni hanno lo stesso punteggio geografico.

Restare nella città di residenza mantiene soltanto un piccolo vantaggio. Quando uno stesso ateneo offre più sedi o più corsi affini, il sistema valuta ogni alternativa e sceglie quella con il punteggio complessivo più alto, invece di privilegiare automaticamente il corso con più iscritti.

### Nuovi pesi del risultato

Per sedi fuori dalla città di residenza, il punteggio usa:

- compatibilità del corso: **30%**;
- compatibilità geografica: **18%**;
- ranking: **25%**;
- sostenibilità economica: **18%**;
- lingua: **4%**;
- borse, esoneri e sostegni: **5%**.

Per una sede nella città di residenza, geografia e ranking diventano rispettivamente **20%** e **23%**, mantenendo invariato il totale. La classifica viene ordinata usando il punteggio completo con i decimali; la percentuale arrotondata viene usata soltanto nella visualizzazione.

## Strumenti di orientamento già presenti

### “Trova la mia università” dentro Trova il mio corso

La pagina `trova-corso.html` contiene ora due strumenti accessibili dallo stesso menu:

- **Trova il mio corso**, il questionario già presente;
- **Trova la mia università**, utilizzabile anche senza completare prima il test sul corso.

Dopo il risultato del primo test compare la frase **“Ora che hai trovato il corso adatto a te, trova la tua università”** con il relativo pulsante. Il secondo test può partire dal corso principale appena suggerito oppure da uno qualunque dei corsi ricordati nelle preferenze dell’account. In assenza di preferenze, la prima domanda chiede direttamente un corso generale o una macroarea.

Il questionario universitario considera:

- livello del titolo desiderato;
- regione e città di residenza, con riuso e conferma dei dati già inseriti;
- disponibilità al pendolarismo entro 90 minuti stimati usando soltanto Regionali o Regionali Veloci, senza Alta Velocità;
- disponibilità al trasferimento nella stessa regione, in regioni confinanti o in tutta Italia;
- fascia ISEE, con riuso e conferma quando già disponibile;
- preferenza per corsi in italiano o inglese.

Il risultato mostra per impostazione predefinita cinque atenei in ordine decrescente di affinità, con una classifica sintetica opzionale fino a 30. Le università telematiche e i corsi a distanza sono esclusi per impostazione predefinita e possono essere inclusi con due interruttori distinti sopra la graduatoria. Il punteggio usa: compatibilità del corso 30%, compatibilità geografica 18%, ranking 25%, sostenibilità economica 18%, lingua 4% e borse/sostegni 5%. Quando la sede è nella città di residenza, la geografia passa al 20% e il ranking al 23%, producendo un vantaggio locale lieve. Un pendolarismo regionale entro 90 minuti e un trasferimento compatibile hanno lo stesso valore geografico. Ogni scheda collega alla pagina ufficiale del corso e alla pagina ufficiale o regionale più pertinente per le borse di studio.

Le stime di percorrenza ferroviaria e costo della città sono dichiaratamente dimostrative: non sostituiscono orari, tariffe, affitti o dati ufficiali.


### Nuovo ordinamento della versione 6

- gli atenei telematici non compaiono nella prima graduatoria;
- l’utente può includerli senza ripetere il test;
- la classifica viene ordinata usando il punteggio decimale completo e arrotondata soltanto nella visualizzazione;
- se un ateneo offre più sedi o più corsi coerenti, vengono valutate tutte le alternative e viene scelta quella con il miglior punteggio complessivo;
- Regionali e Regionali Veloci entro 90 minuti e trasferimento compatibile sono equivalenti nel criterio geografico;
- restare nella propria città riceve un vantaggio piccolo, non assoluto.

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
