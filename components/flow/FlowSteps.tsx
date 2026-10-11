import Link from 'next/link';

// I quattro passi del percorso di scelta, in testa alle pagine che li compongono.
export const FLOW_STEPS = [
  { label: 'Trova il corso', href: '/trova-corso' },
  { label: 'Trova l’università', href: '/trova-corso?mode=university' },
  { label: 'Confronta', href: '/comparison?mode=courses' },
  { label: 'Iscriviti', href: '/burocrazia' }
] as const;

interface Props {
  /** Indice del passo corrente (0-3). */
  current: number;
  /** Passi gestiti nella pagina stessa (es. i due test di /trova-corso): pulsante invece di link. */
  actions?: Partial<Record<number, () => void>>;
}

export function FlowSteps({ current, actions = {} }: Props) {
  return (
    <nav className="flow-steps" aria-label="Il percorso di scelta">
      <ol>
        {FLOW_STEPS.map((step, index) => {
          const state = index === current ? ' is-current' : index < current ? ' is-done' : '';
          const content = (
            <>
              <span className="flow-step-number">{index + 1}</span>
              <span className="flow-step-label">{step.label}</span>
            </>
          );
          const action = actions[index];
          return (
            <li key={step.label} className={`flow-step${state}`}>
              {action ? (
                <button type="button" onClick={action} aria-current={index === current ? 'step' : undefined}>
                  {content}
                </button>
              ) : (
                <Link href={step.href} aria-current={index === current ? 'step' : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
