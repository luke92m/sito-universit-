import { redirect } from 'next/navigation';

// La v8 apriva le borse di studio quando la sezione non era indicata.
export default function AreaStudenteIndex() {
  redirect('/area-studente/borse-di-studio');
}
