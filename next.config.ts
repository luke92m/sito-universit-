import type { NextConfig } from 'next';
import { isEnabled } from './lib/features';

// Con gli account spenti (lib/features.ts) area personale e pagine di accesso portano alle borse, pubbliche.
const ACCOUNT_PATHS = ['/area-studente', '/area-studente/:path*', '/auth/:path*', '/reimposta-password', '/accesso-non-riuscito'];

// Vecchi URL statici della v8 → nuovi percorsi (i parametri di query vengono conservati).
const LEGACY_PAGES = ['atenei', 'comparison', 'trova-corso', 'preparazione', 'burocrazia', 'scuole-aziende'];

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: 'security'
  },
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
      { source: '/area-studente.html', destination: '/area-studente', permanent: true },
      ...(isEnabled('account')
        ? []
        : ACCOUNT_PATHS.map((source) => ({ source, destination: '/borse', permanent: false })))
    ];
  }
};

export default nextConfig;
