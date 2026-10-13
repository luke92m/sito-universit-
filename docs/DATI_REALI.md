# Dati reali: borse DSU e tasse per ISEE

Il calcolo «quanto ti costa davvero» (`/borse`, API `/api/real-cost`) usa **solo dati copiati dai documenti ufficiali**. Ogni valore ha accanto la fonte e la data di verifica. Quando un dato manca, il sito lo dice e non lo inventa.

## File

| File | Contenuto | Aggiornamento |
|---|---|---|
| `lib/data/dsu-entities.json` | Enti regionali per il diritto allo studio: soglie ISEE/ISPE, importi della borsa per fascia e condizione, maggiorazioni, rate per le matricole, finestra della domanda, posti e rette degli alloggi, tabelle dei comuni in sede/pendolari | Ogni anno, quando esce il bando (di solito a giugno) |
| `lib/data/tuition-rules.json` | Tasse per ateneo: formula per fascia ISEE, quota fissa, massimo per livello e corsi con importo maggiorato, rate | Ogni anno, con il regolamento tasse dell'ateneo (di solito in primavera-estate) |

La logica è in `lib/domain/dsu.ts`, `lib/domain/tuition.ts` e `lib/domain/real-cost.ts`. I test in `tests/unit/real-data.test.ts` contengono valori controllati a mano sui documenti: se cambiano i dati, vanno aggiornati anche i test.

## Copertura (verificata il 12/10/2026)

- **ER.GO (Emilia-Romagna), bando 2026/27**: Università di Bologna, Ferrara, Modena e Reggio Emilia, Parma. Tabella dei comuni inserita solo per la **sede di Bologna**.
- **Università di Bologna, tasse 2026/27**: formula completa. Corsi a importo maggiorato inseriti per triennali e ciclo unico; per le magistrali c'è solo il massimo base, con un avviso.

## Fonti

- Bando ER.GO 2026/27, Sezione II (artt. 1, 2, 4, 5, 8, 13), tabelle dei comuni e tabelle delle rette: <https://www.er-go.it/cosa-fare-per/bandi-di-concorso/leggi-il-bando>
- Soglie ER.GO 2026/27: <https://www.er-go.it/cosa-fare-per/bandi-di-concorso/soglie-economiche-per-laccesso>
- Posti alloggio ER.GO: comunicato della Regione Emilia-Romagna del 24/06/2026
- UniBo, sistema di calcolo della contribuzione e tabella degli importi massimi 2026/27: <https://www.unibo.it/it/studiare/iscrizioni-tasse-e-altre-procedure/lauree-e-lauree-magistrali/tasse-e-contributi>
- Affitti e spese (stime dichiarate): Immobiliare.it Insights 2026, ISTAT 2024 (già usati dal comparatore)

## Come aggiungere un ente o un ateneo

1. Scarica dal sito ufficiale il bando (o il regolamento tasse) dell'anno in corso.
2. Copia i valori nel JSON con la stessa struttura, indicando `source` (titolo e URL, con articolo o tabella) e `verifiedAt`.
3. Per un ente: aggiungi gli id degli atenei serviti in `universityIds` (devono essere della stessa regione).
4. Aggiungi in `tests/unit/real-data.test.ts` almeno due valori controllati a mano.
5. `npm test` controlla struttura, fonti e coerenza delle soglie.

Per leggere i PDF dei bandi si può usare qualunque estrattore di testo (per esempio `pdftotext`, o la libreria `pdfjs-dist`); le tabelle a più colonne vanno ricontrollate a mano.
