# Dati reali: borse DSU e tasse per ISEE

Il calcolo «quanto ti costa davvero» (`/borse`, API `/api/real-cost`) usa **solo dati copiati dai documenti ufficiali**. Ogni valore ha accanto la fonte e la data di verifica. Quando un dato manca, il sito lo dice e non lo inventa.

## File

| File | Contenuto | Aggiornamento |
|---|---|---|
| `lib/data/dsu-entities.json` | Enti regionali per il diritto allo studio: soglie ISEE/ISPE, importi della borsa per fascia e condizione, maggiorazioni, rate per le matricole, finestra della domanda, posti e rette degli alloggi, tabelle dei comuni in sede/pendolari | Ogni anno, quando esce il bando (di solito a giugno) |
| `lib/data/tuition-rules.json` | Tasse per ateneo: formula per fascia ISEE, quota fissa, massimo per livello e corsi con importo maggiorato, rate | Ogni anno, con il regolamento tasse dell'ateneo (di solito in primavera-estate) |

La logica è in `lib/domain/dsu.ts`, `lib/domain/tuition.ts` e `lib/domain/real-cost.ts`. I test in `tests/unit/real-data.test.ts` contengono valori controllati a mano sui documenti: se cambiano i dati, vanno aggiornati anche i test.

## Copertura (verificata il 12/10/2026)


Borse (bandi 2026/27):

| Ente | Atenei | Soglie ISEE / ISPE | Elenchi dei comuni |
|---|---|---|---|
| ER.GO (Emilia-Romagna) | Bologna, Ferrara, Modena e Reggio Emilia, Parma | 25.000 / 50.000 | in sede e pendolari per Bologna |
| DiSCo Lazio | Sapienza, Tor Vergata, Roma Tre, Foro Italico, Cassino, Tuscia | 28.339,88 / 61.608,48 | pendolari per Roma (Allegato B) |
| EDISU Piemonte | Torino, Politecnico di Torino, Piemonte Orientale | 26.306,25 / 57.187,53 | in sede = stesso comune |
| DSU Toscana | Firenze, Pisa, Siena, Stranieri di Siena | 27.000 / 60.000 | in sede per Firenze, Pisa, Siena |
| Università di Padova (borse regionali) | Padova | 26.306,25 / 43.125,94 | — (40/80 km o minuti) |
| ADISURC (Campania) | Federico II, Parthenope, L'Orientale, Vanvitelli, Salerno, Sannio | 25.500 / 54.000 | in sede per Napoli e Fisciano |
| Milano-Bicocca (Lombardia) | Milano-Bicocca | 26.887,93 / 58.452,06 | — (60/90 minuti) |

Note sui modelli:
- **Calo lineare**: DiSCo, UniPD e ADISURC riducono la borsa in modo graduale oltre i 2/3 della soglia; il JSON riporta gli importi a inizio fascia e quelli finali indicati dal bando (`endAt`).
- **Servizi gratuiti** (`inKind`): DSU Toscana (mensa e posto alloggio o contributo affitto di 3.150 €), DiSCo (2 pasti al giorno, 600 €), Bicocca (mensa, 829 €). Nel costo reale sono una voce a parte, sottratta come la borsa.
- **Lombardia**: ogni ateneo ha il suo bando e il Politecnico, alla pubblicazione, rimandava gli importi a una delibera regionale successiva. Per ora c'è solo Bicocca, che chiede anche **almeno 70/100 alla maturità** per il primo anno.

Tasse (2026/27):
- **Università di Bologna**: formula completa. Corsi a importo maggiorato inseriti per triennali e ciclo unico; per le magistrali c'è solo il massimo base, con un avviso.
- **Università di Padova**: no-tax area fino a 30.000 €, due gruppi di corsi (A umanistico fino a 2.790 €, B scientifico fino a 2.990 €), tassa regionale da 146 € a 192 € secondo l'ISEE. Il bando dà solo gli estremi delle fasce: tra gli estremi il sito stima un andamento lineare e lo dichiara. Il gruppo è dedotto dalla macroarea del corso.

## Fonti

- Bando ER.GO 2026/27, Sezione II (artt. 1, 2, 4, 5, 8, 13), tabelle dei comuni e tabelle delle rette: <https://www.er-go.it/cosa-fare-per/bandi-di-concorso/leggi-il-bando>
- Soglie ER.GO 2026/27: <https://www.er-go.it/cosa-fare-per/bandi-di-concorso/soglie-economiche-per-laccesso>
- Posti alloggio ER.GO: comunicato della Regione Emilia-Romagna del 24/06/2026
- Bando DiSCo Lazio 2026/27 e allegati B (pendolari) e I (costo alloggi): <https://laziodisco.it/bando-diritto-allo-studio-2026-2027/>
- Bando EDISU Piemonte 2026/27 e scadenziario: <https://www.edisu.piemonte.it/borse-e-contributi/benefici-economici/borsa-di-studio>
- Bando DSU Toscana 2026/27: <https://www.dsu.toscana.it/borsa-di-studio>
- UniPD, bando borse regionali e bando contribuzione ed esoneri 2026/27: <https://www.unipd.it/borse-studio-regionali>, <https://www.unipd.it/contribuzione-studentesca>
- Bando ADISURC 2026/27: <https://www.adisurcampania.it/notizie/approvazione-bando-di-concorso-20262027>
- Bando diritto allo studio Milano-Bicocca 2026/27: <https://www.unimib.it/sites/default/files/2026-07/bando-DSU-2026-27%20def_2.pdf>
- UniBo, sistema di calcolo della contribuzione e tabella degli importi massimi 2026/27: <https://www.unibo.it/it/studiare/iscrizioni-tasse-e-altre-procedure/lauree-e-lauree-magistrali/tasse-e-contributi>
- Affitti e spese (stime dichiarate): Immobiliare.it Insights 2026, ISTAT 2024 (già usati dal comparatore)

## Come aggiungere un ente o un ateneo

1. Scarica dal sito ufficiale il bando (o il regolamento tasse) dell'anno in corso.
2. Copia i valori nel JSON con la stessa struttura, indicando `source` (titolo e URL, con articolo o tabella) e `verifiedAt`.
3. Per un ente: aggiungi gli id degli atenei serviti in `universityIds` (devono essere della stessa regione).
4. Aggiungi in `tests/unit/real-data.test.ts` almeno due valori controllati a mano.
5. `npm test` controlla struttura, fonti e coerenza delle soglie.

Per leggere i PDF dei bandi si può usare qualunque estrattore di testo (per esempio `pdftotext`, o la libreria `pdfjs-dist`); le tabelle a più colonne vanno ricontrollate a mano.
