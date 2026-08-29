(() => {
  'use strict';

  const SUBJECTS = {
    'business-management': {
      label: 'Business & Management Studies',
      url: 'https://www.topuniversities.com/university-subject-rankings/business-management-studies'
    },
    'accounting-finance': {
      label: 'Accounting & Finance',
      url: 'https://www.topuniversities.com/university-subject-rankings/accounting-finance'
    },
    'economics-econometrics': {
      label: 'Economics & Econometrics',
      url: 'https://www.topuniversities.com/university-subject-rankings/economics-econometrics'
    },
    marketing: {
      label: 'Marketing',
      url: 'https://www.topuniversities.com/university-subject-rankings/marketing'
    },
    'law-legal-studies': {
      label: 'Law & Legal Studies',
      url: 'https://www.topuniversities.com/university-subject-rankings/law-legal-studies'
    },
    politics: {
      label: 'Politics & International Studies',
      url: 'https://www.topuniversities.com/university-subject-rankings/politics'
    },
    'communication-media': {
      label: 'Communication & Media Studies',
      url: 'https://www.topuniversities.com/university-subject-rankings/communication-media-studies'
    },
    psychology: {
      label: 'Psychology',
      url: 'https://www.topuniversities.com/university-subject-rankings/psychology'
    },
    education: {
      label: 'Education & Training',
      url: 'https://www.topuniversities.com/university-subject-rankings/education-training'
    },
    archaeology: {
      label: 'Archaeology',
      url: 'https://www.topuniversities.com/university-subject-rankings/archaeology'
    },
    classics: {
      label: 'Classics & Ancient History',
      url: 'https://www.topuniversities.com/university-subject-rankings/classics-ancient-history'
    },
    'art-history': {
      label: 'History of Art',
      url: 'https://www.topuniversities.com/university-subject-rankings/art-history'
    },
    'modern-languages': {
      label: 'Modern Languages',
      url: 'https://www.topuniversities.com/university-subject-rankings/modern-languages'
    },
    linguistics: {
      label: 'Linguistics',
      url: 'https://www.topuniversities.com/university-subject-rankings/linguistics'
    },
    'computer-science': {
      label: 'Computer Science & Information Systems',
      url: 'https://www.topuniversities.com/university-subject-rankings/computer-science-information-systems'
    },
    'data-science-ai': {
      label: 'Data Science & Artificial Intelligence',
      url: 'https://www.topuniversities.com/university-subject-rankings/data-science-artificial-intelligence'
    },
    'statistics-or': {
      label: 'Statistics & Operational Research',
      url: 'https://www.topuniversities.com/university-subject-rankings/statistics-operational-research'
    },
    'electrical-electronic': {
      label: 'Engineering – Electrical & Electronic',
      url: 'https://www.topuniversities.com/university-subject-rankings/engineering-electrical-electronic'
    },
    'mechanical-aeronautical': {
      label: 'Engineering – Mechanical, Aeronautical & Manufacturing',
      url: 'https://www.topuniversities.com/university-subject-rankings/engineering-mechanical-aeronautical-manufacturing'
    },
    'civil-structural': {
      label: 'Engineering – Civil & Structural',
      url: 'https://www.topuniversities.com/university-subject-rankings/engineering-civil-structural'
    },
    architecture: {
      label: 'Architecture & Built Environment',
      url: 'https://www.topuniversities.com/university-subject-rankings/architecture-built-environment'
    },
    'art-design': {
      label: 'Art & Design',
      url: 'https://www.topuniversities.com/university-subject-rankings/art-design'
    },
    mathematics: {
      label: 'Mathematics',
      url: 'https://www.topuniversities.com/university-subject-rankings/mathematics'
    },
    'physics-astronomy': {
      label: 'Physics & Astronomy',
      url: 'https://www.topuniversities.com/university-subject-rankings/physics-astronomy'
    },
    chemistry: {
      label: 'Chemistry',
      url: 'https://www.topuniversities.com/university-subject-rankings/chemistry'
    },
    'biological-sciences': {
      label: 'Biological Sciences',
      url: 'https://www.topuniversities.com/university-subject-rankings/biological-sciences'
    },
    'environmental-sciences': {
      label: 'Environmental Sciences',
      url: 'https://www.topuniversities.com/university-subject-rankings/environmental-sciences'
    },
    medicine: {
      label: 'Medicine',
      url: 'https://www.topuniversities.com/university-subject-rankings/medicine'
    },
    nursing: {
      label: 'Nursing',
      url: 'https://www.topuniversities.com/university-subject-rankings/nursing'
    },
    pharmacy: {
      label: 'Pharmacy & Pharmacology',
      url: 'https://www.topuniversities.com/university-subject-rankings/pharmacy-pharmacology'
    },
    agriculture: {
      label: 'Agriculture & Forestry',
      url: 'https://www.topuniversities.com/university-subject-rankings/agriculture-forestry'
    },
    veterinary: {
      label: 'Veterinary Science',
      url: 'https://www.topuniversities.com/university-subject-rankings/veterinary-science'
    },
    'sports-related': {
      label: 'Sports-Related Subjects',
      url: 'https://www.topuniversities.com/university-subject-rankings/sports-related-subjects'
    }
  };

  // Il test usa la materia QS più vicina al corso generale scelto. Quando due materie
  // sono entrambe pertinenti, il punteggio è una media pesata dei dati disponibili.
  const COURSE_SUBJECTS = {
    'economia-aziendale': [
      { subject: 'business-management', weight: 0.62 },
      { subject: 'accounting-finance', weight: 0.38 }
    ],
    'economia-finanza': [
      { subject: 'economics-econometrics', weight: 0.58 },
      { subject: 'accounting-finance', weight: 0.42 }
    ],
    management: [
      { subject: 'business-management', weight: 0.72 },
      { subject: 'marketing', weight: 0.28 }
    ],
    'marketing-comunicazione': [
      { subject: 'marketing', weight: 0.65 },
      { subject: 'communication-media', weight: 0.35 }
    ],
    'data-science-statistica': [
      { subject: 'data-science-ai', weight: 0.60 },
      { subject: 'statistics-or', weight: 0.40 }
    ],
    giurisprudenza: [{ subject: 'law-legal-studies', weight: 1 }],
    'scienze-politiche': [{ subject: 'politics', weight: 1 }],
    psicologia: [{ subject: 'psychology', weight: 1 }],
    'scienze-educazione': [{ subject: 'education', weight: 1 }],
    'lettere-beni-culturali': [
      { subject: 'archaeology', weight: 0.35 },
      { subject: 'classics', weight: 0.30 },
      { subject: 'art-history', weight: 0.20 },
      { subject: 'modern-languages', weight: 0.15 }
    ],
    'lingue-mediazione': [
      { subject: 'modern-languages', weight: 0.72 },
      { subject: 'linguistics', weight: 0.28 }
    ],
    'scienze-comunicazione': [{ subject: 'communication-media', weight: 1 }],
    informatica: [{ subject: 'computer-science', weight: 1 }],
    'ingegneria-informatica': [
      { subject: 'computer-science', weight: 0.55 },
      { subject: 'electrical-electronic', weight: 0.45 }
    ],
    'ingegneria-aerospaziale': [{ subject: 'mechanical-aeronautical', weight: 1 }],
    'ingegneria-meccanica': [{ subject: 'mechanical-aeronautical', weight: 1 }],
    'ingegneria-civile-architettura': [
      { subject: 'civil-structural', weight: 0.56 },
      { subject: 'architecture', weight: 0.44 }
    ],
    matematica: [{ subject: 'mathematics', weight: 1 }],
    fisica: [{ subject: 'physics-astronomy', weight: 1 }],
    chimica: [{ subject: 'chemistry', weight: 1 }],
    'scienze-biologiche': [{ subject: 'biological-sciences', weight: 1 }],
    biotecnologie: [{ subject: 'biological-sciences', weight: 1 }],
    'scienze-naturali-ambientali': [{ subject: 'environmental-sciences', weight: 1 }],
    'medicina-chirurgia': [{ subject: 'medicine', weight: 1 }],
    'professioni-sanitarie': [
      { subject: 'nursing', weight: 0.58 },
      { subject: 'medicine', weight: 0.42 }
    ],
    farmacia: [{ subject: 'pharmacy', weight: 1 }],
    'agraria-alimentare': [{ subject: 'agriculture', weight: 1 }],
    veterinaria: [{ subject: 'veterinary', weight: 1 }],
    design: [{ subject: 'art-design', weight: 1 }],
    'scienze-motorie': [{ subject: 'sports-related', weight: 1 }]
  };

  const GROUP_SUBJECTS = {
    Economico: [{ subject: 'business-management', weight: 0.5 }, { subject: 'economics-econometrics', weight: 0.5 }],
    Giuridico: [{ subject: 'law-legal-studies', weight: 1 }],
    'Politico-Sociale e Comunicazione': [{ subject: 'politics', weight: 0.5 }, { subject: 'communication-media', weight: 0.5 }],
    Psicologico: [{ subject: 'psychology', weight: 1 }],
    'Educazione e Formazione': [{ subject: 'education', weight: 1 }],
    'Letterario-Umanistico': [{ subject: 'classics', weight: 0.5 }, { subject: 'archaeology', weight: 0.5 }],
    Linguistico: [{ subject: 'modern-languages', weight: 1 }],
    'Informatica e Tecnologie ICT': [{ subject: 'computer-science', weight: 1 }],
    "Ingegneria industriale e dell'informazione": [{ subject: 'mechanical-aeronautical', weight: 0.5 }, { subject: 'electrical-electronic', weight: 0.5 }],
    'Architettura e Ingegneria civile': [{ subject: 'civil-structural', weight: 0.5 }, { subject: 'architecture', weight: 0.5 }],
    Scientifico: [{ subject: 'mathematics', weight: 0.25 }, { subject: 'physics-astronomy', weight: 0.25 }, { subject: 'chemistry', weight: 0.25 }, { subject: 'biological-sciences', weight: 0.25 }],
    'Medico-Sanitario e Farmaceutico': [{ subject: 'medicine', weight: 0.6 }, { subject: 'pharmacy', weight: 0.4 }],
    'Agrario-Forestale e Veterinario': [{ subject: 'agriculture', weight: 0.55 }, { subject: 'veterinary', weight: 0.45 }],
    'Arte e Design': [{ subject: 'art-design', weight: 1 }],
    'Scienze motorie e sportive': [{ subject: 'sports-related', weight: 1 }]
  };

  const RANKINGS = {
    'business-management': {
      'ateneo-01503': { rank: 10, score: 87.4 },
      'ateneo-05805': { rank: 59, score: 74.1 },
      'ateneo-01502': { rank: 66, score: 73.0 },
      'ateneo-03701': { rank: 126, score: 67.6 },
      'ateneo-05801': { band: [251, 300] },
      'ateneo-01504': { band: [301, 350] },
      'ateneo-00102': { band: [351, 400] },
      'ateneo-02701': { band: [401, 450] },
      'ateneo-05802': { band: [401, 450] },
      'ateneo-02801': { band: [401, 450] },
      'ateneo-00101': { band: [451, 500] }
    },
    'accounting-finance': {
      'ateneo-01503': { rank: 20, score: 81.9 },
      'ateneo-03701': { rank: 98, score: 68.6 },
      'ateneo-05805': { band: [101, 150] },
      'ateneo-01502': { band: [101, 150] },
      'ateneo-05801': { band: [201, 250] },
      'ateneo-01504': { band: [201, 250] },
      'ateneo-02801': { band: [201, 250] },
      'ateneo-02701': { band: [251, 300] },
      'ateneo-06301': { band: [251, 300] },
      'ateneo-05001': { band: [301, 350] }
    },
    'economics-econometrics': {
      'ateneo-01503': { rank: 18, score: 85.8 },
      'ateneo-03701': { rank: 78, score: 73.2 },
      'ateneo-05805': { rank: 134 },
      'ateneo-05801': { rank: 139 },
      'ateneo-01502': { rank: 151 },
      'ateneo-02801': { rank: 197 },
      'ateneo-02701': { band: [201, 250] },
      'ateneo-05802': { band: [201, 250] },
      'ateneo-01504': { band: [201, 250] },
      'ateneo-01501': { band: [251, 300] },
      'ateneo-00101': { band: [251, 300] },
      'ateneo-05003': { band: [301, 350] },
      'ateneo-06301': { band: [301, 350] },
      'ateneo-05201': { band: [351, 400] },
      'ateneo-05807': { band: [351, 400] },
      'ateneo-05001': { band: [401, 450] },
      'ateneo-02201': { band: [401, 450] },
      'ateneo-04801': { band: [451, 500] },
      'ateneo-01509': { band: [451, 500] },
      'ateneo-01801': { band: [451, 500] },
      'ateneo-07801': { band: [551, 700] },
      'ateneo-01001': { band: [551, 700] }
    },
    marketing: {
      'ateneo-01503': { rank: 9 },
      'ateneo-05805': { band: [51, 100] }
    },
    'law-legal-studies': {
      'ateneo-03701': { rank: 40 },
      'ateneo-01503': { rank: 54 },
      'ateneo-05801': { rank: 60 },
      'ateneo-05805': { band: [101, 150] },
      'ateneo-01501': { band: [101, 150] },
      'ateneo-01504': { band: [101, 150] },
      'ateneo-05802': { band: [151, 200] },
      'ateneo-02201': { band: [151, 200] },
      'ateneo-05807': { band: [151, 200] },
      'ateneo-02801': { band: [151, 200] },
      'ateneo-00101': { band: [201, 250] },
      'ateneo-04801': { band: [251, 300] },
      'ateneo-01001': { band: [251, 300] },
      'ateneo-05001': { band: [251, 300] },
      'ateneo-05003': { band: [301, 350] },
      'ateneo-06301': { band: [301, 350] },
      'ateneo-01509': { band: [351, 400] },
      'ateneo-05201': { band: [351, 400] },
      'ateneo-01801': { band: [351, 400] }
    },
    politics: {
      'ateneo-05805': { rank: 23 },
      'ateneo-01503': { rank: 68 },
      'ateneo-03701': { rank: 70 }
    },
    'communication-media': {
      'ateneo-03701': { band: [51, 100] }
    },
    psychology: {
      'ateneo-02801': { rank: 48 },
      'ateneo-03701': { band: [101, 150] }
    },
    education: {
      'ateneo-03701': { band: [151, 200] }
    },
    archaeology: {
      'ateneo-05801': { rank: 7 },
      'ateneo-03701': { rank: 19 },
      'ateneo-02801': { band: [51, 100] }
    },
    classics: {
      'ateneo-05801': { rank: 1 },
      'ateneo-03701': { rank: 28 },
      'ateneo-02801': { band: [51, 150] }
    },
    'art-history': {
      'ateneo-05801': { rank: 7 },
      'ateneo-00102': { rank: 25 },
      'ateneo-03701': { band: [25, 50] }
    },
    'modern-languages': {
      'ateneo-03701': { rank: 36 },
      'ateneo-05801': { rank: 42 },
      'ateneo-02801': { band: [101, 150] }
    },
    linguistics: {
      'ateneo-03701': { band: [101, 150] }
    },
    'computer-science': {
      'ateneo-01502': { rank: 58 },
      'ateneo-05801': { rank: 72 },
      'ateneo-03701': { rank: 95 },
      'ateneo-00102': { rank: 124 },
      'ateneo-05001': { rank: 144 },
      'ateneo-02201': { band: [201, 250] },
      'ateneo-02801': { band: [201, 250] },
      'ateneo-01501': { band: [251, 300] },
      'ateneo-01503': { band: [301, 350] },
      'ateneo-01001': { band: [301, 350] }
    },
    'data-science-ai': {
      'ateneo-01502': { band: [21, 50] },
      'ateneo-03701': { band: [51, 100] },
      'ateneo-00102': { band: [101, 200] },
      'ateneo-02801': { band: [101, 200] },
      'ateneo-01501': { band: [101, 200] }
    },
    'statistics-or': {
      'ateneo-03701': { band: [51, 100] },
      'ateneo-02801': { band: [51, 100] }
    },
    'electrical-electronic': {
      'ateneo-01502': { band: [21, 50] },
      'ateneo-00102': { rank: 46 },
      'ateneo-03701': { rank: 106 },
      'ateneo-02801': { rank: 127 }
    },
    'mechanical-aeronautical': {
      'ateneo-01502': { rank: 14 },
      'ateneo-00102': { rank: 30 },
      'ateneo-03701': { rank: 126 },
      'ateneo-02801': { rank: 149 }
    },
    'civil-structural': {
      'ateneo-01502': { rank: 14 },
      'ateneo-00102': { rank: 38 },
      'ateneo-03701': { band: [101, 150] },
      'ateneo-02801': { band: [101, 150] }
    },
    architecture: {
      'ateneo-01502': { rank: 6 },
      'ateneo-00102': { rank: 18 },
      'ateneo-03701': { band: [151, 200] }
    },
    'art-design': {
      'ateneo-01502': { rank: 7 },
      'ateneo-00102': { rank: 69 },
      'ateneo-03701': { band: [201, 300] }
    },
    mathematics: {
      'ateneo-01502': { band: [21, 50] },
      'ateneo-00102': { rank: 104 },
      'ateneo-03701': { rank: 141 },
      'ateneo-02801': { rank: 141 }
    },
    'physics-astronomy': {
      'ateneo-05801': { rank: 38 },
      'ateneo-02801': { rank: 78 },
      'ateneo-03701': { rank: 92 },
      'ateneo-00102': { rank: 147 }
    },
    chemistry: {
      'ateneo-03701': { rank: 88 }
    },
    'biological-sciences': {
      'ateneo-02801': { rank: 105 },
      'ateneo-03701': { rank: 127 }
    },
    'environmental-sciences': {
      'ateneo-03701': { rank: 126 },
      'ateneo-00102': { rank: 138 }
    },
    medicine: {
      'ateneo-01501': { rank: 65 },
      'ateneo-05801': { rank: 72 },
      'ateneo-03701': { rank: 76 },
      'ateneo-02801': { rank: 104 },
      'ateneo-01504': { rank: 143 },
      'ateneo-01508': { rank: 164 },
      'ateneo-01509': { band: [201, 250] },
      'ateneo-06301': { band: [201, 250] },
      'ateneo-05001': { band: [201, 250] },
      'ateneo-05802': { band: [201, 250] },
      'ateneo-01801': { band: [201, 250] },
      'ateneo-01510': { band: [251, 300] },
      'ateneo-04801': { band: [251, 300] },
      'ateneo-01001': { band: [251, 300] },
      'ateneo-00101': { band: [251, 300] },
      'ateneo-02301': { band: [301, 350] },
      'ateneo-08701': { band: [351, 400] },
      'ateneo-08201': { band: [351, 400] }
    },
    nursing: {
      'ateneo-03701': { band: [151, 225] }
    },
    pharmacy: {
      'ateneo-05801': { rank: 48 },
      'ateneo-01501': { rank: 52 },
      'ateneo-03701': { band: [101, 150] },
      'ateneo-02801': { band: [101, 150] }
    },
    agriculture: {
      'ateneo-03701': { rank: 46 },
      'ateneo-02801': { rank: 66 }
    },
    veterinary: {
      'ateneo-03701': { rank: 43 },
      'ateneo-02801': { rank: 47 },
      'ateneo-01501': { rank: 49 }
    },
    'sports-related': {
      'ateneo-03701': { band: [101, 150] }
    }
  };

  window.QS_SUBJECT_RANKINGS = {
    version: 2,
    year: 2026,
    publishedAt: '2026-03-25',
    coverage: 'curated-italy',
    subjects: SUBJECTS,
    courseSubjects: COURSE_SUBJECTS,
    groupSubjects: GROUP_SUBJECTS,
    rankings: RANKINGS,
    methodology: {
      note: 'Il dataset include posizioni QS by Subject 2026 verificate su QS e su pagine ufficiali degli atenei. Quando una posizione non è presente, il test usa un fallback disciplinare interno e lo dichiara.',
      bandPolicy: 'Per una fascia QS viene usato il punto medio esclusivamente per trasformarla in un punteggio comparabile; la fascia originale resta visibile.',
      sources: [
        'https://www.qs.com/insights/qs-world-university-ranking-subject',
        'https://www.unibocconi.it/it/chi-siamo/ranking-bocconi-nel-mondo',
        'https://www.unibo.it/it/ateneo/chi-siamo/ranking-cosa-sono-come-si-posiziona-unibo/qs-world-university-rankings-by-subject-posizionamento-metodologia',
        'https://www.polito.it/en/polito/politecnico-at-a-glance/rankings',
        'https://www.polimi.it/fileadmin/user_upload/comunicati_stampa/COMST_Polimi_qsbysubject2026.pdf',
        'https://uniroma1.web.uniroma1.it/it/notizia/qs-subject-2026-sapienza-da-record-classics-archeology-e-history-art',
        'https://www.unipd.it/qs-wur-performance-unipd',
        'https://www.unimi.it/sites/default/files/comunicati_stampa/images/CS%20QS%20by%20Subject%202026.pdf'
      ]
    }
  };
})();
