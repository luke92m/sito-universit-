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

## Indice sperimentale di area

Per ordinare gli atenei dentro una macroarea, il prototipo calcola un indice 0–100 con questa formula:

- 30% percentile degli iscritti nell’area;
- 20% percentile del numero di corsi nell’area;
- 40% quota degli iscritti dell’ateneo concentrata nell’area;
- 10% percentile della posizione QS generale, quando presente.

Questo indice:

- non è un ranking accademico ufficiale;
- non misura qualità della didattica o della ricerca;
- non sostituisce QS by Subject, THE by Subject, Censis o altre classifiche;
- serve soltanto alla navigazione del prototipo.

## Comparatore

Sono collegati e mostrati, quando disponibili:

- ranking QS generale;
- tipologia di accesso dichiarata nell’offerta formativa;
- contribuzione media;
- borse ed esoneri censiti;
- mobilità internazionale in entrata e uscita;
- mense, residenze e posti alloggio censiti;
- corsi, classe di laurea, modalità didattica e iscritti.

Restano intenzionalmente da integrare con fonti omogenee e aggiornate:

- ranking europeo per materia o singolo corso;
- lingua principale del corso;
- occupazione entro un anno;
- prosecuzione degli studi entro un anno;
- partner Erasmus e accordi specifici;
- costo della vita e affitto medio per città;
- qualità della vita giovanile;
- vita studentesca e integrazione con il mercato del lavoro locale.

L’interfaccia segnala questi campi come non collegati: non vengono generati valori fittizi.
