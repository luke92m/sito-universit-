# Dati reali: borse DSU e tasse per ISEE

Il calcolo «quanto ti costa davvero» (`/borse`, API `/api/real-cost`) usa **solo dati copiati dai documenti ufficiali**. Ogni valore ha accanto la fonte e la data di verifica. Quando un dato manca, il sito lo dice e non lo inventa.

## File

| File | Contenuto | Aggiornamento |
|---|---|---|
| `lib/data/dsu-entities.json` | Enti regionali per il diritto allo studio: soglie ISEE/ISPE, importi della borsa per fascia e condizione, maggiorazioni, rate per le matricole, finestra della domanda, posti e rette degli alloggi, tabelle dei comuni in sede/pendolari | Ogni anno, quando esce il bando (di solito a giugno) |
| `lib/data/tuition-rules.json` | Tasse per ateneo: formula per fascia ISEE, quota fissa, massimo per livello e corsi con importo maggiorato, rate | Ogni anno, con il regolamento tasse dell'ateneo (di solito in primavera-estate) |

La logica è in `lib/domain/dsu.ts`, `lib/domain/tuition.ts` e `lib/domain/real-cost.ts`. I test in `tests/unit/real-data.test.ts` contengono valori controllati a mano sui documenti: se cambiano i dati, vanno aggiornati anche i test.

## Copertura (verificata il 12-13/10/2026)


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
| Statale di Milano (Lombardia) | Università degli Studi di Milano | 26.887,93 / 58.452,06 | — (60/90 minuti) |
| Politecnico di Milano (Lombardia) | Politecnico di Milano | 26.887,93 / 58.452,06 | — (60/90 minuti) |

Note sui modelli:
- **Calo lineare**: DiSCo, UniPD e ADISURC riducono la borsa in modo graduale oltre i 2/3 della soglia; il JSON riporta gli importi a inizio fascia e quelli finali indicati dal bando (`endAt`).
- **Servizi gratuiti** (`inKind`): DSU Toscana (mensa e posto alloggio o contributo affitto di 3.150 €), DiSCo (2 pasti al giorno, 600 €), Bicocca (mensa, 829 €). Nel costo reale sono una voce a parte, sottratta come la borsa.
- **Lombardia**: ogni ateneo ha il suo bando e il Politecnico, alla pubblicazione, rimandava gli importi a una delibera regionale successiva. Gli importi sono quelli della delibera regionale n. XII/6298 del 15 giugno 2026, uguali nei tre atenei: il Politecnico li ha pubblicati con l'integrazione al bando del 1° luglio 2026. Solo Bicocca chiede anche **almeno 70/100 alla maturità** per il primo anno. Al Politecnico il fuori sede nelle residenze dell'Ateneo riceve meno denaro più il posto letto: il sito usa l'importo per chi affitta altrove, e lo dice nella nota.

