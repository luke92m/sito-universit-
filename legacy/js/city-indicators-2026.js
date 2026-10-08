(() => {
  'use strict';

  const ROOM_RENTS = {
    Milano: 704, Firenze: 627, Roma: 615, Bologna: 585, Bergamo: 504, Padova: 496,
    Torino: 479, Brescia: 478, Verona: 473, Venezia: 456, Napoli: 447, Trento: 444,
    Bari: 426, Modena: 408, Genova: 408, Pavia: 400, Novara: 397, Pescara: 388,
    Ferrara: 376, Parma: 370, Trieste: 369, Pisa: 364, Siena: 351, Latina: 325,
    Palermo: 315, Udine: 311, Perugia: 301, Messina: 285, Catania: 284, Ancona: 275,
    Foggia: 259, Catanzaro: 251, Chieti: 240
  };

  const MACRO_SPENDING = {
    'Nord-Ovest': 2973,
    'Nord-Est': 3032,
    Centro: 2999,
    Sud: 2199,
    Isole: 2321,
    Italia: 2755
  };

  const YOUTH_QUALITY = {
    Ancona: [24, 546.82], Aosta: [15, 558.65], Bari: [85, 452.96], Benevento: [32, 532.44],
    Bergamo: [31, 533.85], Bologna: [57, 499.59], Bolzano: [2, 620.56], Brescia: [12, 569.07],
    Cagliari: [68, 480.06], Campobasso: [76, 466.55], Caserta: [78, 464.93], Catania: [102, 413.32],
    Catanzaro: [66, 481.82], Chieti: [53, 502.96], Como: [63, 488.44], Cosenza: [81, 458.15],
    Cuneo: [3, 611.88], Enna: [25, 545.22], Ferrara: [5, 587.34], Firenze: [62, 489.28],
    Foggia: [92, 441.54], Frosinone: [95, 433.70], Genova: [86, 450.88], "L'Aquila": [46, 507.82],
    Lecce: [88, 450.32], Lucca: [75, 468.21], Macerata: [28, 539.47], Messina: [84, 453.88],
    Milano: [101, 418.86], Modena: [48, 505.92], Napoli: [104, 394.45], Padova: [59, 496.38],
    Palermo: [73, 470.32], Parma: [43, 516.05], Pavia: [80, 459.33], Perugia: [26, 545.07],
    'Pesaro e Urbino': [47, 507.69], Pisa: [52, 504.50], Potenza: [50, 505.20],
    'Reggio Calabria': [87, 450.33], Roma: [107, 361.29], Salerno: [98, 425.45], Sassari: [51, 504.64],
    Siena: [22, 549.25], Teramo: [42, 519.72], Torino: [90, 444.26], Trento: [7, 580.92],
    Trieste: [4, 607.09], Udine: [44, 516.02], Varese: [71, 472.62], Venezia: [45, 513.89],
    Vercelli: [10, 570.77], Verona: [19, 553.58], Viterbo: [91, 441.75], Pescara: [70, 478.50],
    'Reggio Emilia': [79, 459.69], Rimini: [64, 487.56], 'Monza-Brianza': [67, 480.93],
    'La Spezia': [41, 520.79], Matera: [37, 525.80], Avellino: [56, 499.89], Rieti: [33, 531.70]
  };

  const RENT_FALLBACK_BY_MACRO = {
    'Nord-Ovest': 479,
    'Nord-Est': 444,
    Centro: 388,
    Sud: 301,
    Isole: 300,
    Italia: 370
  };

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function fuzzyEntry(object, value) {
    const needle = normalize(value);
    if (!needle) return null;
    const exact = Object.entries(object).find(([key]) => normalize(key) === needle);
    if (exact) return { key: exact[0], value: exact[1], exact: true };
    const partial = Object.entries(object).find(([key]) => {
      const clean = normalize(key);
      return needle.length >= 4 && (clean.includes(needle) || needle.includes(clean));
    });
    return partial ? { key: partial[0], value: partial[1], exact: false } : null;
  }

  function roomRent(city, macroArea = 'Italia') {
    const match = fuzzyEntry(ROOM_RENTS, city);
    if (match) return { amount: Number(match.value), city: match.key, exact: true };
    return {
      amount: RENT_FALLBACK_BY_MACRO[macroArea] || RENT_FALLBACK_BY_MACRO.Italia,
      city: city || macroArea,
      exact: false
    };
  }

  function youth(province, city = '') {
    const match = fuzzyEntry(YOUTH_QUALITY, province) || fuzzyEntry(YOUTH_QUALITY, city);
    if (!match) return null;
    return { province: match.key, rank: Number(match.value[0]), score: Number(match.value[1]), total: 107 };
  }

  function studentMonthlyEstimate(city, macroArea = 'Italia') {
    const rent = roomRent(city, macroArea);
    const householdSpending = MACRO_SPENDING[macroArea] || MACRO_SPENDING.Italia;
    // Stima trasparente: camera singola + 24% della spesa familiare media della ripartizione
    // per alimentazione, trasporti, utenze e spese personali di uno studente.
    const nonHousing = Math.round((householdSpending * 0.24) / 10) * 10;
    return {
      monthly: rent.amount + nonHousing,
      rent: rent.amount,
      nonHousing,
      householdSpending,
      rentExact: rent.exact,
      macroArea
    };
  }

  window.CITY_INDICATORS = {
    version: 1,
    roomRents: ROOM_RENTS,
    macroSpending: MACRO_SPENDING,
    youthQuality: YOUTH_QUALITY,
    sources: {
      rent: 'https://www.immobiliare.it/news/osservatorio-immobiliare/borsino-immobiliare/calano-i-prezzi-delle-stanze-in-affitto-62-ma-milano-resta-la-citta-piu-cara-550203/',
      spending: 'https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2024/',
      youth: 'https://lab24.ilsole24ore.com/qualita-della-vita/tabelle/2025/qualita-della-vita-dei-giovani'
    },
    roomRent,
    youth,
    studentMonthlyEstimate
  };
})();
