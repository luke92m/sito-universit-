# Note sui dati del prototipo

## Catalogo degli atenei

Il catalogo contiene 99 istituti universitari italiani e distingue internamente:

- università statali e politecnici statali;
- università non statali;
- università telematiche;
- istituti superiori a ordinamento speciale.

Nelle schede è mostrata una sola etichetta di tipologia. La dicitura originaria `Scuola superiore` dell’anagrafica viene presentata nell’interfaccia come `Istituto superiore`.

La base anagrafica deriva dalla risorsa USTAT `Atenei`. Per il catalogo dimostrativo da 99 voci della prima versione erano state escluse due entità trattate separatamente dal progetto: Istituto Mario Negri e Centro Alti Studi per la Difesa. Prima di una pubblicazione definitiva va verificata nuovamente la perimetrazione editoriale desiderata.

## Ranking generale

Il campo `qsRank` deriva dalla QS World University Rankings 2027. Gli istituti non presenti sono mostrati come `n.d.`. Il ranking generale non deve essere interpretato come ranking di un singolo corso o dipartimento.

## Corsi e aree disciplinari

`js/university-courses.js` aggrega:

- offerta formativa MUR 2024/25;
- iscritti per corso MUR 2024/25;
- contribuzione e interventi degli atenei, rilevazione MUR 2025.

Il dataset del sito include 5.833 offerte di corso collegate a 92 istituzioni del catalogo. Le istituzioni senza corsi collegati restano comunque visibili nella sezione Atenei.

Le aree disciplinari usate nel filtro sono raggruppamenti editoriali costruiti dalle classi di laurea e dai campi MUR. Il termine `Dipartimento` è usato nell’interfaccia per essere comprensibile, ma il filtro rappresenta una macroarea disciplinare e non l’organigramma ufficiale dei dipartimenti di ciascun ateneo.

## Ranking ufficiali e fallback CENSIS — versione 8

Il catalogo, il test sull’università e il comparatore non usano più un indice interno come ranking. La priorità è:

1. QS by Subject per una materia o un corso;
2. CENSIS della didattica per livello e raggruppamento disciplinare, quando collegato;
3. CENSIS generale nella categoria omogenea dell’ateneo;
4. ranking ufficiale non disponibile.

Il CENSIS generale confronta atenei divisi per dimensione e tipologia e non rappresenta una graduatoria unica di tutte le università italiane. Le graduatorie della didattica considerano progressione di carriera e rapporti internazionali. QS e CENSIS non sono metodologicamente equivalenti: la gerarchia tecnica del sito è una scelta editoriale di ordinamento, non una prova scientifica che l’assenza da QS renda automaticamente un ateneo peggiore.

## Comparatore — versione 8

Sono collegati:

- QS by Subject 2026 e QS generale 2027;
- CENSIS 2026/2027 della didattica e degli atenei;
- MUR per corsi, accesso, iscritti, contribuzione, esoneri, borse, mobilità e strutture;
- ISTAT per la spesa media territoriale;
- Immobiliare.it Insights 2026 per le stanze singole;
- Il Sole 24 Ore 2025 per la qualità della vita dei giovani.

Le percentuali di occupazione o prosecuzione a 12 mesi del singolo corso non sono disponibili in forma omogenea per ogni corso del catalogo. Il sito non le inventa: mostra l’indicatore CENSIS di occupabilità dell’ateneo, il CENSIS della didattica o un collegamento diretto alla scheda ufficiale/AlmaLaurea, specificando che si tratta di un proxy e non della percentuale del corso.

La stima mensile della vita studentesca combina il canone di una camera singola con una quota dichiarata della spesa familiare media della ripartizione ISTAT. È un indicatore comparativo trasparente, non un preventivo individuale.

## Borse di studio — versione 3

La verifica usa come riferimento orientativo i limiti massimi nazionali ISEE e ISPE indicati per l’a.a. 2026/27 nel file `js/student-services-data.js`.

L’esito non rappresenta idoneità ufficiale perché ogni bando può aggiungere o modificare:

