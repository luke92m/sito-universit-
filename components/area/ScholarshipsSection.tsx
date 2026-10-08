'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import { journeyOf, type SiteUser } from '@/lib/client/types';
import { useLoader } from '@/lib/client/use-loader';
import { STUDENT_SERVICES as data } from '@/lib/data/student-services';
import { findRange, normalizedIseeValue } from '@/lib/domain/isee';
import { VERDICT_COPY, residenceProfile, scholarshipVerdict, type ScholarshipVerdict } from '@/lib/domain/scholarships';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/site-config';

export interface SavedScholarship {
  id: string;
  university_id: string;
  university_name: string;
  course_name: string | null;
  deadline: string | null;
  portal_url: string | null;
  status: ScholarshipVerdict;
  status_label: string;
  saved_at: string;
}

export async function loadSavedScholarships(): Promise<SavedScholarship[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data: rows } = await supabase.from('saved_scholarships').select('*').order('saved_at', { ascending: true });
  return (rows as SavedScholarship[]) || [];
}

const NO_SCHOLARSHIPS: SavedScholarship[] = [];

interface Verification {
  verdict: ScholarshipVerdict;
  universityId: string;
  residenceRegion: string;
  residenceCity: string;
  profile: string;
}

const formatMoney = (value: number) => value.toLocaleString('it-IT', { minimumFractionDigits: 2 });

