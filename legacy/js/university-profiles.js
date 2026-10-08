(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES : [];
  const universityData = window.UniversityData;
  const qs = window.QS_SUBJECT_RANKINGS || { subjects: {}, rankings: {} };
  const censis = window.CENSIS_RANKINGS || { teaching: {} };
  const services = window.STUDENT_SERVICE_DATA || {};

  const HISTORY = {
    'ateneo-03701': 'Tradizionalmente datata al 1088, l’Università di Bologna è considerata il più antico ateneo del mondo occidentale. Nel tempo ha costruito una struttura multidisciplinare e una forte rete internazionale.',
    'ateneo-02801': 'Fondata nel 1222 da maestri e studenti provenienti da Bologna, l’Università di Padova è uno dei più antichi atenei europei e ha legato la propria storia alla libertà di ricerca e all’innovazione scientifica.',
    'ateneo-06301': 'Fondata nel 1224 per volontà di Federico II, è tra le più antiche università pubbliche d’Europa istituite da un’autorità statale. Oggi è un grande ateneo multidisciplinare.',
    'ateneo-05201': 'Le origini dell’Università di Siena risalgono al XIII secolo. L’ateneo si è sviluppato mantenendo un forte rapporto con la città e una struttura diffusa nel territorio toscano.',
    'ateneo-05801': 'Fondata nel 1303, Sapienza ha accompagnato per secoli la vita culturale e scientifica di Roma. È oggi uno dei maggiori atenei europei per dimensioni e ampiezza disciplinare.',
    'ateneo-05401': 'L’Università di Perugia nacque nel 1308 e conserva una lunga tradizione accademica. La sua offerta si è progressivamente estesa alle principali aree scientifiche, umanistiche e professionali.',
    'ateneo-04801': 'Le radici dello Studium fiorentino risalgono al 1321. L’ateneo moderno ha consolidato una forte presenza nella ricerca scientifica, umanistica, sanitaria e sociale.',
    'ateneo-04302': 'L’Università di Camerino fa risalire le proprie origini al 1336. È un ateneo di dimensioni contenute con una tradizione particolarmente legata alle scienze, alla farmacia e alle professioni.',
    'ateneo-05001': 'Fondata nel 1343, l’Università di Pisa è uno degli atenei storici italiani. La sua crescita è legata a una forte tradizione scientifica, medica, ingegneristica e umanistica.',
    'ateneo-01801': 'Istituita come Studium generale nel 1361, l’Università di Pavia ha sviluppato una lunga tradizione nelle scienze, nella medicina, nel diritto e negli studi umanistici.',
    'ateneo-03801': 'Fondata nel 1391, l’Università di Ferrara è un ateneo storico che ha progressivamente ampliato la propria presenza nelle scienze, nella medicina, nel diritto e nelle discipline umanistiche.',
    'ateneo-00101': 'Fondata nel 1404, l’Università di Torino è cresciuta fino a diventare un grande ateneo multidisciplinare, con una presenza significativa nelle scienze, nella medicina, nel diritto e nelle scienze sociali.',
    'ateneo-08701': 'Fondata nel 1434, l’Università di Catania è il più antico ateneo della Sicilia. Ha sviluppato una vasta offerta multidisciplinare e un ruolo centrale nel sistema universitario dell’isola.',
    'ateneo-08301': 'Fondata nel 1548, l’Università di Messina è uno degli atenei storici del Mezzogiorno. La sua storia è legata allo sviluppo degli studi giuridici, medici e scientifici.',
    'ateneo-09001': 'L’Università di Sassari fu istituita nel XVI secolo e riconosciuta come università nel 1562. Oggi è un ateneo multidisciplinare con un forte radicamento nel territorio sardo.',
    'ateneo-09201': 'Le origini dell’Università di Cagliari risalgono al XVII secolo. Nel tempo è diventata il principale polo universitario della Sardegna meridionale, con un’offerta ampia e multidisciplinare.',
    'ateneo-02701': 'Ca’ Foscari nacque nel 1868 come Regia Scuola Superiore di Commercio. La sua identità storica è legata agli studi economici, linguistici e internazionali.',
    'ateneo-01502': 'Il Politecnico di Milano fu fondato nel 1863. Si è sviluppato come ateneo specialistico dedicato a ingegneria, architettura e design, con una forte dimensione internazionale.',
    'ateneo-00102': 'Le origini del Politecnico di Torino risalgono alla metà dell’Ottocento; l’attuale istituzione nacque dall’unificazione delle scuole tecniche superiori torinesi. È specializzato in ingegneria, architettura e design.',
    'ateneo-01503': 'L’Università Bocconi fu fondata nel 1902 a Milano. È nata come istituzione specializzata negli studi economici e commerciali e ha poi ampliato la propria attività a management, finanza, diritto e scienze sociali.',
    'ateneo-01504': 'L’Università Cattolica del Sacro Cuore fu fondata nel 1921. Nel tempo si è sviluppata come grande ateneo non statale multicampus e multidisciplinare.',
    'ateneo-01501': 'L’Università degli Studi di Milano fu istituita nel 1924. È cresciuta come grande ateneo pubblico, con una particolare ampiezza nelle scienze, nella medicina, nel diritto e negli studi umanistici.',
    'ateneo-03201': 'L’Università di Trieste fu istituita nel 1924, raccogliendo esperienze accademiche precedenti. La sua posizione di confine ha favorito una forte vocazione scientifica e internazionale.',
    'ateneo-07201': 'L’Università di Bari fu istituita nel 1925. È diventata uno dei principali atenei del Mezzogiorno, con un’offerta multidisciplinare e un forte ruolo territoriale.',
    'ateneo-06303': 'L’Orientale affonda le proprie radici nel Collegio dei Cinesi fondato nel 1732. È un ateneo specializzato nello studio di lingue, culture e società dell’Asia, dell’Africa, delle Americhe e dell’Europa.',
    'ateneo-05805': 'La Luiss ha assunto l’attuale identità negli anni Settanta, sviluppandosi come università non statale specializzata nelle scienze sociali, economiche, giuridiche e politiche.',
    'ateneo-01509': 'L’Università di Milano-Bicocca è stata istituita nel 1998. È nata come nuovo polo pubblico milanese e si è sviluppata in ambito scientifico, economico-sociale, psicologico e sanitario.',
    'ateneo-02201': 'L’Università di Trento nacque nel 1962 come Istituto universitario di scienze sociali. Ha poi ampliato l’offerta mantenendo una forte attenzione alla ricerca e all’internazionalizzazione.',
    'ateneo-07801': 'L’Università della Calabria fu istituita nel 1972 e progettata come campus residenziale. La sua storia è legata all’idea di integrare formazione, ricerca e vita universitaria in un unico polo.',
    'ateneo-02702': 'L’Iuav deriva dalla Scuola Superiore di Architettura fondata nel 1926. È un ateneo specialistico dedicato a progetto, architettura, urbanistica, design, arti e moda.',
    'ateneo-05002': 'La Scuola Normale Superiore fu fondata nel 1810 sul modello dell’École Normale di Parigi. È un istituto superiore a ordinamento speciale dedicato alla formazione avanzata e alla ricerca.',
    'ateneo-05003': 'La Scuola Superiore Sant’Anna ha consolidato l’attuale assetto nel Novecento, raccogliendo tradizioni collegiali pisane. È un istituto superiore dedicato alla formazione di eccellenza e alla ricerca interdisciplinare.',
    'ateneo-03202': 'La SISSA fu fondata a Trieste nel 1978 come scuola superiore internazionale di studi avanzati. È orientata soprattutto alla formazione post-laurea e alla ricerca scientifica.',
    'ateneo-06603': 'Il Gran Sasso Science Institute è nato all’Aquila nel decennio 2010 come scuola universitaria superiore dedicata a dottorato e ricerca avanzata in scienze, matematica, informatica e scienze sociali.',
    'ateneo-04201': 'L’Università Politecnica delle Marche è nata nel 1969 ad Ancona. Ha sviluppato una vocazione nelle aree ingegneristiche, economiche, agrarie e sanitarie.',
    'ateneo-02101': 'La Libera Università di Bolzano è stata fondata nel 1997. È caratterizzata da un’impostazione plurilingue e da uno stretto rapporto con il territorio altoatesino.',
    'ateneo-00401': 'L’Università di Scienze Gastronomiche è nata a Pollenzo nel 2004. È un ateneo specialistico dedicato ai sistemi alimentari, alla sostenibilità e alla cultura del cibo.'
  };

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function officialUrl(university) {
    return services.officialDomains?.[university.id] || '#';
  }

  function typeLabel(university) {
    const category = normalize(university.category);
    if (category.includes('scuola superiore')) return 'istituto superiore universitario';
    if (category.includes('telematica')) return 'università telematica';
    if (category.includes('politecnico')) return 'politecnico pubblico';
    return university.isPublic ? 'università pubblica' : 'università non statale';
  }

  function qsStrengths(universityId) {
    const rows = [];
    Object.entries(qs.rankings || {}).forEach(([subject, records]) => {
      const record = records?.[universityId];
      if (!record) return;
      const meta = qs.subjects?.[subject] || { label: subject, url: '' };
      const rank = Number(record.rank) || (Array.isArray(record.band) ? (Number(record.band[0]) + Number(record.band[1])) / 2 : 9999);
      const visibleRank = Number(record.rank) ? `#${record.rank}` : Array.isArray(record.band) ? `${record.band[0]}–${record.band[1]}` : 'n.d.';
      rows.push({ label: meta.label, rank, visibleRank, source: `QS by Subject ${qs.year || 2026}`, url: meta.url || '' });
    });
    return rows.sort((a, b) => a.rank - b.rank).slice(0, 4);
  }

  function censisStrengths(universityId) {
    const rows = [];
    Object.entries(censis.teaching || {}).forEach(([level, groups]) => {
      Object.entries(groups || {}).forEach(([group, table]) => {
        const record = table?.records?.[universityId];
        if (!record) return;
        rows.push({
          label: group,
          rank: Number(record.position) || 9999,
          visibleRank: `#${record.position}`,
          source: `CENSIS didattica ${censis.edition || '2026/2027'} · ${level === 'bachelor' ? 'triennali' : level === 'single' ? 'ciclo unico' : 'magistrali'}`,
          url: table.source || censis.source || ''
        });
      });
    });
    const seen = new Set();
    return rows.sort((a, b) => a.rank - b.rank).filter((item) => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    }).slice(0, 4);
  }

  function murStrengths(universityId) {
    const raw = universityData?.getUniversityData?.(universityId)?.groups || {};
    return Object.entries(raw)
      .map(([label, stats]) => ({ label, enrolled: Number(stats.enrolled) || 0, courseCount: Number(stats.courseCount) || 0 }))
      .sort((a, b) => b.enrolled - a.enrolled || b.courseCount - a.courseCount)
      .slice(0, 4)
      .map((item) => ({
        label: item.label,
        rank: 9999,
        visibleRank: `${item.courseCount} corsi`,
        source: 'Aree con maggiore presenza nell’offerta MUR, non ranking di qualità',
        url: universityData?.dataset?.sources?.courseOffer || ''
      }));
  }

  function strengths(university) {
    const qsRows = qsStrengths(university.id);
    if (qsRows.length) return { kind: 'ranking', rows: qsRows };
    const censisRows = censisStrengths(university.id);
    if (censisRows.length) return { kind: 'ranking', rows: censisRows };
    return { kind: 'offer', rows: murStrengths(university.id) };
  }

  function overview(university) {
    const metrics = universityData?.getMetrics?.(university.id) || {};
    const courses = universityData?.getCourses?.(university.id) || [];
    const students = Number(metrics.students) || 0;
    const groups = new Set(courses.map((course) => course.group).filter(Boolean));
    const scale = students ? `${new Intl.NumberFormat('it-IT').format(students)} studenti censiti` : 'dimensione non disponibile nel dataset MUR';
    const teaching = courses.length ? `${courses.length} corsi collegati in ${groups.size} aree disciplinari` : 'offerta ordinaria non presente nel dataset collegato';
    return `${university.name} è una ${typeLabel(university)} con sede principale a ${university.city}, in ${university.region}. Nel prototipo risultano ${scale} e ${teaching}. La scheda riunisce dati MUR, ranking ufficiali disponibili e collegamenti istituzionali.`;
  }

  function genericHistory(university) {
    const category = normalize(university.category);
    if (category.includes('scuola superiore')) {
      return 'L’istituzione si è sviluppata come scuola universitaria superiore, con una vocazione concentrata sulla formazione avanzata, sulla selezione degli studenti e sulla ricerca. Per la cronologia completa è disponibile il sito ufficiale.';
    }
    if (category.includes('telematica')) {
      return 'L’ateneo è nato nel contesto dello sviluppo della formazione universitaria digitale in Italia e svolge prevalentemente attività didattica a distanza. Per data di istituzione e passaggi normativi è disponibile il sito ufficiale.';
    }
    if (!university.isPublic) {
      return 'L’ateneo si è sviluppato come università non statale riconosciuta, con un’identità spesso legata a specifici ambiti professionali o culturali. La cronologia istituzionale completa è consultabile sul sito ufficiale.';
    }
    return 'L’ateneo si è consolidato come polo universitario pubblico del proprio territorio, ampliando nel tempo didattica, ricerca e servizi agli studenti. La cronologia istituzionale completa è consultabile sul sito ufficiale.';
  }

  function profile(university) {
    return {
      university,
      officialUrl: officialUrl(university),
      overview: overview(university),
      history: HISTORY[university.id] || genericHistory(university),
      strengths: strengths(university)
    };
  }

  window.UniversityProfiles = {
    profile,
    strengths,
    officialUrl,
    history: HISTORY,
    all: () => universities.map(profile)
  };
})();
