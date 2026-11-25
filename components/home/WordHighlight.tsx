'use client';

import { useEffect, useRef } from 'react';

// Momento "word-highlight" di tasteskill: la frase riposa a mezzo inchiostro e si accende parola per parola
// mentre attraversa lo schermo; torna indietro se si risale. Senza script o con movimento ridotto è tutta in inchiostro.
interface Props {
  text: string;
  /** Parola che si accende nel colore petrolio invece che in inchiostro. */
  strong?: string;
}

export function WordHighlight({ text, strong }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const spans = [...root.querySelectorAll<HTMLElement>('.th-w')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('is-live');
    const section = root.closest('section');
    section?.setAttribute('data-moment-mounted', '');
    let shown = -1;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.45;
      const t = Math.min(1, Math.max(0, (start - rect.top) / Math.max(1, start - end + rect.height)));
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const count = atEnd ? spans.length : Math.round(t * spans.length);
      if (count === shown) return;
      shown = count;
      spans.forEach((span, index) => span.classList.toggle('is-on', index < count));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove('is-live');
      section?.removeAttribute('data-moment-mounted');
    };
  }, []);

  return (
    <p className="th-wh" ref={ref}>
      {words.map((word, index) => {
        const isStrong = strong && word.replace(/[.,;:]/g, '') === strong;
        return (
          <span key={`${word}-${index}`}>
            <span className={`th-w${isStrong ? ' is-strong' : ''}`}>{word}</span>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}