export function ScholarshipsSection({ user }: { user: SiteUser }) {
  const { getUniversity, universities, guidance, updateGuidance, showToast } = useSite();
  const params = useSearchParams();
  const defaultUniversityId = params.get('ateneo') || journeyOf(user)?.universityId || universities[0]?.id || '';
  const [share, setShare] = useState(true);
  const [universityId, setUniversityId] = useState(defaultUniversityId);
  const [isee, setIsee] = useState(normalizedIseeValue(guidance.iseeRange || '') || data.iseeRanges[0]?.value || '');
  const [ispe, setIspe] = useState(data.ispeRanges[0]?.value || '');
  const [region, setRegion] = useState(guidance.residenceRegion || '');
  const [city, setCity] = useState(guidance.residenceCity || '');
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState<Verification | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  const [saved, refresh] = useLoader(loadSavedScholarships, NO_SCHOLARSHIPS);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const university = getUniversity(universityId);
    if (!university || !region) {
      setMessage('Seleziona ateneo e regione di residenza.');
      return;
    }
    setMessage('');
    const iseeRange = findRange(data.iseeRanges, isee);
    const ispeRange = findRange(data.ispeRanges, ispe);
    const verdict = scholarshipVerdict(iseeRange, ispeRange);
    await updateGuidance({
      iseeRange: iseeRange?.value || '',
      residenceRegion: region,
      residenceCity: city.trim(),
      lastScholarshipCheckAt: new Date().toISOString()
    });
    setVerification({
      verdict,
      universityId: university.id,
      residenceRegion: region,
      residenceCity: city.trim(),
      profile: residenceProfile(university, region, city.trim())
    });
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const saveOpportunity = async () => {
    if (!verification) return;
    const university = getUniversity(verification.universityId);
    const supabase = getSupabaseBrowserClient();
    if (!university || !supabase) return;
    const regional = data.regionalPortals?.[university.region] || { url: data.sources?.murScholarships || '#' };
    const { error } = await supabase.from('saved_scholarships').insert({
      university_id: university.id,
      university_name: university.name,
      course_name: params.get('corso') || journeyOf(user)?.courseName || null,
      deadline: null,
      portal_url: regional.url,
      status: verification.verdict,
      status_label: VERDICT_COPY[verification.verdict].title
    });
    if (error) {
      showToast('Non è stato possibile salvare l’opportunità.');
      return;
    }
    refresh();
    showToast('Opportunità salvata. La scadenza verrà cercata automaticamente.');
  };

  const remove = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from('saved_scholarships').delete().eq('id', id);
    refresh();
  };

  const verifiedUniversity = verification ? getUniversity(verification.universityId) : null;
  const regional = verifiedUniversity
    ? data.regionalPortals?.[verifiedUniversity.region] || {
        name: 'Portale MUR diritto allo studio',
        url: data.sources?.murScholarships || '#'
      }
    : null;
  const copy = verification ? VERDICT_COPY[verification.verdict] : null;

  return (
    <>
      <section className="service-card decision-card">
        <div>
          <span className="eyebrow">Scelta dei dati</span>
          <h2>Decidi tu quanto condividere</h2>
          <p>
            I dati economici sono facoltativi e servono solo per una stima orientativa. Puoi rifiutare: in quel caso il sito
            non calcolerà una possibile idoneità.
          </p>
        </div>
        <div className="privacy-choice-list">
          <label className={`privacy-choice${share ? ' is-selected' : ''}`}>
            <input type="radio" name="scholarshipPrivacy" checked={share} onChange={() => setShare(true)} />
            <span>Uso i dati per una verifica orientativa</span>
          </label>
          <label className={`privacy-choice${!share ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="scholarshipPrivacy"
              checked={!share}
              onChange={() => {
                setShare(false);
                setVerification(null);
              }}
            />
            <span>Preferisco non comunicarli</span>
          </label>
        </div>
      </section>

      {share ? (
        <section className="service-card">
          <div className="service-card-heading">
            <div>
              <span className="eyebrow">Verifica preliminare</span>
              <h2>Inserisci i dati essenziali</h2>
            </div>
            <span className="data-year-badge">a.a. {data.academicYear}</span>
          </div>
          <form className="service-form" onSubmit={submit} noValidate>
            <label className="field field-wide">
              <span>Ateneo di riferimento</span>
              <UniversityCombobox value={universityId} onChange={setUniversityId} ariaLabel="Ateneo di riferimento" />
            </label>
            <label className="field">
              <span>Fascia ISEE universitario</span>
              <select value={isee} onChange={(event) => setIsee(event.target.value)}>
                {data.iseeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Fascia ISPE <small>(facoltativa ma rilevante)</small>
              </span>
              <select value={ispe} onChange={(event) => setIspe(event.target.value)}>
                {data.ispeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Regione di residenza</span>
              <select value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="">Seleziona</option>
                {data.regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Comune di residenza</span>
              <input type="text" value={city} placeholder="Es. Roma" onChange={(event) => setCity(event.target.value)} />
            </label>
            <p className="service-form-note field-wide">
              Le fasce fino a €30.000 seguono le soglie nazionali minime della no-tax area e delle riduzioni per gli atenei
              statali; il limite DSU per la borsa {data.academicYear} è separato. Ogni ateneo e ogni bando possono adottare
              soglie più favorevoli o criteri ulteriori. ISEE e residenza vengono ricordati nel tuo profilo per gli strumenti
              di orientamento.
            </p>
            <p className="form-message field-wide" role="alert" data-type={message ? 'error' : undefined}>
              {message}
            </p>
            <button className="button button-primary field-wide" type="submit">
              Verifica la possibilità
            </button>
          </form>
        </section>
      ) : (
        <section className="service-card declined-data-card">
          <span className="eyebrow">Nessuna verifica automatica</span>
          <h2>Puoi cercare comunque una borsa di studio.</h2>
          <p>
            Non salveremo né useremo ISEE, ISPE o residenza. Apri il portale nazionale MUR o il sito dell’ateneo e consulta il
            bando ufficiale.
          </p>
          <div className="inline-actions">
            <a className="button button-primary" href={data.sources?.murScholarships || '#'} target="_blank" rel="noreferrer">
              Apri il diritto allo studio MUR
            </a>
            <a
              className="button button-secondary"
              href={data.officialDomains?.[defaultUniversityId] || data.sources?.universitaly || '#'}
              target="_blank"
              rel="noreferrer"
            >
              Apri l’ateneo
            </a>
          </div>
        </section>
      )}

      {verification && verifiedUniversity && regional && copy ? (
        <section className={`scholarship-result scholarship-${verification.verdict}`} ref={resultRef}>
          <div className="result-symbol">{copy.icon}</div>
          <div className="scholarship-result-body">
            <span className="eyebrow">Esito orientativo</span>
            <h2>{copy.title}</h2>
            <p>{copy.text}</p>
            <div className="result-facts-grid">
              <article>
                <span>Ateneo</span>
                <strong>{verifiedUniversity.name}</strong>
              </article>
              <article>
                <span>Profilo di residenza</span>
                <strong>{verification.profile}</strong>
              </article>
              <article>
                <span>Ente di riferimento</span>
                <strong>{regional.name}</strong>
              </article>
              <article>
                <span>Anno accademico</span>
                <strong>{data.academicYear || '2026/2027'}</strong>
              </article>
            </div>
            <div className="save-scholarship-row">
              <button className="button button-primary" type="button" onClick={saveOpportunity}>
                Salva questa opportunità
              </button>
              <a className="button button-secondary" href={regional.url} target="_blank" rel="noreferrer">
                Portale borsa ufficiale
              </a>
              <a
                className="text-link"
                href={data.officialDomains?.[verifiedUniversity.id] || data.sources?.universitaly || '#'}
                target="_blank"
                rel="noreferrer"
              >
                Sito dell’ateneo →
              </a>
            </div>
            <p className="micro-note">
              Residenza comunicata: {verification.residenceCity || 'comune non indicato'}, {verification.residenceRegion}. La
              classificazione in sede/pendolare/fuori sede è soltanto una stima: il bando usa comuni, distanze e tempi di
              percorrenza propri.
            </p>
          </div>
        </section>
      ) : null}

      <section className="service-card">
        <div className="service-card-heading">
          <div>
            <span className="eyebrow">Salvate</span>
            <h2>Le tue opportunità</h2>
          </div>
          <small>Usate anche nelle scadenze</small>
        </div>
        {saved.length ? (
          <div className="saved-opportunity-list">
            {saved
              .slice()
              .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')))
              .map((item) => (
                <article className="saved-opportunity" key={item.id}>
                  <div>
                    <span>{item.deadline ? formatDate(item.deadline) : 'Scadenza cercata automaticamente'}</span>
                    <strong>{getUniversity(item.university_id)?.name || item.university_name || 'Ateneo'}</strong>
                    <small>{item.status_label || 'Verifica orientativa salvata'}</small>
                  </div>
                  <div className="saved-opportunity-actions">
                    <a href={item.portal_url || '#'} target="_blank" rel="noreferrer">
                      Apri portale
                    </a>
                    <button type="button" onClick={() => remove(item.id)}>
                      Elimina
                    </button>
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <p className="empty-state">Non hai ancora salvato opportunità.</p>
        )}
      </section>

      <section className="source-disclaimer">
        <strong>Verifica orientativa, non domanda ufficiale.</strong>
        <p>
          Per il {data.academicYear || '2026/2027'} il limite massimo nazionale è ISEE €{formatMoney(data.nationalThresholds.isee)} e
          ISPE €{formatMoney(data.nationalThresholds.ispe)}. La concessione dipende dal bando competente.
        </p>
        <a href={data.sources?.murIseeDecree || '#'} target="_blank" rel="noreferrer">
          Apri il decreto MUR
        </a>
      </section>
    </>
  );
}
