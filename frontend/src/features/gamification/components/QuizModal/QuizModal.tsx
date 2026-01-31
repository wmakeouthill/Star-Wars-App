import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DetailsModal } from '@/shared/components';
import type { PaginatedResponse } from '@/shared/types/common.types';
import type { Character } from '@/features/characters/types/characters.types';
import type { Film } from '@/features/films/types/films.types';
import type { Planet } from '@/features/planets/types/planets.types';
import type { Species } from '@/features/species/types/species.types';
import type { Starship } from '@/features/starships/types/starships.types';
import type { Vehicle } from '@/features/vehicles/types/vehicles.types';
import styles from './QuizModal.module.css';

type QuizOption = {
  id: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
};

type QuizModalProps = {
  open: boolean;
  onClose: () => void;
};

type QuizCategoryId = 'films' | 'planets' | 'starships' | 'vehicles' | 'species' | 'characters';

type QuizCategory = {
  id: QuizCategoryId;
  label: string;
  description: string;
};

type WithId = { id: string };

function uniqById<T extends WithId>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item?.id) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function normalizeText(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function splitCsv(value: string | null | undefined): string[] {
  const text = normalizeText(value);
  if (!text) return [];
  return text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const raw of values) {
    const v = normalizeText(raw);
    if (v) set.add(v);
  }
  return Array.from(set.values());
}

function getRandomSeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? Date.now();
  } catch {
    return Date.now();
  }
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleDistinct<T>(items: T[], count: number, rng: () => number): T[] {
  if (count <= 0) return [];
  const unique = Array.from(new Set(items));
  if (unique.length <= count) return shuffle(unique, rng).slice(0, count);
  return shuffle(unique, rng).slice(0, count);
}

function buildOptions(params: {
  correctLabel: string;
  pool: string[];
  optionsCount: number;
  rng: () => number;
}): { options: QuizOption[]; correctOptionId: string } | null {
  const { correctLabel, pool, optionsCount, rng } = params;
  const correct = normalizeText(correctLabel);
  if (!correct) return null;

  const candidates = pool.map((v) => normalizeText(v)).filter(Boolean) as string[];
  const uniquePool = Array.from(new Set(candidates));
  const distractorPool = uniquePool.filter((v) => v !== correct);
  const neededDistractors = Math.max(0, optionsCount - 1);
  if (distractorPool.length < neededDistractors) return null;

  const distractors = sampleDistinct(distractorPool, neededDistractors, rng);
  const labels = shuffle([correct, ...distractors], rng);
  const options = labels.map((label, idx) => ({ id: `opt-${idx}-${label}`, label }));
  const correctOptionId = options.find((o) => o.label === correct)?.id;
  if (!correctOptionId) return null;
  return { options, correctOptionId };
}

function createQuestion(params: {
  id: string;
  prompt: string;
  correctLabel: string;
  pool: string[];
  optionsCount: number;
  rng: () => number;
}): QuizQuestion | null {
  const { id, prompt, correctLabel, pool, optionsCount, rng } = params;
  const built = buildOptions({ correctLabel, pool, optionsCount, rng });
  if (!built) return null;
  return {
    id,
    prompt,
    options: built.options,
    correctOptionId: built.correctOptionId,
  };
}

function getCachedPaginatedItems<T extends WithId>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKeyPrefix: string
): T[] {
  const entries = queryClient.getQueriesData<PaginatedResponse<T>>({
    queryKey: [queryKeyPrefix],
  });
  const all: T[] = [];
  for (const [, data] of entries) {
    if (!data?.items?.length) continue;
    all.push(...data.items);
  }
  return uniqById(all);
}

const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'characters',
    label: 'Personagens',
    description: 'Gênero e planeta natal (quando disponível).',
  },
  {
    id: 'planets',
    label: 'Planetas',
    description: 'Climas e características.',
  },
  {
    id: 'films',
    label: 'Filmes',
    description: 'Diretores e dados do episódio.',
  },
  {
    id: 'starships',
    label: 'Naves',
    description: 'Fabricantes e detalhes técnicos.',
  },
  {
    id: 'vehicles',
    label: 'Veículos',
    description: 'Classes e fabricantes.',
  },
  {
    id: 'species',
    label: 'Espécies',
    description: 'Idiomas e classificação.',
  },
];

