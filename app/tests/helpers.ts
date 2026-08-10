import { answerEvent, type ProgressEvent } from '@core/progress/events';
import { mulberry32, uuidv4, type Rng } from '@core/ids';
import type { Pack } from '@core/content/schema';

/** Fábrica de eventos con ids reproducibles, para pruebas comparables. */
export function fabricaEventos(seed = 1) {
  const rng: Rng = mulberry32(seed);
  let reloj = 1_700_000_000_000;

  return {
    rng,
    respuesta(
      studentId: string,
      opts: Partial<{ skill: string; correct: boolean; device: string; packId: string }> = {},
    ): ProgressEvent {
      reloj += 1000;
      return answerEvent({
        id: uuidv4(rng),
        studentId,
        originDevice: opts.device ?? 'dev-a',
        createdAt: reloj,
        itemId: `it-${reloj}`,
        packId: opts.packId ?? 'eng.saludos.1',
        skill: opts.skill ?? 'eng.saludos',
        correct: opts.correct ?? true,
        ms: 1200,
      });
    },
  };
}

export const packDemo: Pack = {
  id: 'eng.saludos.1',
  lang: 'eng',
  theme: 'saludos',
  difficulty: 1,
  title: 'Saludos',
  items: [
    {
      id: 'e1',
      type: 'choice',
      skill: 'eng.saludos',
      prompt: 'Buenos días',
      answer: 'Good morning',
      options: ['Good morning', 'Good night', 'Goodbye'],
    },
    {
      id: 'e2',
      type: 'choice',
      skill: 'eng.saludos',
      prompt: 'Gracias',
      answer: 'Thank you',
      options: ['Thank you', 'Please', 'Sorry'],
    },
    {
      id: 'e3',
      type: 'build',
      skill: 'eng.presentarse',
      target: 'My name is Piko',
      blocks: ['My', 'name', 'is', 'Piko', 'your'],
      gloss: 'Mi nombre es Piko',
    },
    {
      id: 'e4',
      type: 'listen',
      skill: 'eng.numeros',
      audio: 'eng/numeros/three.m4a',
      answer: 'three',
      options: ['three', 'tree', 'free'],
      gloss: 'tres',
    },
  ],
};