- soglie effettive;
- requisiti di merito;
- definizione di studente in sede, pendolare o fuori sede;
- incompatibilità e documenti;
- termini e modalità di presentazione.

I link regionali e di ateneo sono punti di partenza. Prima della pubblicazione definitiva devono essere verificati periodicamente e, dove possibile, sostituiti con la pagina precisa del bando corrente.

## Preparazione ai test — versione 3

Le 45 domande presenti in `js/student-services-data.js` sono originali e fisse. Non sono quesiti ufficiali CISIA e non riproducono banche dati protette. Le macroaree vengono associate in modo orientativo alle famiglie TOLC; struttura, sezioni, tempi, penalità e soglie devono essere controllati sul portale CISIA e nel bando del corso.

## Burocrazia — versione 3

La pagina utilizza la tipologia di accesso e i dati aggregati già disponibili nel dataset. Non determina automaticamente requisiti correnti, uso della media scolastica, documenti specifici o scadenze. Per questi elementi il prototipo genera una checklist e conduce l’utente verso le fonti ufficiali senza inventare dati mancanti.

## Scadenze automatiche — versione 4

La funzione `api/deadlines.js` non contiene un calendario nazionale precompilato. Analizza, al momento della richiesta e con cache serverless, pagine pubbliche del dominio ufficiale dell’ateneo e del portale regionale per il diritto allo studio. Cerca espressioni di data vicine a termini relativi a immatricolazioni, test, rate, borse, esami e procedure.

Il risultato è un rilevamento automatico e non una certificazione. Può:

- non trovare una data pubblicata in aree riservate o documenti non indicizzati;
- interpretare una data che riguarda una diversa categoria di studenti;
- smettere di funzionare se la struttura del sito cambia;
- ripiegare su un messaggio senza risultati invece di generare valori fittizi.

Ogni evento conserva il collegamento alla pagina sorgente, che prevale sempre sull’interpretazione del prototipo.

## Collegamento alla pagina del corso — versione 4

`api/course-link.js` analizza sitemap e pagine del dominio ufficiale dell’ateneo, assegna un punteggio in base a nome del corso, classe, titolo e contenuto e reindirizza alla migliore corrispondenza. Se non emerge una pagina abbastanza affidabile, usa il catalogo ufficiale dei corsi o la homepage dell’ateneo. Non utilizza un motore di ricerca esterno.

## Selettori di ateneo — versione 4

I selettori HTML restano presenti per compatibilità, ma l’interfaccia li trasforma in combobox ricercabili. Il filtro privilegia l’inizio del nome dell’istituzione e mantiene una ricerca di riserva per parole interne.

## Trova la mia università — versione 7

Il secondo questionario della pagina `trova-corso.html` mostra cinque atenei come risultato principale e offre, su richiesta, una classifica sintetica fino a 30 atenei. Usa soltanto università che presentano nel dataset un corso o una macroarea coerente con la scelta e con il livello di laurea indicato.

Il punteggio combina:

- 30% coerenza tra corso richiesto e offerta formativa MUR collegata;
- 18% compatibilità geografica, elevata al 20% quando la sede è nella città di residenza;
- 25% ranking disponibile, ridotto al 23% quando la sede è nella città di residenza;
- 18% sostenibilità economica orientativa;
- 4% compatibilità linguistica ricavabile dal titolo del corso;
- 5% presenza relativa di borse, esoneri e sostegni nel dataset MUR.


La versione 7 applica inoltre queste regole:

- le università telematiche sono escluse dalla graduatoria iniziale e vengono incluse soltanto su scelta esplicita dell’utente;
- i corsi indicati come a distanza sono esclusi per impostazione predefinita; un secondo interruttore li include senza ripetere il test;
- una soluzione pendolare ammessa e un trasferimento compatibile ricevono lo stesso punteggio geografico;
- la sede nella città di residenza riceve un vantaggio lieve attraverso il diverso bilanciamento tra geografia e ranking;
- l’ordinamento usa il punteggio non arrotondato;
- quando lo stesso ateneo offre più sedi o corsi compatibili, il sistema valuta tutte le combinazioni e seleziona quella con il punteggio complessivo migliore.

