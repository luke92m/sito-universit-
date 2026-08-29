(() => {
  'use strict';

  const REGION_NEIGHBORS = {
    Abruzzo: ['Lazio', 'Marche', 'Molise'],
    Basilicata: ['Campania', 'Puglia', 'Calabria'],
    Calabria: ['Basilicata'],
    Campania: ['Lazio', 'Molise', 'Puglia', 'Basilicata'],
    'Emilia-Romagna': ['Lombardia', 'Veneto', 'Marche', 'Toscana', 'Liguria', 'Piemonte'],
    'Friuli-Venezia Giulia': ['Veneto'],
    Lazio: ['Toscana', 'Umbria', 'Marche', 'Abruzzo', 'Molise', 'Campania'],
    Liguria: ['Piemonte', 'Emilia-Romagna', 'Toscana'],
    Lombardia: ['Piemonte', 'Emilia-Romagna', 'Veneto', 'Trentino-Alto Adige/Südtirol'],
    Marche: ['Emilia-Romagna', 'Umbria', 'Lazio', 'Abruzzo'],
    Molise: ['Abruzzo', 'Lazio', 'Campania', 'Puglia'],
    Piemonte: ["Valle d'Aosta", 'Liguria', 'Lombardia', 'Emilia-Romagna'],
    Puglia: ['Molise', 'Campania', 'Basilicata'],
    Sardegna: [],
    Sicilia: [],
    Toscana: ['Liguria', 'Emilia-Romagna', 'Umbria', 'Lazio'],
    'Trentino-Alto Adige/Südtirol': ['Lombardia', 'Veneto'],
    Umbria: ['Toscana', 'Marche', 'Lazio'],
    "Valle d'Aosta": ['Piemonte'],
    Veneto: ['Lombardia', 'Trentino-Alto Adige/Südtirol', 'Friuli-Venezia Giulia', 'Emilia-Romagna']
  };

  const REGION_CENTERS = {
    Abruzzo: [42.35, 13.4], Basilicata: [40.64, 15.8], Calabria: [39.0, 16.4], Campania: [40.85, 14.55],
    'Emilia-Romagna': [44.5, 11.0], 'Friuli-Venezia Giulia': [46.05, 13.15], Lazio: [41.9, 12.65],
    Liguria: [44.35, 8.75], Lombardia: [45.55, 9.65], Marche: [43.3, 13.15], Molise: [41.6, 14.65],
    Piemonte: [45.1, 7.75], Puglia: [41.0, 16.75], Sardegna: [40.0, 9.0], Sicilia: [37.55, 14.0],
    Toscana: [43.45, 11.0], 'Trentino-Alto Adige/Südtirol': [46.35, 11.15], Umbria: [43.05, 12.45],
    "Valle d'Aosta": [45.74, 7.32], Veneto: [45.55, 11.75]
  };

  const CITY_COORDINATES = {
    'ancona': [43.6158, 13.5189], 'aosta': [45.737, 7.32], 'arcavata di rende': [39.36, 16.226],
    'arcavacata di rende': [39.36, 16.226], 'rende': [39.33, 16.18], 'bari': [41.117, 16.871],
    'benevento': [41.13, 14.78], 'bergamo': [45.698, 9.677], 'bologna': [44.4949, 11.3426],
    'bolzano': [46.498, 11.3548], 'bra': [44.7, 7.85], 'pollenzo': [44.684, 7.893],
    'brescia': [45.5416, 10.2118], 'cagliari': [39.2238, 9.1217], 'camerino': [43.135, 13.068],
    'campobasso': [41.56, 14.66], 'casamassima': [40.956, 16.92], 'caserta': [41.074, 14.333],
    'cassino': [41.49, 13.83], 'castellanza': [45.61, 8.9], 'catania': [37.5079, 15.083],
    'catanzaro': [38.91, 16.59], 'chieti': [42.35, 14.14], 'chieti scalo': [42.35, 14.14],
    'enna': [37.57, 14.28], 'enna bassa': [37.55, 14.28], 'ferrara': [44.838, 11.619],
    'firenze': [43.7696, 11.2558], 'fisciano': [40.77, 14.8], 'salerno': [40.6824, 14.7681],
    'foggia': [41.462, 15.544], 'genova': [44.4056, 8.9463], 'l aquila': [42.35, 13.399],
    'laquila': [42.35, 13.399], 'lecce': [40.352, 18.175], 'lucca': [43.843, 10.504],
    'macerata': [43.299, 13.453], 'messina': [38.1938, 15.554], 'milano': [45.4642, 9.19],
    'modena': [44.647, 10.925], 'napoli': [40.8518, 14.2681], 'novedrate': [45.7, 9.12],
    'padova': [45.4064, 11.8768], 'palermo': [38.1157, 13.3615], 'parma': [44.8015, 10.3279],
    'pavia': [45.1847, 9.1582], 'perugia': [43.1107, 12.3908], 'pieve emanuele': [45.35, 9.2],
    'pisa': [43.7228, 10.4017], 'potenza': [40.64, 15.805], 'reggio calabria': [38.111, 15.661],
    'roma': [41.9028, 12.4964], 'sassari': [40.7259, 8.5557], 'siena': [43.3188, 11.3308],
    'teramo': [42.658, 13.704], 'torino': [45.0703, 7.6869], 'torrevecchia teatina': [42.39, 14.21],
    'trento': [46.0748, 11.1217], 'trieste': [45.6495, 13.7768], 'udine': [46.0711, 13.2346],
    'urbino': [43.7262, 12.6363], 'varese': [45.8206, 8.8251], 'venezia': [45.4408, 12.3155],
    'vercelli': [45.32, 8.42], 'verona': [45.4384, 10.9916], 'viterbo': [42.4174, 12.1049],
    'alessandria': [44.913, 8.616], 'asti': [44.9, 8.206], 'biella': [45.566, 8.054],
    'como': [45.808, 9.085], 'cremona': [45.133, 10.022], 'lecco': [45.856, 9.397],
    'lodi': [45.314, 9.503], 'mantova': [45.156, 10.792], 'monza': [45.5845, 9.2744],
    'novara': [45.4469, 8.6222], 'sondrio': [46.17, 9.87], 'savona': [44.307, 8.481],
    'imperia': [43.887, 8.03], 'la spezia': [44.102, 9.824], 'ravenna': [44.418, 12.204],
    'rimini': [44.0678, 12.5695], 'forli': [44.222, 12.041], 'cesena': [44.139, 12.243],
    'piacenza': [45.0526, 9.693], 'reggio emilia': [44.698, 10.63], 'livorno': [43.548, 10.311],
    'prato': [43.8777, 11.1022], 'arezzo': [43.463, 11.879], 'grosseto': [42.763, 11.113],
    'massa': [44.035, 10.139], 'carrara': [44.079, 10.101], 'terni': [42.5636, 12.643],
    'ascoli piceno': [42.853, 13.574], 'fermo': [43.16, 13.718], 'pesaro': [43.91, 12.914],
    'pescara': [42.4618, 14.2161], 'avellino': [40.915, 14.79], 'latina': [41.4676, 12.9037],
    'frosinone': [41.6398, 13.341], 'rieti': [42.4045, 12.8567], 'taranto': [40.4644, 17.247],
    'brindisi': [40.6327, 17.9418], 'barletta': [41.32, 16.28], 'andria': [41.23, 16.3],
    'trani': [41.277, 16.417], 'matera': [40.666, 16.604], 'cosenza': [39.298, 16.254],
    'crotone': [39.08, 17.127], 'vibo valentia': [38.675, 16.1], 'agrigento': [37.311, 13.576],
    'caltanissetta': [37.49, 14.062], 'ragusa': [36.926, 14.725], 'siracusa': [37.0755, 15.2866],
    'trapani': [38.017, 12.517], 'nuoro': [40.321, 9.33], 'oristano': [39.906, 8.591]
  };

  const CITY_COSTS = {
    Milano: [1500, 760, 'molto alto'], Roma: [1360, 680, 'molto alto'], Firenze: [1300, 650, 'molto alto'],
    Bologna: [1260, 620, 'molto alto'], Venezia: [1260, 610, 'molto alto'], Bolzano: [1240, 610, 'molto alto'],
    Trento: [1120, 530, 'alto'], Siena: [1110, 520, 'alto'], Pisa: [1080, 510, 'alto'], Padova: [1060, 500, 'alto'],
    Torino: [1050, 500, 'alto'], Pavia: [1050, 500, 'alto'], Bergamo: [1040, 500, 'alto'], Verona: [1040, 500, 'alto'],
    Genova: [1020, 490, 'alto'], Brescia: [1010, 480, 'alto'], Parma: [1000, 470, 'alto'], Modena: [1000, 470, 'alto'],
    Trieste: [1000, 470, 'alto'], Varese: [990, 470, 'alto'], 'Pieve Emanuele': [1080, 520, 'alto'],
    Castellanza: [970, 450, 'medio-alto'], Novedrate: [930, 420, 'medio-alto'], Lucca: [980, 460, 'medio-alto'],
    Cagliari: [960, 450, 'medio-alto'], Napoli: [950, 450, 'medio-alto'], Bari: [910, 420, 'medio'],
    Ferrara: [910, 420, 'medio'], Ancona: [900, 410, 'medio'], Perugia: [890, 400, 'medio'], Udine: [890, 400, 'medio'],
    Lecce: [880, 390, 'medio'], Palermo: [870, 390, 'medio'], Catania: [860, 380, 'medio'], Sassari: [850, 380, 'medio'],
    Macerata: [840, 370, 'medio'], Urbino: [840, 370, 'medio'], L_Aquila: [830, 360, 'medio'],
    'L\'Aquila': [830, 360, 'medio'], Teramo: [820, 350, 'medio'], Chieti: [820, 350, 'medio'],
    'Chieti Scalo': [820, 350, 'medio'], Foggia: [810, 350, 'medio'], Benevento: [800, 340, 'medio'],
    Caserta: [800, 350, 'medio'], Cassino: [790, 330, 'medio-basso'], Viterbo: [820, 350, 'medio'],
    Salerno: [850, 380, 'medio'], 'Fisciano - Salerno': [790, 330, 'medio-basso'], Campobasso: [770, 320, 'medio-basso'],
    Potenza: [770, 320, 'medio-basso'], Catanzaro: [760, 310, 'medio-basso'], 'Reggio Calabria': [780, 330, 'medio-basso'],
    Messina: [800, 350, 'medio-basso'], 'Arcavacata Di Rende': [740, 300, 'basso'], Camerino: [740, 300, 'basso'],
    Casamassima: [740, 300, 'basso'], 'Enna Bassa': [720, 290, 'basso'], 'Torrevecchia Teatina': [720, 290, 'basso'],
    'Bra - Fraz. Pollenzo': [850, 370, 'medio'], Vercelli: [840, 360, 'medio'], Aosta: [980, 450, 'medio-alto']
  };

  const MACRO_DEFAULT_COST = {
    'Nord-Ovest': [1010, 470, 'alto'], 'Nord-Est': [990, 450, 'medio-alto'], Centro: [930, 420, 'medio'],
    Sud: [790, 330, 'medio-basso'], Isole: [820, 350, 'medio']
  };

  window.UNIVERSITY_FINDER_DATA = {
    version: 2,
    referenceDate: '2026-08-29',
    regionNeighbors: REGION_NEIGHBORS,
    regionCenters: REGION_CENTERS,
    cityCoordinates: CITY_COORDINATES,
    cityCosts: CITY_COSTS,
    macroDefaultCost: MACRO_DEFAULT_COST,
    methodology: {
      commute: 'Stima geometrica prudenziale per soli Regionali e Regionali Veloci, senza Alta Velocità; non usa ancora orari, cambi o coincidenze reali.',
      regionalCommuteLimitMinutes: 90,
      regionalTrainTypes: ['Regionale', 'Regionale Veloce'],
      costs: 'Valori dimostrativi per confrontare le città; devono essere collegati a una fonte urbana aggiornata prima della pubblicazione reale.',
      ranking: 'Usa il ranking QS generale disponibile e l’indice disciplinare MUR del prototipo quando il QS per materia non è collegato.'
    }
  };
})();
