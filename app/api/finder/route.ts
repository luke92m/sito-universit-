import { NextResponse } from 'next/server';
import { readFinderAnswers } from '@/lib/flow/journey-params';
import { shortLabel } from '@/lib/domain/official-rankings';
import { rankCandidates, targetFromChoice, type FinderResult } from '@/lib/domain/university-finder';

// "Trova la mia università": il punteggio richiede l'intero dataset corsi e gira sul server.

export interface FinderApiResult extends FinderResult {
  rankingText: string;
}

export interface FinderApiResponse {
  target: { type: 'course' | 'group'; label: string; group: string };
  results: FinderApiResult[];
  /** Senza telematiche non resta nulla, ma esistono risultati telematici. */
  telematicOnly: boolean;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const answers = readFinderAnswers((body as { answers?: unknown } | null)?.answers);
  if (!answers) return NextResponse.json({ error: 'Risposte non valide.' }, { status: 400 });

  const target = targetFromChoice(answers.courseChoice);
  if (!target) {
    return NextResponse.json(
      { error: 'Il corso selezionato non è più disponibile. Torna alla prima domanda.' },
      { status: 400 }
    );
  }

  const options = body as { includeTelematic?: unknown; includeDistance?: unknown };
  const includeTelematic = options.includeTelematic === true;
  const includeDistance = options.includeDistance === true;

  const all = rankCandidates(target, answers, { includeTelematic, includeDistance });
  const filtered = includeTelematic ? all : all.filter((item) => item.university.category !== 'Telematica');

  const payload: FinderApiResponse = {
    target: { type: target.type, label: target.label, group: target.group },
    results: filtered.slice(0, 30).map((item) => ({ ...item, rankingText: shortLabel(item.ranking) })),
    telematicOnly: !includeTelematic && !filtered.length && all.some((item) => item.university.category === 'Telematica')
  };
  return NextResponse.json(payload);
}
