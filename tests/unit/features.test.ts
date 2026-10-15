import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { SECTION_META, activeSections, isActiveSection } from '@/lib/area-sections';
import { FEATURES, isEnabled } from '@/lib/features';
import { visibleNavItems, visibleStudentTools } from '@/lib/site-config';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// Le funzioni spente non devono comparire in navigazione, menu profilo, schede dell'area e sitemap.
describe('funzioni spente', () => {
  it('la configurazione attuale spegne le funzioni fuori dalla fase di scelta', () => {
    expect(Object.values(FEATURES).every((value) => value === false)).toBe(true);
  });

  it('account spenti: Supabase non viene usato anche se le chiavi ci sono', () => {
    expect(isEnabled('account')).toBe(false);
    expect(isSupabaseConfigured).toBe(false);
  });

  it('navigazione principale', () => {
    const hrefs = visibleNavItems().map((item) => item.href);
    // Menu del percorso di scelta: la burocrazia è l'ultimo passo del percorso e sta nel footer.
    expect(hrefs).toEqual(['/trova-corso', '/comparison', '/borse', '/atenei']);
    expect(visibleNavItems().every((item) => !item.feature || isEnabled(item.feature))).toBe(true);
  });

  it('menu profilo e schede dell’area personale', () => {
    expect(visibleStudentTools().map((tool) => tool.slug)).toEqual(['borse-di-studio', 'scadenze']);
    expect(activeSections()).toEqual(['dati-percorso', 'borse-di-studio', 'scadenze']);
    for (const key of ['community', 'libri-usati', 'accompagnamento'] as const) {
      expect(key in SECTION_META).toBe(true);
      expect(isActiveSection(key)).toBe(false);
    }
  });

  it('sitemap e robots', () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain('/trova-corso');
    expect(urls).not.toContain('/preparazione');
    expect(urls).not.toContain('/scuole-aziende');
    expect(urls.some((path) => path.startsWith('/area-studente'))).toBe(false);
    expect(String(robots().sitemap)).toMatch(/\/sitemap\.xml$/);
  });
});
