// Icone SVG del sito (stesse forme della v8).
import type { ReactElement } from 'react';

const paths: Record<string, ReactElement> = {
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  sparkles: (
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
  ),
  calendar: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />,
  users: (
    <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20m5.5-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5m1 9c1.9 0 3.5 1.6 3.5 3.5V20" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  book: (
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
  ),
  edit: (
    <path d="m4 20 4.2-1 9.9-9.9-3.2-3.2L5 15.8 4 20Zm9.7-12.9 3.2 3.2M15.8 5l1.1-1.1a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L19 8.2" />
  ),
  logout: <path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9" />,
  filter: <path d="M4 6h16M7 12h10m-7 6h4" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </>
  )
};

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
