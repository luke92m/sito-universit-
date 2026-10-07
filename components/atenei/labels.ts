// Etichette di tipologia degli atenei (porting da legacy/js/atenei.js).

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function displayCategory(category: string): string {
  return normalize(category) === 'scuola superiore' ? 'Istituto superiore' : category;
}

export function categoryClass(category: string): string {
  return normalize(displayCategory(category)).replace(/\s+/g, '-');
}

export { normalize as normalizeLabel };
