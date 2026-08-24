# NOME SITO — prototipo universitario v2

Sito statico multi-pagina in HTML, CSS e JavaScript, senza framework e senza dipendenze esterne. La versione è pronta per una demo locale o per la pubblicazione su Vercel.

## Avvio sul computer

Dalla cartella `sito-universita`:

```bash
python -m http.server 8000
```

Poi apri `http://localhost:8000` nel browser. Puoi anche aprire direttamente `index.html`, ma alcuni browser gestiscono in modo diverso il `localStorage` quando il sito è aperto come file locale.

## Funzioni incluse

- menu principale con `atenei`, `comparison`, `trova il mio corso`, `preparazione`, `scuole e aziende`;
- questionario di orientamento in sei domande;
- suggerimento di corsi generali, non legati a uno specifico ateneo;
- salvataggio facoltativo delle preferenze nel browser;
- comparatore tra due università o due corsi;
- riconoscimento dei tre scenari di confronto tra corsi:
  - stesso corso generale in università diverse;
  - corsi diversi nella stessa università;
  - corsi diversi in università diverse;
- preferenze personali mostrate nel confronto solo quando sono state salvate;
- catalogo di 99 istituti universitari;
- ordinamento alfabetico, filtro regionale, ranking generale QS e filtro per area disciplinare;
- filtro indipendente per università pubbliche, private, telematiche e istituti superiori;
- filtri combinabili, per esempio `private + ranking` oppure `pubbliche + regione`;
- registrazione, accesso e menu profilo condizionale della demo precedente;
- layout responsive per desktop, tablet e smartphone.

## Cambiare il nome del sito

Apri `js/config.js` e sostituisci:

```js
name: 'NOME SITO'
```

## Dati collegati

Il prototipo usa:

- anagrafica degli atenei MUR/USTAT;
- offerta formativa MUR, anno accademico 2024/25;
- iscritti per corso MUR, anno accademico 2024/25;
- contribuzione, esoneri, borse, mobilità e strutture MUR, rilevazione 2025;
- QS World University Rankings 2027 per il ranking generale dell’ateneo.

Il file generato `js/university-courses.js` contiene i dati già aggregati necessari al sito; non servono i CSV sorgente per pubblicare la demo.

### Indice per area disciplinare

Il filtro `Dipartimento` non usa un ranking accademico ufficiale per materia. Mostra un indice sperimentale del prototipo, calcolato usando:

- 30% consistenza degli iscritti nell’area;
- 20% numero di corsi nell’area;
- 40% specializzazione dell’ateneo nell’area;
- 10% posizione nel ranking generale QS, quando disponibile.

Serve a rendere funzionante il filtro e a ordinare i risultati in modo trasparente. Prima di un uso editoriale reale va sostituito o affiancato da una fonte ufficiale/licenziata per materia.

## Dati intenzionalmente non inventati

Alcuni criteri richiesti non sono disponibili in modo uniforme nei dataset già collegati: ranking europeo per singolo corso, lingua di erogazione, occupazione a dodici mesi, prosecuzione degli studi, elenco dei partner Erasmus, affitti e indicatori urbani. Il comparatore mostra chiaramente `Dato non ancora collegato` anziché generare numeri non verificati.

## Autenticazione: limite importante

Questa versione è un prototipo front-end. Gli account e le preferenze vengono salvati nel `localStorage` del singolo browser. Non è un sistema di autenticazione adatto a utenti reali.

Per una versione pubblica servono almeno un backend, un database, autenticazione sicura lato server, recupero password, verifica email, protezioni contro gli abusi, informativa privacy e gestione dei consensi.

## Aggiornamento su GitHub e Vercel

Nel repository già collegato a Vercel, sostituisci i file dentro la cartella esistente `sito-universita`. Non creare una seconda cartella `sito-universita` al suo interno. Dopo il commit, Vercel avvierà automaticamente un nuovo deploy.
