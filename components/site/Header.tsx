'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { journeyOf } from '@/lib/client/types';
import { JOURNEY_PHASE_LABELS, SITE_CONFIG, SITUATION_LABELS, STUDENT_TOOLS, STUDENT_TOOL_SITUATIONS } from '@/lib/site-config';
import { Icon, type IconName } from './Icons';
import { useSite } from './SiteProvider';

const NAV_ITEMS = [
  { href: '/atenei', label: 'atenei' },
  { href: '/comparison', label: 'comparison' },
  { href: '/trova-corso', label: 'trova il mio corso' },
  { href: '/preparazione', label: 'preparazione', enrollingOnly: true },
  { href: '/burocrazia', label: 'burocrazia', enrollingOnly: true },
  { href: '/scuole-aziende', label: 'scuole e aziende' }
];

export function Header() {
  const pathname = usePathname();
  const { user, openAuth, openJourneyEditor, signOut, showToast, getUniversity } = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setDropdownOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const showEnrollingTools = user?.profile.situation === 'enrolling';
  const localPart = user ? user.email.split('@')[0] || 'profilo' : '';
  const label = user ? (localPart.length > 15 ? `${localPart.slice(0, 14)}…` : localPart) : 'profilo';

  const journey = journeyOf(user);
  const journeySummary = journey
    ? [
        JOURNEY_PHASE_LABELS[journey.phase] || journey.phase,
        getUniversity(journey.universityId)?.shortName || getUniversity(journey.universityId)?.name,
        journey.year && journey.phase === 'enrolled' ? `${journey.year}° anno` : ''
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const toggleProfile = () => {
    if (!user) {
      openAuth('login');
      return;
    }
    setDropdownOpen((open) => !open);
  };

  return (
    <header className="site-header">
      <div className="header-shell">
        <Link className="brand" href="/" aria-label={`Vai alla homepage di ${SITE_CONFIG.name}`}>
          <span className="brand-mark" aria-hidden="true">
            u
          </span>
          <span className="brand-copy">
            <span className="brand-name">{SITE_CONFIG.name}</span>
            <span className="brand-note">{SITE_CONFIG.note}</span>
          </span>
        </Link>

        <button
          className="mobile-nav-button"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="primaryNav"
          aria-label={mobileOpen ? 'Chiudi il menu' : 'Apri il menu'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} />
        </button>

        <nav className={`primary-nav${mobileOpen ? ' is-open' : ''}`} id="primaryNav" aria-label="Navigazione principale">
          {NAV_ITEMS.filter((item) => !item.enrollingOnly || showEnrollingTools).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`nav-link${active ? ' is-active' : ''}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="profile-wrap" ref={wrapRef}>
          <button
            className={`profile-button${user ? ' is-logged-in' : ''}`}
            type="button"
            aria-haspopup={user ? 'menu' : 'dialog'}
            aria-expanded={dropdownOpen}
            onClick={(event) => {
              event.stopPropagation();
              toggleProfile();
            }}
          >
            <span className="profile-icon">
              <Icon name="profile" />
            </span>
            <span className="profile-label">{label}</span>
            <span className="profile-chevron">
              <Icon name="chevron" />
            </span>
          </button>

          {user && dropdownOpen ? (
            <div className="profile-dropdown" role="menu">
              <div className="profile-user-block">
                <span className="profile-avatar">{localPart.charAt(0).toUpperCase()}</span>
                <span className="profile-user-copy">
                  <strong>{user.email}</strong>
                  <small>{journeySummary || SITUATION_LABELS[user.profile.situation] || 'Profilo personale'}</small>
                </span>
              </div>

              {user.profile.situation === 'university' ? (
                <button
                  type="button"
                  className="profile-edit-journey"
                  onClick={() => {
                    setDropdownOpen(false);
                    openJourneyEditor();
                  }}
                >
                  <Icon name="edit" />
                  <span>{journey ? 'Modifica i dati del percorso' : 'Completa i dati del percorso'}</span>
                </button>
              ) : null}

              {STUDENT_TOOL_SITUATIONS.has(user.profile.situation) ? (
                <>
                  <p className="profile-section-label">Il tuo spazio</p>
                  <div className="profile-tools">
                    {STUDENT_TOOLS.map((tool) => (
                      <Link
                        key={tool.slug}
                        className="profile-tool"
                        href={`/area-studente/${tool.slug}`}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="tool-icon">
                          <Icon name={tool.icon as IconName} />
                        </span>
                        <span>{tool.label}</span>
                        <span className="tool-arrow">
                          <Icon name="arrow" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="profile-curious-note">
                  Il profilo è attivo. Puoi esplorare liberamente tutti i contenuti generali del sito.
                </p>
              )}

              <button
                type="button"
                className="profile-logout"
                role="menuitem"
                onClick={async () => {
                  setDropdownOpen(false);
                  await signOut();
                  showToast('Hai effettuato la disconnessione.');
                }}
              >
                <Icon name="logout" />
                <span>Esci dal profilo</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
