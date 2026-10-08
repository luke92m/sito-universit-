'use client';

import { useCourseNameOptions } from '@/lib/client/use-courses';

interface Props {
  id?: string;
  universityId: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}

/** Selettore del corso per nome (registrazione, percorso, contesti degli strumenti). */
export function CourseNameSelect({ id, universityId, value, onChange, emptyLabel }: Props) {
  const names = useCourseNameOptions(universityId);
  const options = value && !names.includes(value) ? [...names, value] : names;
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{universityId ? emptyLabel || 'Corso non indicato' : 'Seleziona prima l’ateneo'}</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
