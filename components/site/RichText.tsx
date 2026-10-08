import type { Rich } from '@/lib/domain/rich-text';

/** Rende un testo arricchito prodotto dal server (sostituisce l'HTML a stringhe della v8). */
export function RichText({ value, linkClassName = 'comparison-data-link' }: { value: Rich; linkClassName?: string }) {
  return (
    <>
      {value.map((item, index) => {
        switch (item.t) {
          case 'text':
            return <span key={index}>{item.text}</span>;
          case 'strong':
            return <strong key={index}>{item.text}</strong>;
          case 'link':
            return (
              <a key={index} className={linkClassName} href={item.href} target="_blank" rel="noreferrer">
                {item.text}
              </a>
            );
          case 'chip':
            return (
              <span key={index} className="comparison-subject-chip">
                {item.text}
              </span>
            );
          case 'br':
            return <br key={index} />;
          case 'p':
            return (
              <span key={index} className={`rich-paragraph ${item.className || ''}`.trim()}>
                <RichText value={item.children} linkClassName={linkClassName} />
              </span>
            );
        }
      })}
    </>
  );
}
