(() => {
  'use strict';

  const iseeLimit = 28339.88;
  const ispeLimit = 61608.48;

  const OFFICIAL_DOMAINS = {
    'ateneo-06603': 'https://www.gssi.it/',
    'ateneo-01510': 'https://www.hunimed.eu/',
    'ateneo-01802': 'https://www.iusspavia.it/',
    'ateneo-05803': 'https://www.lumsa.it/',
    'ateneo-07203': 'https://www.lum.it/',
    'ateneo-08601': 'https://unikore.it/',
    'ateneo-02101': 'https://www.unibz.it/',
    'ateneo-01505': 'https://www.iulm.it/',
    'ateneo-01508': 'https://www.unisr.it/',
    'ateneo-05817': 'https://www.unilink.it/',
    'ateneo-05805': 'https://www.luiss.it/',
    'ateneo-07202': 'https://www.poliba.it/',
    'ateneo-01502': 'https://www.polimi.it/',
    'ateneo-00102': 'https://www.polito.it/',
    'ateneo-05818': 'https://www.unicamillus.org/',
    'ateneo-04601': 'https://www.imtlucca.it/',
    'ateneo-06308': 'https://www.ssmeridionale.it/',
    'ateneo-03202': 'https://www.sissa.it/',
    'ateneo-05002': 'https://www.sns.it/',
    'ateneo-05003': 'https://www.santannapisa.it/',
    'ateneo-05814': 'https://www.unimercatorum.it/',
    'ateneo-01201': 'https://www.liuc.it/',
    'ateneo-02701': 'https://www.unive.it/',
    'ateneo-05808': 'https://www.unicampus.it/',
    'ateneo-01504': 'https://www.unicatt.it/',
    'ateneo-05812': 'https://www.universitaeuropeadiroma.it/',
    'ateneo-02702': 'https://www.iuav.it/',
    'ateneo-04201': 'https://www.univpm.it/',
    'ateneo-01503': 'https://www.unibocconi.it/',
    'ateneo-05809': 'https://www.unint.eu/',
    'ateneo-06201': 'https://www.unisannio.it/',
    'ateneo-05601': 'https://www.unitus.it/',
    'ateneo-06001': 'https://www.unicas.it/',
    'ateneo-04101': 'https://www.uniurb.it/',
    'ateneo-06901': 'https://www.unich.it/',
    'ateneo-06303': 'https://www.unior.it/',
    'ateneo-08001': 'https://www.unirc.it/',
    'ateneo-05807': 'https://www.uniroma3.it/',
    'ateneo-06304': 'https://www.unisob.na.it/',
    'ateneo-07001': 'https://www.unimol.it/',
    'ateneo-00201': 'https://www.uniupo.it/',
    'ateneo-01202': 'https://www.uninsubria.it/',
    'ateneo-07601': 'https://portale.unibas.it/',
    'ateneo-06306': 'https://www.unicampania.it/',
    'ateneo-07201': 'https://www.uniba.it/',
    'ateneo-01601': 'https://www.unibg.it/',
    'ateneo-03701': 'https://www.unibo.it/',
    'ateneo-01701': 'https://www.unibs.it/',
    'ateneo-09201': 'https://www.unica.it/',
    'ateneo-04302': 'https://www.unicam.it/',
    'ateneo-08701': 'https://www.unict.it/',
    'ateneo-07901': 'https://web.unicz.it/',
    'ateneo-03801': 'https://www.unife.it/',
    'ateneo-04801': 'https://www.unifi.it/',
    'ateneo-07101': 'https://www.unifg.it/',
    'ateneo-01001': 'https://unige.it/',
    'ateneo-06601': 'https://www.univaq.it/',
    'ateneo-04301': 'https://www.unimc.it/',
    'ateneo-08301': 'https://www.unime.it/',
    'ateneo-01501': 'https://www.unimi.it/',
    'ateneo-01509': 'https://www.unimib.it/',
    'ateneo-03601': 'https://www.unimore.it/',
    'ateneo-06302': 'https://www.uniparthenope.it/',
    'ateneo-06301': 'https://www.unina.it/',
    'ateneo-02801': 'https://www.unipd.it/',
    'ateneo-08201': 'https://www.unipa.it/',
    'ateneo-03401': 'https://www.unipr.it/',
    'ateneo-01801': 'https://portale.unipv.it/',
    'ateneo-05401': 'https://www.unipg.it/',
    'ateneo-05806': 'https://www.uniroma4.it/',
    'ateneo-05801': 'https://www.uniroma1.it/',
    'ateneo-05802': 'https://web.uniroma2.it/',
    'ateneo-06501': 'https://www.unisa.it/',
    'ateneo-09001': 'https://www.uniss.it/',
    'ateneo-05201': 'https://www.unisi.it/',
    'ateneo-06701': 'https://www.unite.it/',
    'ateneo-00101': 'https://www.unito.it/',
    'ateneo-02201': 'https://www.unitn.it/',
    'ateneo-03201': 'https://www.units.it/',
    'ateneo-03001': 'https://www.uniud.it/',
    'ateneo-02301': 'https://www.univr.it/',
    'ateneo-07501': 'https://www.unisalento.it/',
    'ateneo-07801': 'https://www.unical.it/',
    'ateneo-00701': 'https://www.univda.it/',
    'ateneo-05001': 'https://www.unipi.it/',
    'ateneo-00401': 'https://www.unisg.it/',
    'ateneo-08003': 'https://www.unistrada.it/',
    'ateneo-05403': 'https://www.unistrapg.it/',
    'ateneo-05202': 'https://www.unistrasi.it/',
    'ateneo-06202': 'https://www.unifortunato.eu/',
    'ateneo-04804': 'https://www.iuline.it/',
    'ateneo-06307': 'https://www.unipegaso.it/',
    'ateneo-05816': 'https://www.uniroma5.it/',
    'ateneo-01301': 'https://www.uniecampus.it/',
    'ateneo-05810': 'https://www.unimarconi.it/',
    'ateneo-05815': 'https://www.unicusano.it/',
    'ateneo-05811': 'https://www.unitelmasapienza.it/',
    'ateneo-05813': 'https://www.uninettunouniversity.net/',
    'ateneo-06902': 'https://www.unidav.it/'
  };

  const REGIONAL_PORTALS = {
    Abruzzo: { name: 'Diritto allo studio Abruzzo', url: 'https://www.regione.abruzzo.it/content/diritto-allo-studio-universitario' },
    Basilicata: { name: 'ARDSU Basilicata', url: 'https://www.ardsubasilicata.it/' },
    Calabria: { name: 'Regione Calabria — diritto allo studio', url: 'https://www.regione.calabria.it/' },
    Campania: { name: 'ADISURC Campania', url: 'https://www.adisurcampania.it/' },
    'Emilia-Romagna': { name: 'ER.GO', url: 'https://www.er-go.it/' },
    'Friuli-Venezia Giulia': { name: 'ARDiS FVG', url: 'https://www.ardis.fvg.it/' },
    Lazio: { name: 'DiSCo Lazio', url: 'https://www.laziodisco.it/' },
    Liguria: { name: 'ALiSEO Liguria', url: 'https://www.aliseo.liguria.it/' },
    Lombardia: { name: 'Regione Lombardia — università', url: 'https://www.regione.lombardia.it/' },
    Marche: { name: 'ERDIS Marche', url: 'https://erdis.it/' },
    Molise: { name: 'Università del Molise — diritto allo studio', url: 'https://www.unimol.it/' },
    Piemonte: { name: 'EDISU Piemonte', url: 'https://www.edisu.piemonte.it/' },
    Puglia: { name: 'ADISU Puglia', url: 'https://adisupuglia.it/' },
    Sardegna: { name: 'Regione Sardegna — diritto allo studio', url: 'https://www.regione.sardegna.it/' },
    Sicilia: { name: 'Regione Siciliana — diritto allo studio', url: 'https://www.regione.sicilia.it/' },
    Toscana: { name: 'DSU Toscana', url: 'https://www.dsu.toscana.it/' },
    'Trentino-Alto Adige/Südtirol': { name: 'Diritto allo studio Trentino-Alto Adige', url: 'https://www.provincia.tn.it/' },
    Umbria: { name: 'ADiSU Umbria', url: 'https://www.adisu.umbria.it/' },
    "Valle d'Aosta": { name: "Regione Valle d'Aosta — diritto allo studio", url: 'https://www.regione.vda.it/istruzione/' },
    Veneto: { name: 'Regione Veneto — diritto allo studio', url: 'https://www.regione.veneto.it/' }
  };

  const TEST_AREAS = [
    { id: 'engineering', label: 'Ingegneria, informatica e tecnologia', tolc: 'TOLC-I', groups: ['Ingegneria industriale e dell’informazione', 'Informatica e Tecnologie ICT', 'Architettura e Ingegneria civile'] },
    { id: 'economics', label: 'Economia, management e statistica', tolc: 'TOLC-E', groups: ['Economico'] },
    { id: 'science', label: 'Scienze naturali, matematica e ambiente', tolc: 'TOLC-S / TOLC-B', groups: ['Scientifico'] },
    { id: 'health', label: 'Salute, farmacia e professioni sanitarie', tolc: 'TOLC-F / TOLC-B', groups: ['Medico-Sanitario e Farmaceutico'] },
    { id: 'humanities', label: 'Lettere, lingue, educazione e beni culturali', tolc: 'TOLC-SU', groups: ['Letterario-Umanistico', 'Linguistico', 'Educazione e Formazione', 'Arte e Design'] },
    { id: 'psychology', label: 'Psicologia', tolc: 'TOLC-PSI', groups: ['Psicologico'] },
    { id: 'social', label: 'Scienze politiche, sociali e comunicazione', tolc: 'TOLC-SPS', groups: ['Politico-Sociale e Comunicazione', 'Giuridico'] },
    { id: 'agriculture', label: 'Agraria, veterinaria e scienze animali', tolc: 'TOLC-AV', groups: ['Agrario-Forestale e Veterinario'] },
    { id: 'architecture', label: 'Architettura, design e progetto', tolc: 'Prova locale / TOLC-I', groups: ['Architettura e Ingegneria civile', 'Arte e Design'] }
  ];

  const QUESTION_BANKS = {
    engineering: [
      { section: 'Matematica', question: 'Qual è la soluzione dell’equazione 2x + 5 = 17?', options: ['4', '5', '6', '7', '8'], answer: 2, explanation: 'Sottraendo 5 si ottiene 2x = 12; dividendo per 2, x = 6.' },
      { section: 'Scienze', question: 'Una velocità di 72 km/h corrisponde a:', options: ['10 m/s', '15 m/s', '20 m/s', '25 m/s', '30 m/s'], answer: 2, explanation: 'Per passare da km/h a m/s si divide per 3,6: 72 / 3,6 = 20.' },
      { section: 'Logica', question: 'Completa la successione: 3, 6, 12, 24, …', options: ['30', '36', '42', '48', '54'], answer: 3, explanation: 'Ogni termine è il doppio del precedente.' },
      { section: 'Scienze', question: 'La densità di un materiale è definita come:', options: ['volume diviso massa', 'massa divisa volume', 'massa per accelerazione', 'energia per tempo', 'forza per superficie'], answer: 1, explanation: 'La densità è il rapporto tra massa e volume.' },
      { section: 'Comprensione verbale', question: 'Se tutti gli elementi di A appartengono a B e nessun elemento di B appartiene a C, quale conclusione è certa?', options: ['Alcuni A appartengono a C', 'Nessun A appartiene a C', 'Tutti i C appartengono ad A', 'A e C coincidono', 'Non si può concludere nulla'], answer: 1, explanation: 'Essendo A contenuto in B e B disgiunto da C, anche A è disgiunto da C.' }
    ],
    economics: [
      { section: 'Matematica', question: 'Un prezzo di 120 € aumenta del 15%. Qual è il nuovo prezzo?', options: ['132 €', '136 €', '138 €', '140 €', '144 €'], answer: 2, explanation: 'Il 15% di 120 è 18; 120 + 18 = 138.' },
      { section: 'Logica', question: 'Se tutte le imprese del gruppo X esportano e Alfa appartiene al gruppo X, allora:', options: ['Alfa non esporta', 'Alfa esporta', 'Alfa esporta solo in Europa', 'Alfa è la più grande', 'Non si può sapere'], answer: 1, explanation: 'La conclusione segue direttamente dalle due premesse.' },
      { section: 'Matematica', question: 'Qual è la media aritmetica di 12, 15 e 18?', options: ['14', '15', '16', '17', '18'], answer: 1, explanation: '(12 + 15 + 18) / 3 = 45 / 3 = 15.' },
      { section: 'Logica', question: 'Completa la successione: 2, 5, 11, 23, …', options: ['35', '41', '45', '47', '49'], answer: 3, explanation: 'Ogni numero è il precedente moltiplicato per 2 e aumentato di 1.' },
      { section: 'Comprensione verbale', question: '“La produttività è cresciuta, mentre le ore lavorate sono rimaste stabili.” Quale affermazione è coerente?', options: ['È diminuita la produzione per ora', 'È aumentata la produzione per ora', 'Sono aumentate le ore lavorate', 'La produzione è necessariamente diminuita', 'Non esiste alcun rapporto tra i dati'], answer: 1, explanation: 'A parità di ore, una produttività maggiore indica più produzione per unità di tempo.' }
    ],
    science: [
      { section: 'Chimica', question: 'Una soluzione con pH 7, a temperatura ambiente, è generalmente:', options: ['fortemente acida', 'debolmente acida', 'neutra', 'debolmente basica', 'fortemente basica'], answer: 2, explanation: 'Il valore 7 è il riferimento convenzionale della neutralità.' },
      { section: 'Biologia', question: 'La mitosi produce normalmente:', options: ['quattro cellule diverse', 'due cellule geneticamente simili', 'una sola cellula', 'solo gameti', 'DNA senza cellule'], answer: 1, explanation: 'La mitosi genera due cellule figlie con patrimonio genetico sostanzialmente uguale alla cellula madre.' },
      { section: 'Fisica', question: 'Una massa di 2 kg accelera a 3 m/s². Qual è la forza risultante?', options: ['1,5 N', '5 N', '6 N', '8 N', '9 N'], answer: 2, explanation: 'Secondo F = m·a, la forza è 2 × 3 = 6 N.' },
      { section: 'Biologia', question: 'Quale coppia di basi è tipica del DNA?', options: ['adenina–timina', 'adenina–uracile', 'glucosio–fruttosio', 'sodio–cloro', 'calcio–fosforo'], answer: 0, explanation: 'Nel DNA l’adenina si appaia con la timina.' },
      { section: 'Scienze della Terra', question: 'Quale gas contribuisce in modo importante all’effetto serra antropico?', options: ['elio', 'azoto', 'anidride carbonica', 'argon', 'neon'], answer: 2, explanation: 'L’anidride carbonica è uno dei principali gas serra legati alle attività umane.' }
    ],
    health: [
      { section: 'Biologia', question: 'Quale organello cellulare è principalmente associato alla produzione di ATP?', options: ['nucleo', 'mitocondrio', 'lisosoma', 'ribosoma', 'apparato di Golgi'], answer: 1, explanation: 'I mitocondri svolgono un ruolo centrale nella respirazione cellulare e nella produzione di ATP.' },
      { section: 'Chimica', question: 'Quante moli sono contenute in 18 g di acqua, considerando massa molare 18 g/mol?', options: ['0,1', '0,5', '1', '2', '18'], answer: 2, explanation: 'n = massa / massa molare = 18 / 18 = 1 mole.' },
      { section: 'Matematica', question: 'In un gruppo il rapporto tra A e B è 2:3. Se A vale 10, quanto vale B?', options: ['12', '15', '18', '20', '25'], answer: 1, explanation: 'Il fattore di scala è 5; quindi B = 3 × 5 = 15.' },
      { section: 'Logica', question: 'Tutti i farmaci del gruppo P richiedono prescrizione. Il farmaco Z appartiene al gruppo P. Allora:', options: ['Z non richiede prescrizione', 'Z richiede prescrizione', 'Z è sempre gratuito', 'Z è un antibiotico', 'nessuna conclusione'], answer: 1, explanation: 'La conclusione deriva direttamente dalle premesse.' },
      { section: 'Biologia', question: 'Quale componente del sangue trasporta principalmente l’ossigeno?', options: ['piastrine', 'globuli rossi', 'plasma soltanto', 'linfociti', 'anticorpi'], answer: 1, explanation: 'L’emoglobina contenuta nei globuli rossi lega e trasporta l’ossigeno.' }
    ],
    humanities: [
      { section: 'Lingua italiana', question: 'Quale forma è corretta?', options: ["qual'è", 'qual è', 'quale’è', 'qualé', "quall'è"], answer: 1, explanation: '“Qual” è un troncamento e non richiede apostrofo.' },
      { section: 'Ragionamento logico', question: 'Nessun poeta del gruppo A è anonimo. Luca è un poeta del gruppo A. Quale conclusione segue?', options: ['Luca è anonimo', 'Luca non è anonimo', 'Luca non è poeta', 'Tutti gli anonimi sono poeti', 'Nessuna'], answer: 1, explanation: 'Luca appartiene a un gruppo in cui nessun componente è anonimo.' },
      { section: 'Comprensione del testo', question: '“Il museo estese l’orario serale per rendere le collezioni accessibili anche a chi lavora.” Qual è lo scopo principale?', options: ['Ridurre il personale', 'Aumentare l’accessibilità', 'Chiudere al mattino', 'Sostituire le collezioni', 'Limitare i visitatori'], answer: 1, explanation: 'La frase indica esplicitamente l’obiettivo di raggiungere persone con altri orari.' },
      { section: 'Conoscenze acquisite', question: 'Quale evento viene prima in ordine cronologico?', options: ['Rivoluzione francese', 'Unità d’Italia', 'Prima guerra mondiale', 'Caduta del muro di Berlino', 'Introduzione dell’euro'], answer: 0, explanation: 'La Rivoluzione francese inizia nel 1789, prima degli altri eventi elencati.' },
      { section: 'Lessico', question: 'Quale parola è più vicina nel significato a “effimero”?', options: ['duraturo', 'temporaneo', 'preciso', 'solenne', 'immobile'], answer: 1, explanation: '“Effimero” indica qualcosa di breve durata.' }
    ],
    psychology: [
      { section: 'Comprensione', question: 'La memoria di lavoro è usata soprattutto per:', options: ['conservare per sempre ogni ricordo', 'mantenere e manipolare informazioni per poco tempo', 'regolare il battito cardiaco', 'produrre ormoni', 'sostituire la percezione'], answer: 1, explanation: 'La memoria di lavoro mantiene temporaneamente informazioni utili a un compito.' },
      { section: 'Matematica di base', question: 'Il 25% di 80 è:', options: ['10', '15', '20', '25', '40'], answer: 2, explanation: 'Un quarto di 80 è 20.' },
      { section: 'Biologia', question: 'Il neurone trasmette segnali principalmente attraverso:', options: ['impulsi elettrici e segnali chimici', 'solo ossa', 'solo globuli rossi', 'pressione atmosferica', 'digestione'], answer: 0, explanation: 'I neuroni usano potenziali elettrici e neurotrasmettitori chimici.' },
      { section: 'Ragionamento verbale', question: 'Occhio sta a vedere come orecchio sta a:', options: ['toccare', 'odorare', 'ascoltare', 'gustare', 'camminare'], answer: 2, explanation: 'La relazione associa l’organo alla funzione sensoriale principale.' },
      { section: 'Metodo scientifico', question: 'Una correlazione elevata tra due variabili dimostra sempre che una causa l’altra?', options: ['Sì, sempre', 'Sì, se il campione è grande', 'No, non necessariamente', 'Solo se entrambe aumentano', 'Solo in psicologia'], answer: 2, explanation: 'La correlazione non dimostra da sola un rapporto causale.' }
    ],
    social: [
      { section: 'Conoscenze acquisite', question: 'La separazione dei poteri distingue tradizionalmente tra potere:', options: ['locale, regionale e nazionale', 'legislativo, esecutivo e giudiziario', 'pubblico e privato soltanto', 'economico e culturale', 'militare e scolastico'], answer: 1, explanation: 'La tripartizione classica riguarda legislativo, esecutivo e giudiziario.' },
      { section: 'Ragionamento matematico', question: 'Se 4 persone completano un compito in 6 ore, quante ore-uomo richiede il compito?', options: ['10', '18', '20', '24', '30'], answer: 3, explanation: 'Ore-uomo = 4 × 6 = 24.' },
      { section: 'Comprensione del testo', question: '“Il comune pubblicò i dati in formato aperto per favorire il controllo civico.” Quale obiettivo emerge?', options: ['Nascondere le decisioni', 'Aumentare la trasparenza', 'Ridurre i dati', 'Evitare la partecipazione', 'Privatizzare il comune'], answer: 1, explanation: 'Dati aperti e controllo civico sono strumenti di trasparenza.' },
      { section: 'Logica', question: 'Se alcune politiche pubbliche sono sperimentali e tutte le misure sperimentali vengono valutate, quale conclusione è certa?', options: ['Nessuna politica viene valutata', 'Alcune politiche pubbliche vengono valutate', 'Tutte le politiche sono sperimentali', 'Solo le politiche private vengono valutate', 'La valutazione è impossibile'], answer: 1, explanation: 'Le politiche che sono sperimentali rientrano nell’insieme delle misure valutate.' },
      { section: 'Linguaggio', question: 'Quale espressione indica un dato relativo e non assoluto?', options: ['500 studenti', 'la metà degli studenti', '12 edifici', 'un solo regolamento', '30 chilometri'], answer: 1, explanation: '“La metà” è una proporzione rispetto a un totale.' }
    ],
    agriculture: [
      { section: 'Biologia', question: 'La fotosintesi usa principalmente luce, acqua e:', options: ['ossigeno', 'anidride carbonica', 'azoto molecolare', 'sale', 'metano'], answer: 1, explanation: 'Le piante usano anidride carbonica e acqua, grazie alla luce, per produrre sostanze organiche.' },
      { section: 'Chimica', question: 'Un terreno con pH 5 è:', options: ['acido', 'neutro', 'basico', 'sempre sterile', 'privo di acqua'], answer: 0, explanation: 'Un pH inferiore a 7 indica acidità.' },
      { section: 'Biologia', question: 'In genetica, un allele è:', options: ['una forma alternativa di un gene', 'un organo', 'un minerale', 'una cellula completa', 'un tipo di suolo'], answer: 0, explanation: 'Gli alleli sono versioni alternative dello stesso gene.' },
      { section: 'Matematica', question: 'Una razione contiene 30% di componente A. In 20 kg di razione, quanti kg sono di A?', options: ['3', '5', '6', '8', '10'], answer: 2, explanation: 'Il 30% di 20 è 6.' },
      { section: 'Logica', question: 'Tutti i campioni contaminati vengono esclusi. Il campione X non è stato escluso. Quale conclusione è logicamente valida?', options: ['X è certamente contaminato', 'X non è contaminato, assumendo vera la regola', 'X è il migliore', 'Tutti i campioni sono validi', 'Nessuna'], answer: 1, explanation: 'Per contrapposizione, se un campione non è escluso non appartiene all’insieme dei contaminati previsto dalla regola.' }
    ],
    architecture: [
      { section: 'Matematica', question: 'In una scala 1:100, 3 cm sul disegno corrispondono nella realtà a:', options: ['30 cm', '1 m', '2 m', '3 m', '30 m'], answer: 3, explanation: '3 cm × 100 = 300 cm, cioè 3 metri.' },
      { section: 'Geometria', question: 'Qual è l’area di un rettangolo con lati 5 m e 8 m?', options: ['13 m²', '20 m²', '26 m²', '40 m²', '80 m²'], answer: 3, explanation: 'L’area è base × altezza: 5 × 8 = 40 m².' },
      { section: 'Ragionamento spaziale', question: 'Un quadrato possiede quante assi di simmetria?', options: ['1', '2', '3', '4', '8'], answer: 3, explanation: 'Due assi passano per i punti medi dei lati e due per le diagonali.' },
      { section: 'Logica', question: 'Se ogni modulo B è composto da 4 unità e il progetto contiene 7 moduli B, quante unità servono?', options: ['11', '21', '24', '28', '32'], answer: 3, explanation: '4 × 7 = 28.' },
      { section: 'Comprensione', question: '“Il progetto riduce le superfici impermeabili per favorire il drenaggio.” Quale risultato è coerente?', options: ['Più deflusso immediato', 'Meno infiltrazione', 'Maggiore assorbimento dell’acqua nel suolo', 'Eliminazione del suolo', 'Aumento certo della temperatura'], answer: 2, explanation: 'Superfici più permeabili favoriscono l’infiltrazione e il drenaggio naturale.' }
    ]
  };

  window.STUDENT_SERVICE_DATA = {
    version: 8,
    referenceDate: '2026-08-30',
    academicYear: '2026/2027',
    nationalThresholds: { isee: iseeLimit, ispe: ispeLimit },
    iseeRanges: [
      { value: '0-13000', label: 'Fino a €13.000', min: 0, max: 13000 },
      { value: '13000-16000', label: 'Da €13.000,01 a €16.000', min: 13000.01, max: 16000 },
      { value: '16000-18000', label: 'Da €16.000,01 a €18.000', min: 16000.01, max: 18000 },
      { value: '18000-20000', label: 'Da €18.000,01 a €20.000', min: 18000.01, max: 20000 },
      { value: '20000-22000', label: 'Da €20.000,01 a €22.000 · no tax area nazionale', min: 20000.01, max: 22000 },
      { value: '22000-24000', label: 'Da €22.000,01 a €24.000 · riduzione nazionale minima 80%', min: 22000.01, max: 24000 },
      { value: '24000-26000', label: 'Da €24.000,01 a €26.000 · riduzione nazionale minima 50%', min: 24000.01, max: 26000 },
      { value: '26000-28000', label: 'Da €26.000,01 a €28.000 · riduzione nazionale minima 25%', min: 26000.01, max: 28000 },
      { value: '28000-scholarship-limit', label: `Da €28.000,01 a €${iseeLimit.toLocaleString('it-IT', { minimumFractionDigits: 2 })} · limite massimo borsa DSU 2026/27`, min: 28000.01, max: iseeLimit },
      { value: 'scholarship-limit-30000', label: `Da €${(iseeLimit + 0.01).toLocaleString('it-IT', { minimumFractionDigits: 2 })} a €30.000 · riduzione nazionale minima 10%`, min: iseeLimit + 0.01, max: 30000 },
      { value: '30000-40000', label: 'Da €30.000,01 a €40.000', min: 30000.01, max: 40000 },
      { value: '40000-60000', label: 'Da €40.000,01 a €60.000', min: 40000.01, max: 60000 },
      { value: 'over-60000', label: 'Oltre €60.000', min: 60000.01, max: Infinity },
      { value: 'unknown', label: 'Non conosco ancora il mio ISEE universitario', min: null, max: null }
    ],
    ispeRanges: [
      { value: '0-30000', label: 'Fino a €30.000', min: 0, max: 30000 },
      { value: '30000-45000', label: 'Da €30.000,01 a €45.000', min: 30000.01, max: 45000 },
      { value: '45000-limit', label: `Da €45.000,01 a €${ispeLimit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, min: 45000.01, max: ispeLimit },
      { value: 'over-limit', label: `Oltre €${ispeLimit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, min: ispeLimit + 0.01, max: Infinity },
      { value: 'unknown', label: 'Non conosco ancora il mio ISPE', min: null, max: null }
    ],
    regions: ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige/Südtirol', 'Umbria', "Valle d'Aosta", 'Veneto'],
    regionalPortals: REGIONAL_PORTALS,
    officialDomains: OFFICIAL_DOMAINS,
    testAreas: TEST_AREAS,
    questionBanks: QUESTION_BANKS,
    sources: {
      murScholarships: 'https://www.mur.gov.it/it/aree-tematiche/universita/studenti-diritto-allo-studio-e-residenze/diritto-allo-studio',
      murIseeDecree: 'https://www.mur.gov.it/it/atti-e-normativa/decreto-direttoriale-n-176-del-10-02-2026',
      cisiaRules: 'https://www.cisiaonline.it/tolc/tutto-sul-TOLC/regolamento-tolc',
      universitaly: 'https://www.universitaly.it/'
    }
  };
})();