### Ranking QS per materia

Il file `js/qs-subject-rankings-2026.js` collega i corsi generali del questionario alle materie pertinenti del **QS World University Rankings by Subject 2026**. Quando un corso richiede più materie, il punteggio è una media pesata dei dati disponibili e la scheda mostra posizione o fascia QS, peso relativo e collegamento alla fonte. Per esempio, Economia aziendale usa principalmente *Business & Management Studies* e *Accounting & Finance*.

La copertura locale è curata ma non completa per tutte le combinazioni corso–ateneo. Quando non è presente una posizione QS by Subject, il test usa il CENSIS della didattica collegato; in assenza anche di quello usa il CENSIS generale nella categoria omogenea dell’ateneo. Se nessuna classifica ufficiale è disponibile, lo dichiara senza creare un indice interno.

Le posizioni QS sono uno snapshot 2026, non un feed in tempo reale. Per aggiornamenti automatici servirebbero una fonte autorizzata, un processo periodico di sincronizzazione e controlli editoriali.

### Corrispondenza del corso

La corrispondenza tra corso desiderato e offerta MUR viene classificata così:

- 100: titolo coincidente o denominazione pienamente equivalente;
- 90–95: titolo molto vicino, classe coerente e focus aggiuntivo;
- 75–89: stessa classe di laurea, ma focus differente;
- 60–74: sola appartenenza alla stessa macroarea.

Il punteggio usa titolo, alias, parole chiave e classe di laurea.

### Indice borse e sostegni

Il parametro borse è un indice comparativo, non una verifica di idoneità. Combina:

- quota potenziale di beneficiari rispetto agli studenti;
- copertura/qualità relativa degli interventi presenti nei dati aggregati;
- alloggi assegnati, contributi alloggio e posti disponibili;
- esoneri totali e parziali;
- presenza del sistema regionale per il diritto allo studio;
- componente collegata alla fascia ISEE;
- proxy di sostegni legati al merito.

Alcune categorie possono sovrapporsi e i dati non descrivono importi, requisiti o qualità individuale delle borse. Il punteggio è normalizzato rispetto agli altri atenei e limitato sotto 100 per evitare falsi punteggi pieni.

### Pendolarismo

La soglia di 90 minuti non viene calcolata attraverso un sistema ferroviario o gli orari reali. Il prototipo:

- usa coordinate indicative di città universitarie, principali capoluoghi e centri regionali;
- calcola la distanza geografica;
- applica un coefficiente di percorso e una velocità media compatibile con Regionali e Regionali Veloci;
- non considera treni ad Alta Velocità nel significato attribuito al pendolarismo;
- esclude i collegamenti tra isole e altre regioni dalla logica pendolare.

È quindi una stima utile soltanto a ordinare le opzioni. Cambi, frequenza, stazione di partenza, lavori, tempi a piedi e orari effettivi devono essere controllati separatamente.

### Costi

Per la Comparison i canoni delle stanze provengono da Immobiliare.it Insights 2026 e il contesto di spesa da ISTAT 2024. Il test “Trova la mia università” conserva alcune stime editoriali di città come indicatore orientativo: prima di una decisione economica vanno sempre verificati canoni reali, trasporti e spese personali.

La fascia ISEE non viene interpretata come reddito disponibile. Aumenta o riduce soltanto la sensibilità del punteggio al costo complessivo e attiva l’avvertenza di verificare borse ed esoneri.

### Lingua

Il dataset MUR collegato non contiene un campo linguistico completo. La lingua viene inferita dal titolo del corso quando possibile; ogni scheda invita a confermarla sulla pagina ufficiale.

## Collegamento alle borse — versione 5

`api/scholarship-link.js` cerca pagine relative a borse, diritto allo studio, agevolazioni, esoneri e benefici nel dominio ufficiale dell’ateneo. Quando non emerge una pagina abbastanza pertinente, prova il portale regionale competente e infine usa il relativo punto di ingresso ufficiale. Il collegamento deve comunque essere verificato periodicamente perché sitemap e pagine possono cambiare.
