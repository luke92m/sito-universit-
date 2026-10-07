'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/site/Icons';
import type { CatalogEntry, DepartmentEntry, InstitutionType } from '@/lib/domain/catalog';
import { categoryClass, displayCategory, normalizeLabel } from './labels';
import { UniversityProfileModal } from './UniversityProfileModal';

type Mode = 'alphabetical' | 'region' | 'ranking' | 'department';

const MODE_LABELS: Record<Mode, string> = {
  alphabetical: 'Alfabetico',
  region: 'Regione',
  ranking: 'Ranking ufficiali',
  department: 'Dipartimento'
};

const MODE_OPTIONS: { mode: Mode; icon: string; title: string; hint: string }[] = [
  { mode: 'alphabetical', icon: 'A', title: 'Alfabetico', hint: 'Dalla A alla Z' },
  { mode: 'region', icon: 'R', title: 'Regione', hint: 'Scegli una regione italiana' },
  { mode: 'ranking', icon: 'Q', title: 'Ranking ufficiali', hint: 'QS 2027; fallback CENSIS 2026/27' },
  { mode: 'department', icon: 'D', title: 'Dipartimento', hint: 'Scegli un’area disciplinare' }
];

const TYPE_LABELS: Record<string, string> = {
  all: 'tutti gli atenei',
  public: 'le università pubbliche',
  private: 'le università private',
  online: 'le università telematiche',
  institute: 'gli istituti superiori'
};

const integerFormatter = new Intl.NumberFormat('it-IT');
const alphaSort = (a: CatalogEntry, b: CatalogEntry) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });

