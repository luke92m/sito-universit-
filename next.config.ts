import type { NextConfig } from 'next';

// Vecchi URL statici della v8 → nuovi percorsi (i parametri di query vengono conservati).
const LEGACY_PAGES = ['atenei', 'comparison', 'trova-corso', 'preparazione', 'burocrazia', 'scuole-aziende'];

const nextConfig: NextConfig = {
  // Il dataset corsi viene letto dalle route API: va incluso nei bundle serverless.
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/data/*.json']
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      ...LEGACY_PAGES.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true })),
      // area-studente.html?sezione=community → /area-studente/community
      {
        source: '/area-studente.html',
        has: [{ type: 'query', key: 'sezione', value: '(?<sezione>[a-z-]+)' }],
        destination: '/area-studente/:sezione',
        permanent: true
      },
      { source: '/area-studente.html', destination: '/area-studente', permanent: true }
    ];
  }
};

export default nextConfig;