Tasse (2026/27):
- **Università di Bologna**: formula completa. Corsi a importo maggiorato inseriti per triennali e ciclo unico; per le magistrali c'è solo il massimo base, con un avviso.
- **Università di Padova**: no-tax area fino a 30.000 €, due gruppi di corsi (A umanistico fino a 2.790 €, B scientifico fino a 2.990 €), tassa regionale da 146 € a 192 € secondo l'ISEE. Il bando dà solo gli estremi delle fasce: tra gli estremi il sito stima un andamento lineare e lo dichiara. Il gruppo è dedotto dalla macroarea del corso.
- **Università di Torino**: per le matricole e gli studenti con i crediti minimi niente contributo fino a 26.000 €, poi due formule lineari dell'art. 3.1 (1.025 € a 40.000 €, 2.785 € a 85.000 €); oltre 85.000 € o senza ISEE 2.840 €. Prima rata fissa di 156 €. Le quote in più di alcuni corsi (Business & Management, MICA, Conservazione e restauro) sono solo nella nota.
- **Politecnico di Torino**: regolamento per chi si immatricola dal 2025/26 (e per le magistrali). No-tax area fino a 30.000 €, poi una formula quadratica dell'Appendice (circa 600 € a 30.000 €, 3.600 € a 100.000 €), con il termine quadratico nel campo `square`. Stesso massimo per tutti i corsi. Prima rata di 161 € con 5 € di assicurazione. La riduzione richiede anche ISPE fino a 210.000 € (non controllato dal calcolo, indicato nella nota).
- **Università di Firenze**: tabella dell'Allegato 1 del Manifesto per le matricole a tempo pieno, a fasce di ISEE con importo fisso (niente formula): 0 € fino a 24.000 €, poi da 350 € fino a 2.744 € oltre 90.000 €. Le 72 fasce sono state estratte dal PDF con uno script che controlla che prima e seconda rata diano il totale; le fasce consecutive con lo stesso importo sono unite. Per gli anni successivi valgono altre tabelle (Allegati 2 e 3), non ancora inserite.
- **Federico II**: contributo agevolato delle matricole. La guida 2026/27 dà solo gli estremi (esonero fino a 30.000 €, 1.011,50 € appena sopra, massimo 2.384 €); le formule per fascia sono prese dal calcolatore ufficiale (calcolatrice.unina.it, v1.8.1): 7% dell'ISEE oltre 13.000 € con uno sconto dal 15% allo 0% tra 30.000 e 34.000 € (termine quadratico), poi tratti lineari fino a 80.000 €. Il modello coincide con il calcolatore entro 0,07 €. Tassa regionale campana da 130 € a 173 € secondo l'ISEE (`regionalTaxBands`).
- **Milano-Bicocca**: formula del Regolamento (art. 4) per le matricole, che sono tutte «meritevoli» (−13%): (ISEE/1000)² × k × R × 0,87, con k = 0,5937 (area A) o 0,7125 (area B) e R = min[1; (ISEE − 30.000)/500]. La guida scrive per errore «30.500»: fa fede il Regolamento. Tra 30.000 e 30.500 € la formula è cubica e il sito la rappresenta con il termine quadratico (scarto massimo 0,16 €). Le aree non coincidono con le macroaree: l'area A è assegnata anche per nome, seguendo l'Appendice 1 della guida. Tassa regionale lombarda da 130 € a 190 € secondo l'ISEE.
- **Università di Pisa**: tabella dell'art. 1.2.2 del Regolamento, colonna «studente regolare» (comprese le matricole): 0 € fino a 26.000 €, poi fasce da 1.000 € fino a 2.900 € oltre 99.000 € o senza ISEE. 75 fasce estratte dal PDF con controllo di continuità. Riduzione d'ufficio per i fuori sede (oltre un'ora di mezzi pubblici): 15% di (2.900 € − contributo), nel campo `offSiteReduction`; il calcolo la applica ai fuori sede e, come possibilità, ai pendolari. La riduzione per merito (150 € con almeno 95/100) è solo nella nota.
- **Statale di Milano**: seconda rata dell'art. 3.2 per gli studenti in corso, matricole comprese: no-tax area fino a 30.000 €, poi 3% di (ISEE − 25.000) fino a 38.000 € e 390 € + 6,7% di (ISEE − 38.000) fino a 80.000 €. Area A fino a 3.204 €, area B × 1,28 fino a 4.101,12 €. L'area A è un elenco chiuso di corsi (Allegato 1): il sito la assegna per **nome esatto** (campo `names` dei gruppi), perché alcuni nomi dell'area A sono contenuti in nomi di corsi dell'area B. Tassa regionale da 130 € a 190 €.
- **Politecnico di Milano**: per le matricole esonero fino a 22.000 €, poi le tre formule della tabella 4.2 fino a 30.000 € (circa 1.071 €), poi le otto fasce delle tabelle 1 e 2 fino al contributo pieno di 3.726 € oltre 95.000 €. Vale per un piano da 46 a 74 CFU (100%). Le date delle rate sono nel calendario accademico, non nel regolamento.
- **Sapienza**: due gruppi contributivi per Facoltà (I fino a 2.821 €, II fino a 2.924 €). Esonero fino a 24.000 €, poi le riduzioni del D.M. 1014/2021 (art. 44) fino a 28.041,10 € e infine le curve di ateneo: retta fino a 40.000 €, parabola fino a 60.000 €, esponenziale fino a 100.000 € (campi `square` ed `exp` delle fasce). Parametri dal documento «Criteri per il calcolo degli importi in base al valore ISEE», che ridà gli importi ordinari 2026/27. Il gruppo è dedotto dalla macroarea del corso.

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
- Statale di Milano, Bando borse regionali 2026/27: <https://www.unimi.it/sites/default/files/2026-07/Bando_Borse_regionali%202026-27_IT_1.pdf>
- Politecnico di Milano, Bando DSU 2026/27 e integrazione con gli importi: <https://www.polimi.it/fileadmin/user_upload/studenti/tasse-borse-agevolazioni-economiche/dsu/bando_2026-2027/Bando_Benefici_DSU_2026-2027.pdf>, <https://www.polimi.it/fileadmin/user_upload/studenti/tasse-borse-agevolazioni-economiche/dsu/bando_2026-2027/Bando_integrativo_DSU_aa_26_27_.pdf>
- UniTo, Regolamento tasse e contributi 2026/27 (D.R. 6194/2026): <https://en.unito.it/sites/sten/files/document/2026-07/reg_tasse_2026_2027_dr_6194_2026.pdf>
- PoliTo, Regolamento contribuzione 2026/27 per immatricolati dal 2025/26 e lauree magistrali: <https://www.polito.it/sites/default/files/2026-07/Regolamento%20L%20imma%2025_26%20%2B%20LM_LS.pdf>
- UniFI, Manifesto degli Studi 2026/27 (§ 13 e Allegato 1): <https://www.unifi.it/sites/default/files/2026-06/manifesto_studi_26_27.pdf>
- Federico II, Guida all'iscrizione 2026/27 (10/7/2026) e calcolatore tasse: <https://www.unina.it/documents/d/guest/guida_studente_rapida_26-27_10-7-2026>, <http://calcolatrice.unina.it>
- Milano-Bicocca, Regolamento contribuzione 2026/27 e Guida alla contribuzione (agosto 2026): <https://www.unimib.it/sites/default/files/2026-07/Regolamento%20in%20materia%20di%20contribuzione%20universitaria%202026_2027.pdf>, <https://www.unimib.it/sites/default/files/2026-08/01_Guida%20CONTRIBUZIONE%2026_27.pdf>
- UniPi, Regolamento contribuzione studentesca 2026/27: <https://www.unipi.it/wp-content/uploads/Regolamento_tasse_2026_2027-2.pdf>
- Statale di Milano, Regolamento tasse e contributi 2026/27: <https://www.unimi.it/sites/default/files/regolamenti/Regolamento%20tasse%20e%20contributi%202026_2027_signed.pdf>
- Politecnico di Milano, Regolamento contribuzione studentesca 2026/27: <https://www.normativa.polimi.it/fileadmin/user_upload/regolamenti/studenti/D.r._regolamento_contribuzione_studentesca_2026-2027.pdf>
- Sapienza, Regolamento studenti 2026/27, artt. 38-44, e criteri di calcolo per ISEE: <https://www.uniroma1.it/it/content/isee-il-diritto-allo-studio-universitario-e-meriti-di-studio>, <https://www.uniroma1.it/sites/default/files/field_file_allegati/calcolo_importi_isee.pdf>
- UniBo, sistema di calcolo della contribuzione e tabella degli importi massimi 2026/27: <https://www.unibo.it/it/studiare/iscrizioni-tasse-e-altre-procedure/lauree-e-lauree-magistrali/tasse-e-contributi>
- Affitti e spese (stime dichiarate): Immobiliare.it Insights 2026, ISTAT 2024 (già usati dal comparatore)

## Come aggiungere un ente o un ateneo

1. Scarica dal sito ufficiale il bando (o il regolamento tasse) dell'anno in corso.
2. Copia i valori nel JSON con la stessa struttura, indicando `source` (titolo e URL, con articolo o tabella) e `verifiedAt`.
3. Per un ente: aggiungi gli id degli atenei serviti in `universityIds` (devono essere della stessa regione).
4. Aggiungi in `tests/unit/real-data.test.ts` almeno due valori controllati a mano.
5. `npm test` controlla struttura, fonti e coerenza delle soglie.

Per leggere i PDF dei bandi si può usare qualunque estrattore di testo (per esempio `pdftotext`, o la libreria `pdfjs-dist`); le tabelle a più colonne vanno ricontrollate a mano.
