import { NEUTRALITY_TEXT } from '@/lib/site-config';

/** Dichiarazione di neutralità, uguale ovunque compaiano risultati o confronti. */
export function NeutralityNote() {
  return (
    <p className="neutrality-note">
      <strong>Risultati neutrali.</strong> {NEUTRALITY_TEXT}
    </p>
  );
}
