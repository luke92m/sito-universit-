// Testo arricchito serializzabile: sostituisce le stringhe HTML della versione legacy
// (niente innerHTML nell'interfaccia React, nessun rischio di iniezione).

export type Inline =
  | { t: 'text'; text: string }
  | { t: 'strong'; text: string }
  | { t: 'link'; href: string; text: string }
  | { t: 'chip'; text: string }
  | { t: 'br' }
  | { t: 'p'; className?: string; children: Inline[] };

export type Rich = Inline[];

export const text = (value: string): Inline => ({ t: 'text', text: value });
export const strong = (value: string): Inline => ({ t: 'strong', text: value });
export const link = (href: string, value: string): Inline => ({ t: 'link', href, text: value });
export const chip = (value: string): Inline => ({ t: 'chip', text: value });
export const br = (): Inline => ({ t: 'br' });
export const paragraph = (children: Inline[], className?: string): Inline => ({ t: 'p', className, children });

export function richToPlainText(rich: Rich): string {
  return rich
    .map((item) => {
      if (item.t === 'br') return '\n';
      if (item.t === 'p') return `${richToPlainText(item.children)}\n`;
      return item.text;
    })
    .join('');
}