function buildQuizFromCache(params: {
  queryClient: ReturnType<typeof useQueryClient>;
  questionCount: number;
  optionsCount: number;
  enabledCategories: QuizCategoryId[];
  seed?: number;
}): QuizQuestion[] {
  const { queryClient, questionCount, optionsCount, enabledCategories, seed } = params;
  if (!enabledCategories.length) return [];
  const rng = mulberry32(seed ?? getRandomSeed());

  const characters = getCachedPaginatedItems<Character>(queryClient, 'characters');
  const planets = getCachedPaginatedItems<Planet>(queryClient, 'planets');
  const films = getCachedPaginatedItems<Film>(queryClient, 'films');
  const starships = getCachedPaginatedItems<Starship>(queryClient, 'starships');
  const vehicles = getCachedPaginatedItems<Vehicle>(queryClient, 'vehicles');
  const species = getCachedPaginatedItems<Species>(queryClient, 'species');

  const planetNames = uniqueStrings(planets.map((p) => p.name));
  const filmDirectors = uniqueStrings(films.map((f) => f.director));
  const planetClimates = uniqueStrings(planets.flatMap((p) => splitCsv(p.climate)));
  const starshipManufacturers = uniqueStrings(starships.flatMap((s) => splitCsv(s.manufacturer)));
  const vehicleClasses = uniqueStrings(vehicles.map((v) => v.vehicle_class));
  const speciesLanguages = uniqueStrings(species.map((s) => s.language));
  const characterGenders = uniqueStrings(characters.map((c) => c.gender));

  const generatorDefs: Array<{
    category: QuizCategoryId;
    generate: () => QuizQuestion | null;
  }> = [
    {
      category: 'films',
      generate: () => {
        const eligible = films.filter((f) => normalizeText(f.director) && normalizeText(f.title));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `film-director-${picked.id}`,
          prompt: `Quem dirigiu o filme “${picked.title}”?`,
          correctLabel: picked.director,
          pool: filmDirectors,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'planets',
      generate: () => {
        const eligible = planets.filter((p) => splitCsv(p.climate).length > 0 && normalizeText(p.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const climates = splitCsv(picked.climate);
        const correct = climates[Math.floor(rng() * climates.length)];
        if (!correct) return null;
        return createQuestion({
          id: `planet-climate-${picked.id}`,
          prompt: `Qual é um dos climas de ${picked.name}?`,
          correctLabel: correct,
          pool: planetClimates,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'starships',
      generate: () => {
        const eligible = starships.filter((s) => splitCsv(s.manufacturer).length > 0 && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const manufacturers = splitCsv(picked.manufacturer);
        const correct = manufacturers[Math.floor(rng() * manufacturers.length)];
        if (!correct) return null;
        return createQuestion({
          id: `starship-manufacturer-${picked.id}`,
          prompt: `Quem é um dos fabricantes da nave “${picked.name}”?`,
          correctLabel: correct,
          pool: starshipManufacturers,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'vehicles',
      generate: () => {
        const eligible = vehicles.filter((v) => normalizeText(v.vehicle_class) && normalizeText(v.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `vehicle-class-${picked.id}`,
          prompt: `Qual é a classe do veículo “${picked.name}”?`,
          correctLabel: picked.vehicle_class,
          pool: vehicleClasses,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'species',
      generate: () => {
        const eligible = species.filter((s) => normalizeText(s.language) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `species-language-${picked.id}`,
          prompt: `Qual é o idioma associado à espécie “${picked.name}”?`,
          correctLabel: picked.language,
          pool: speciesLanguages,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.gender) && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `character-gender-${picked.id}`,
          prompt: `Qual é o gênero de “${picked.name}”?`,
          correctLabel: picked.gender,
          pool: characterGenders,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.homeworld?.name) && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `character-homeworld-${picked.id}`,
          prompt: `Qual é o planeta natal de “${picked.name}”?`,
          correctLabel: picked.homeworld?.name ?? '',
          pool: planetNames,
          optionsCount,
          rng,
        });
      },
    },
  ];

  const generators = generatorDefs
    .filter((g) => enabledCategories.includes(g.category))
    .map((g) => g.generate);

  // Gera até N perguntas, evitando duplicatas por id/prompt.
  const questions: QuizQuestion[] = [];
  const usedIds = new Set<string>();
  const usedPrompts = new Set<string>();
  const maxAttempts = Math.max(30, questionCount * 12);

  for (let i = 0; i < maxAttempts && questions.length < questionCount; i += 1) {
    if (!generators.length) break;
    const gen = generators[Math.floor(rng() * generators.length)];
    const q = gen?.() ?? null;
    if (!q) continue;
    if (usedIds.has(q.id)) continue;
    if (usedPrompts.has(q.prompt)) continue;
    usedIds.add(q.id);
    usedPrompts.add(q.prompt);
    questions.push(q);
  }

  return questions;
}

type QuizResult = { isCorrect: boolean; correctLabel: string };

function QuizQuestionView({
  question,
  selectedOptionId,
  revealed,
  result,
  onPick,
  onNext,
  isLast,
}: Readonly<{
  question: QuizQuestion;
  selectedOptionId: string | null;
  revealed: boolean;
  result: QuizResult | null;
  onPick: (optionId: string) => void;
  onNext: () => void;
  isLast: boolean;
}>) {
  return (
    <div className={styles.question}>
      <div className={styles.prompt}>{question.prompt}</div>

      <div className={styles.options}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = revealed && opt.id === question.correctOptionId;
          const isWrong = revealed && isSelected && opt.id !== question.correctOptionId;

          return (
            <button
              key={opt.id}
              type="button"
              className={[
                styles.option,
                isCorrect ? styles.optionCorrect : '',
                isWrong ? styles.optionWrong : '',
                isSelected ? styles.optionSelected : '',
              ].join(' ')}
              onClick={() => onPick(opt.id)}
              disabled={revealed}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={result.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result.isCorrect ? 'Correto!' : `Incorreto. Resposta certa: ${result.correctLabel}`}
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.primaryButton} onClick={onNext} disabled={!revealed}>
          {isLast ? 'Finalizar' : 'Próxima'}
        </button>
      </div>
    </div>
  );
}

export function QuizModal({ open, onClose }: Readonly<QuizModalProps>) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'setup' | 'playing'>('setup');
  const [selectedCategories, setSelectedCategories] = useState<QuizCategoryId[]>(
    QUIZ_CATEGORIES.map((c) => c.id)
  );
  const [setupError, setSetupError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const resetRun = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setRevealed(false);
    setScore(0);
  }, []);

  const regenerate = useCallback(
    (categories: QuizCategoryId[]) => {
      const next = buildQuizFromCache({
        queryClient,
        questionCount: 10,
        optionsCount: 4,
        enabledCategories: categories,
      });
      setQuestions(next);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setRevealed(false);
      setScore(0);
    },
    [queryClient]
  );

  const start = useCallback(() => {
    setSetupError(null);
    if (!selectedCategories.length) {
      setSetupError('Selecione pelo menos uma categoria para iniciar.');
      return;
    }
    regenerate(selectedCategories);
    setMode('playing');
  }, [regenerate, selectedCategories]);

  const goToSetup = useCallback(() => {
    setSetupError(null);
    setMode('setup');
    resetRun();
  }, [resetRun]);

  const toggleCategory = (id: QuizCategoryId) => {
    setSetupError(null);
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSetupError(null);
    setSelectedCategories(QUIZ_CATEGORIES.map((c) => c.id));
  };

  const selectNone = () => {
    setSetupError(null);
    setSelectedCategories([]);
  };

  const reroll = useCallback(() => {
    const next = buildQuizFromCache({
      queryClient,
      questionCount: 10,
      optionsCount: 4,
      enabledCategories: selectedCategories,
    });
    setQuestions(next);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setRevealed(false);
    setScore(0);
  }, [queryClient, selectedCategories]);

  useEffect(() => {
    if (!open) return;
    // Sempre volta para a tela de seleção ao abrir
    setMode('setup');
    setSetupError(null);
    setSelectedCategories(QUIZ_CATEGORIES.map((c) => c.id));
    resetRun();
  }, [open, resetRun]);

  const current = questions[currentIndex] ?? null;
  const total = questions.length;
  const isFinished = total > 0 && currentIndex >= total;

  const result = useMemo(() => {
    if (!current || !revealed || !selectedOptionId) return null;
    const isCorrect = selectedOptionId === current.correctOptionId;
    const correctLabel = current.options.find((o) => o.id === current.correctOptionId)?.label ?? '—';
    return { isCorrect, correctLabel };
  }, [current, revealed, selectedOptionId]);

  const onPick = (optionId: string) => {
    if (!current) return;
    if (revealed) return;
    setSelectedOptionId(optionId);
    setRevealed(true);
    if (optionId === current.correctOptionId) {
      setScore((prev) => prev + 1);
    }
  };

  const goNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setSelectedOptionId(null);
    setRevealed(false);
  };

  let body: React.ReactNode = null;
  if (mode === 'setup') {
    body = (
      <div className={styles.setup}>
        <div className={styles.setupTitle}>Escolha suas categorias</div>
        <div className={styles.setupText}>
          Selecione os temas sobre os quais você quer responder. As perguntas são geradas dinamicamente a partir do cache
          (dados já carregados pela aplicação).
        </div>

        <div className={styles.categoryActions}>
          <button type="button" className={styles.secondaryButton} onClick={selectAll}>
            Selecionar tudo
          </button>
          <button type="button" className={styles.secondaryButton} onClick={selectNone}>
            Limpar seleção
          </button>
        </div>

        <div className={styles.categoryGrid}>
          {QUIZ_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={[styles.categoryCard, active ? styles.categoryCardActive : ''].join(' ')}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className={styles.categoryTitle}>
                  <span className={styles.categoryCheckbox} aria-hidden="true">
                    {active ? '✓' : ''}
                  </span>
                  {cat.label}
                </div>
                <div className={styles.categoryDescription}>{cat.description}</div>
              </button>
            );
          })}
        </div>

        {setupError && <div className={styles.setupError}>{setupError}</div>}

        <div className={styles.setupFooter}>
          <button type="button" className={styles.primaryButton} onClick={start}>
            Iniciar
          </button>
        </div>
      </div>
    );
  } else if (total === 0) {
    body = (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Ainda não há dados suficientes no cache.</div>
        <div className={styles.emptyText}>
          Dica: navegue pelo <strong>Dashboard</strong> ou por alguma lista (Personagens/Planetas/Filmes…) e volte aqui. O
          quizz usa os dados que já foram carregados pela aplicação.
        </div>
        <div className={styles.finishActions}>
          <button type="button" className={styles.secondaryButton} onClick={goToSetup}>
            Trocar categorias
          </button>
        </div>
      </div>
    );
  } else if (isFinished) {
    body = (
      <div className={styles.finish}>
        <div className={styles.finishTitle}>Fim de jogo</div>
        <div className={styles.finishScore}>
          Você fez <strong>{score}</strong> de <strong>{total}</strong>.
        </div>
        <div className={styles.finishActions}>
          <button type="button" className={styles.primaryButton} onClick={reroll}>
            Jogar de novo
          </button>
          <button type="button" className={styles.secondaryButton} onClick={goToSetup}>
            Trocar categorias
          </button>
        </div>
      </div>
    );
  } else if (current) {
    body = (
      <QuizQuestionView
        question={current}
        selectedOptionId={selectedOptionId}
        revealed={revealed}
        result={result}
        onPick={onPick}
        onNext={goNext}
        isLast={currentIndex + 1 >= total}
      />
    );
  }

  return (
    <DetailsModal open={open} title="Quizz" onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.status}>
            {mode === 'playing' && total > 0 ? (
              <>
                <span className={styles.badge}>
                  Pergunta {Math.min(currentIndex + 1, total)} de {total}
                </span>
                <span className={styles.badge}>Pontuação: {score}</span>
              </>
            ) : (
              <span className={styles.badge}>{mode === 'setup' ? 'Configuração' : 'Sem perguntas'}</span>
            )}
          </div>

          <div className={styles.actions}>
            {mode === 'playing' ? (
              <>
                <button type="button" className={styles.secondaryButton} onClick={reroll}>
                  Recarregar
                </button>
                <button type="button" className={styles.secondaryButton} onClick={goToSetup}>
                  Categorias
                </button>
              </>
            ) : null}
          </div>
        </div>

        {body}
      </div>
    </DetailsModal>
  );
}