export function AteneiCatalog({ entries, departments }: { entries: CatalogEntry[]; departments: string[] }) {
  const regions = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.region))].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' })),
    [entries]
  );
  const defaultDepartment = departments.includes('Economico') ? 'Economico' : departments[0] || '';

  const [mode, setMode] = useState<Mode>('alphabetical');
  const [region, setRegion] = useState(regions[0] || '');
  const [department, setDepartment] = useState(defaultDepartment);
  const [institution, setInstitution] = useState<'all' | InstitutionType>('all');
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState<string | null>(null);
  const [departmentData, setDepartmentData] = useState<{ group: string; rankings: Record<string, DepartmentEntry> } | null>(
    null
  );
  const closeProfile = useCallback(() => setOpenProfile(null), []);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLSelectElement>(null);
  const departmentRef = useRef<HTMLSelectElement>(null);

  // I ranking per area si caricano dal server solo quando servono.
  useEffect(() => {
    if (mode !== 'department' || departmentData?.group === department) return;
    let active = true;
    fetch(`/api/atenei/department?group=${encodeURIComponent(department)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setDepartmentData({ group: department, rankings: payload.rankings || {} });
      })
      .catch(() => {
        if (active) setDepartmentData({ group: department, rankings: {} });
      });
    return () => {
      active = false;
    };
  }, [mode, department, departmentData?.group]);

  // React (App Router) gestisce gli eventi su document: stopPropagation non ferma questo listener,
  // quindi si ignorano esplicitamente i clic dentro il pannello dei filtri.
  useEffect(() => {
    const close = (event: Event) => {
      if (event.type === 'click' && filterWrapRef.current?.contains(event.target as Node)) return;
      setPanelOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(event);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const departmentReady = mode !== 'department' || departmentData?.group === department;
  const departmentRanking = useCallback(
    (entry: CatalogEntry) => (departmentData?.group === department ? departmentData.rankings[entry.id] : undefined),
    [departmentData, department]
  );

  const results = useMemo(() => {
    let list = entries.slice();
    if (institution !== 'all') list = list.filter((entry) => entry.institutionType === institution);
    if (mode === 'region') list = list.filter((entry) => entry.region === region);
    if (mode === 'department') list = list.filter((entry) => entry.groups.includes(department));

    const query = normalizeLabel(search);
    if (query) {
      list = list.filter((entry) =>
        normalizeLabel(
          `${entry.name} ${entry.shortName} ${entry.city} ${entry.province} ${entry.region} ${entry.category} ${entry.groups.join(' ')}`
        ).includes(query)
      );
    }

    const byRanking = (left?: { tier: number; score: number }, right?: { tier: number; score: number }) => {
      if ((left?.tier || 0) !== (right?.tier || 0)) return (right?.tier || 0) - (left?.tier || 0);
      if ((left?.score || 0) !== (right?.score || 0)) return (right?.score || 0) - (left?.score || 0);
      return 0;
    };
    if (mode === 'ranking') return list.sort((a, b) => byRanking(a.ranking, b.ranking) || alphaSort(a, b));
    if (mode === 'department') {
      return list.sort((a, b) => byRanking(departmentRanking(a)?.ranking, departmentRanking(b)?.ranking) || alphaSort(a, b));
    }
    return list.sort(alphaSort);
  }, [entries, institution, mode, region, department, search, departmentRanking]);

  const resetFilters = () => {
    setMode('alphabetical');
    setRegion(regions[0] || '');
    setDepartment(defaultDepartment);
    setInstitution('all');
    setSearch('');
    setPanelOpen(false);
  };

  const chooseMode = (next: Mode) => {
    setMode(next);
    if (next === 'region') window.setTimeout(() => regionRef.current?.focus(), 0);
    else if (next === 'department') window.setTimeout(() => departmentRef.current?.focus(), 0);
    else setPanelOpen(false);
  };

  const typeCopy = TYPE_LABELS[institution] || TYPE_LABELS.all;
  const trimmedSearch = search.trim();
  const suffix = trimmedSearch ? ` · ricerca “${trimmedSearch}”` : '';
  const noun = results.length === 1 ? 'ateneo' : 'atenei';

  let description: React.ReactNode;
  if (mode === 'region') {
    description = (
      <>
        <strong>{results.length}</strong> {noun} tra {typeCopy} in <strong>{region}</strong>
        {suffix}
      </>
    );
  } else if (mode === 'ranking') {
    const qsCount = results.filter((entry) => entry.ranking.source === 'qs-general').length;
    const censisCount = results.filter((entry) => entry.ranking.source === 'censis-general').length;
    description = (
      <>
        <strong>{results.length}</strong> risultati tra {typeCopy}: <strong>{qsCount}</strong> con QS e{' '}
        <strong>{censisCount}</strong> con fallback CENSIS{suffix}
      </>
    );
  } else if (mode === 'department') {
    description = (
      <>
        <strong>{results.length}</strong> {noun} tra {typeCopy} con corsi nell’area <strong>{department}</strong>, ordinati
        con QS per materia e fallback CENSIS ufficiale{suffix}
      </>
    );
  } else {
    description = (
      <>
        <strong>{results.length}</strong> {noun} tra {typeCopy} in ordine alfabetico{suffix}
      </>
    );
  }

  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-wrap" ref={filterWrapRef}>
          <button
            className="filter-toggle"
            type="button"
            aria-expanded={panelOpen}
            aria-controls="filterPanel"
            onClick={() => setPanelOpen((open) => !open)}
          >
            <Icon name="filter" />
            <span>Filtra</span>
            <span className="active-filter-label">{MODE_LABELS[mode]}</span>
          </button>

          <div className="filter-panel" id="filterPanel" hidden={!panelOpen}>
            <p className="filter-panel-title">Ordina e raggruppa</p>
            <div className="filter-options">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  className={`filter-option${mode === option.mode ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={mode === option.mode}
                  onClick={() => chooseMode(option.mode)}
                >
                  <span className="filter-option-icon">{option.icon}</span>
                  <span className="filter-option-copy">
                    <strong>{option.title}</strong>
                    <small>{option.hint}</small>
                  </span>
                  <span className="filter-option-check" aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="conditional-filter-control" hidden={mode !== 'region'}>
              <label htmlFor="regionSelect">Scegli la regione</label>
              <select
                ref={regionRef}
                id="regionSelect"
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setPanelOpen(false);
                }}
              >
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="conditional-filter-control" hidden={mode !== 'department'}>
              <label htmlFor="departmentSelect">Scegli l’area disciplinare</label>
              <select
                ref={departmentRef}
                id="departmentSelect"
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setPanelOpen(false);
                }}
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <small>
                Gli atenei sono ordinati prima con il QS per materia; quando manca, il sito usa la classifica ufficiale
                CENSIS della didattica o dell’ateneo e indica chiaramente il tipo di fallback.
              </small>
            </div>
          </div>
        </div>

        <label className="institution-type-field" htmlFor="institutionTypeSelect">
          <span>Tipo di ateneo</span>
          <select
            id="institutionTypeSelect"
            value={institution}
            onChange={(event) => setInstitution(event.target.value as 'all' | InstitutionType)}
          >
            <option value="all">Tutti gli atenei</option>
            <option value="public">Università pubbliche</option>
            <option value="private">Università private</option>
            <option value="online">Università telematiche</option>
            <option value="institute">Istituti superiori</option>
          </select>
        </label>

        <label className="search-field" htmlFor="universitySearch">
          <Icon name="search" />
          <input
            id="universitySearch"
            type="search"
            placeholder="Cerca ateneo, città, regione o area…"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <span className="catalog-count">
          <strong>{results.length}</strong> voci
        </span>
      </div>

      <p className="catalog-meta" aria-live="polite">
        {description}
      </p>
      <div className="university-list">
        {!departmentReady ? <p className="catalog-meta">Caricamento dei ranking per area…</p> : null}
        {departmentReady && results.length
          ? results.map((entry, index) => {
              const department = mode === 'department' ? departmentRanking(entry) : undefined;
              const open = () => setOpenProfile(entry.id);
              return (
                <article
                  key={entry.id}
                  className="university-card"
                  id={entry.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Apri la scheda di ${entry.name}`}
                  onClick={open}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      open();
                    }
                  }}
                >
                  <div className="university-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="university-main">
                    <div className="university-badges">
                      <span className={`type-badge type-${categoryClass(entry.category)}`}>
                        {displayCategory(entry.category)}
                      </span>
                    </div>
                    <h2>{entry.name}</h2>
                    <p className="university-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                        <circle cx="12" cy="10" r="2" />
                      </svg>
                      <span>
                        {entry.city}, {entry.region}
                      </span>
                    </p>
                  </div>
                  <div className="university-ranking">
                    {mode === 'department' ? <DepartmentPill entry={department} /> : <GeneralPill entry={entry} />}
                    <span className="university-open-hint">Apri scheda →</span>
                  </div>
                </article>
              );
            })
          : null}
        {departmentReady && !results.length ? (
          <div className="catalog-empty">
            <span aria-hidden="true">?</span>
            <h2>Nessun ateneo trovato</h2>
            <p>Prova a cambiare ricerca, area, regione o tipologia di ateneo.</p>
            <button className="button button-secondary" type="button" onClick={resetFilters}>
              Azzera i filtri
            </button>
          </div>
        ) : null}
      </div>

      {openProfile ? <UniversityProfileModal key={openProfile} universityId={openProfile} onClose={closeProfile} /> : null}
    </>
  );
}

function GeneralPill({ entry }: { entry: CatalogEntry }) {
  const { ranking } = entry;
  if (ranking.source === 'unavailable') {
    return (
      <div className="qs-pill is-unranked">
        <span>Ranking ufficiale</span>
        <strong>n.d.</strong>
      </div>
    );
  }
  const censis = ranking.source === 'censis-general';
  return (
    <>
      <div className={`qs-pill${censis ? ' is-censis' : ''}`}>
        <span>{ranking.source === 'qs-general' ? 'QS 2027' : 'CENSIS 2026/27'}</span>
        <strong>{ranking.summary}</strong>
      </div>
      <span className="score-note">
        {censis ? 'categoria omogenea per dimensione/tipologia' : 'ranking internazionale generale'}
      </span>
    </>
  );
}

function DepartmentPill({ entry }: { entry: DepartmentEntry | undefined }) {
  if (!entry) return null;
  const { ranking, courseCount, enrolled } = entry;
  const censis = ranking.source.startsWith('censis');
  const label =
    ranking.source === 'qs-subject' ? `QS by Subject ${ranking.year}` : censis ? 'CENSIS 2026/27' : 'Ranking ufficiale';
  return (
    <>
      <div className={`area-pill${censis ? ' is-censis' : ''}`} title={ranking.note || ''}>
        <span>{label}</span>
        <strong>{ranking.summary || 'n.d.'}</strong>
      </div>
      <span className="score-note">
        {courseCount} {courseCount === 1 ? 'corso' : 'corsi'} · {integerFormatter.format(enrolled)} iscritti
      </span>
    </>
  );
}
