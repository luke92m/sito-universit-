# NOME SITO — prototipo universitario

Prototipo multi-pagina in HTML, CSS e JavaScript, senza framework e senza dipendenze esterne.

## Avvio

Il modo consigliato è servire la cartella con un piccolo server locale, così registrazione e accesso restano disponibili passando da una pagina all'altra.

```bash
python -m http.server 8000
```

Poi apri `http://localhost:8000` nel browser.

In alternativa puoi aprire direttamente `index.html`, ma alcuni browser isolano i dati `localStorage` tra file locali.

## Funzioni incluse

- menu principale con `atenei`, `comparison`, `preparazione`, `scuole e aziende`;
- homepage con hero e sezione `Chi siamo?` pronta per il testo futuro;
- registrazione con email, password e situazione personale;
- accesso con le credenziali create nella demo;
- menu profilo condizionale per studenti e futuri studenti;
- voci `borse di studio`, `scadenze`, `community`, `accompagnamento`, `libri usati`;
- catalogo di 99 istituti universitari;
- ordinamento alfabetico, filtro regionale e ordinamento QS 2027;
- ricerca per nome, città, regione e tipologia;
- layout responsive per desktop, tablet e smartphone.

## Cambiare il nome del sito

Apri `js/config.js` e sostituisci:

```js
name: 'NOME SITO'
```

## Autenticazione: limite importante

Questa versione è un prototipo front-end. Gli account sono salvati nel `localStorage` del browser e la password viene trasformata in un hash locale. Non è un sistema adatto alla pubblicazione.

Per una versione reale servono almeno:

- un database;
- un backend o un servizio di autenticazione;
- password gestite con algoritmi dedicati lato server;
- recupero password, verifica email e protezioni contro gli abusi;
- informativa privacy, gestione consensi e termini d'uso.

## Dati

- anagrafica: Open Data USTAT del Ministero dell'Università e della Ricerca, risorsa `Atenei`;
- ranking: QS World University Rankings 2027, pubblicata il 18 giugno 2026;
- gli atenei non presenti nel QS 2027 sono indicati come `n.d.`.

La cartella `data` contiene anche il file JSON leggibile con le 99 voci usate dal prototipo.
