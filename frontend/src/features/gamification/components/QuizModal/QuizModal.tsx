import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DetailsModal } from '@/shared/components';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuizLeaderboard, useSubmitQuizResult } from '../../hooks/useGamification';
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
  
  // Adaptação: usa quantos distratores tivermos disponíveis (mínimo 1)
  // Se só temos 2 diretores de filme, teremos 2 opções em vez de 4
  const availableDistractors = distractorPool.length;
  if (availableDistractors < 1) return null; // Precisa de pelo menos 1 distrator
  
  const actualDistractors = Math.min(availableDistractors, optionsCount - 1);
  const distractors = sampleDistinct(distractorPool, actualDistractors, rng);
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
    description: 'Gênero, planeta natal, cor dos olhos, cabelo e pele.',
  },
  {
    id: 'planets',
    label: 'Planetas',
    description: 'Climas, terrenos e características.',
  },
  {
    id: 'films',
    label: 'Filmes',
    description: 'Diretores, produtores e episódios.',
  },
  {
    id: 'starships',
    label: 'Naves',
    description: 'Fabricantes, classes e modelos.',
  },
  {
    id: 'vehicles',
    label: 'Veículos',
    description: 'Classes, fabricantes e modelos.',
  },
  {
    id: 'species',
    label: 'Espécies',
    description: 'Idiomas, classificação e designação.',
  },
];

// Retorna estatísticas do cache para cada categoria
function getCacheStats(queryClient: ReturnType<typeof useQueryClient>): Record<QuizCategoryId, number> {
  const characters = getCachedPaginatedItems<Character>(queryClient, 'characters');
  const planets = getCachedPaginatedItems<Planet>(queryClient, 'planets');
  const films = getCachedPaginatedItems<Film>(queryClient, 'films');
  const starships = getCachedPaginatedItems<Starship>(queryClient, 'starships');
  const vehicles = getCachedPaginatedItems<Vehicle>(queryClient, 'vehicles');
  const species = getCachedPaginatedItems<Species>(queryClient, 'species');

  return {
    characters: characters.length,
    planets: planets.length,
    films: films.length,
    starships: starships.length,
    vehicles: vehicles.length,
    species: species.length,
  };
}

// Calcula quantas perguntas podem ser geradas com os dados disponíveis
function estimateMaxQuestions(
  queryClient: ReturnType<typeof useQueryClient>,
  enabledCategories: QuizCategoryId[]
): number {
  const stats = getCacheStats(queryClient);
  let total = 0;
  for (const cat of enabledCategories) {
    // Cada categoria pode gerar aproximadamente N perguntas (com múltiplos tipos)
    const count = stats[cat];
    if (count > 0) {
      // Multiplica por quantidade de tipos de perguntas por categoria
      let multiplier = 2;
      if (cat === 'characters') multiplier = 5;
      else if (cat === 'films') multiplier = 3;
      else if (cat === 'planets') multiplier = 3;
      total += Math.min(count * multiplier, 20); // Cap por categoria
    }
  }
  return total;
}

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
  const filmProducers = uniqueStrings(films.flatMap((f) => splitCsv(f.producer)));
  const filmTitles = uniqueStrings(films.map((f) => f.title));
  const planetClimates = uniqueStrings(planets.flatMap((p) => splitCsv(p.climate)));
  const planetTerrains = uniqueStrings(planets.flatMap((p) => splitCsv(p.terrain)));
  const starshipManufacturers = uniqueStrings(starships.flatMap((s) => splitCsv(s.manufacturer)));
  const starshipClasses = uniqueStrings(starships.map((s) => s.starship_class));
  const starshipModels = uniqueStrings(starships.map((s) => s.model));
  const vehicleClasses = uniqueStrings(vehicles.map((v) => v.vehicle_class));
  const vehicleManufacturers = uniqueStrings(vehicles.flatMap((v) => splitCsv(v.manufacturer)));
  const vehicleModels = uniqueStrings(vehicles.map((v) => v.model));
  const speciesLanguages = uniqueStrings(species.map((s) => s.language));
  const speciesClassifications = uniqueStrings(species.map((s) => s.classification));
  const speciesDesignations = uniqueStrings(species.map((s) => s.designation));
  const characterGenders = uniqueStrings(characters.map((c) => c.gender));
  const characterEyeColors = uniqueStrings(characters.flatMap((c) => splitCsv(c.eye_color)));
  const characterHairColors = uniqueStrings(characters.flatMap((c) => splitCsv(c.hair_color)));
  const characterSkinColors = uniqueStrings(characters.flatMap((c) => splitCsv(c.skin_color)));
  const characterNames = uniqueStrings(characters.map((c) => c.name));

  const generatorDefs: Array<{
    category: QuizCategoryId;
    generate: () => QuizQuestion | null;
  }> = [
    // ===== FILMES (3 tipos de pergunta) =====
    {
      category: 'films',
      generate: () => {
        const eligible = films.filter((f) => normalizeText(f.director) && normalizeText(f.title));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `film-director-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Quem dirigiu o filme "${picked.title}"?`,
          correctLabel: picked.director,
          pool: filmDirectors,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'films',
      generate: () => {
        const eligible = films.filter((f) => splitCsv(f.producer).length > 0 && normalizeText(f.title));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const producers = splitCsv(picked.producer);
        const correct = producers[Math.floor(rng() * producers.length)];
        if (!correct) return null;
        return createQuestion({
          id: `film-producer-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Quem foi um dos produtores de "${picked.title}"?`,
          correctLabel: correct,
          pool: filmProducers,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'films',
      generate: () => {
        const eligible = films.filter((f) => f.episode_id && normalizeText(f.title));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const episodeNumbers = eligible.map((f) => `Episódio ${f.episode_id}`);
        return createQuestion({
          id: `film-episode-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o número do episódio de "${picked.title}"?`,
          correctLabel: `Episódio ${picked.episode_id}`,
          pool: episodeNumbers,
          optionsCount,
          rng,
        });
      },
    },
    // ===== PLANETAS (2 tipos de pergunta) =====
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
          id: `planet-climate-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é um dos climas de ${picked.name}?`,
          correctLabel: correct,
          pool: planetClimates,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'planets',
      generate: () => {
        const eligible = planets.filter((p) => splitCsv(p.terrain).length > 0 && normalizeText(p.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const terrains = splitCsv(picked.terrain);
        const correct = terrains[Math.floor(rng() * terrains.length)];
        if (!correct) return null;
        return createQuestion({
          id: `planet-terrain-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é um dos terrenos de ${picked.name}?`,
          correctLabel: correct,
          pool: planetTerrains,
          optionsCount,
          rng,
        });
      },
    },
    // ===== NAVES (3 tipos de pergunta) =====
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
          id: `starship-manufacturer-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Quem é um dos fabricantes da nave "${picked.name}"?`,
          correctLabel: correct,
          pool: starshipManufacturers,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'starships',
      generate: () => {
        const eligible = starships.filter((s) => normalizeText(s.starship_class) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `starship-class-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a classe da nave "${picked.name}"?`,
          correctLabel: picked.starship_class,
          pool: starshipClasses,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'starships',
      generate: () => {
        const eligible = starships.filter((s) => normalizeText(s.model) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `starship-model-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o modelo da nave "${picked.name}"?`,
          correctLabel: picked.model,
          pool: starshipModels,
          optionsCount,
          rng,
        });
      },
    },
    // ===== VEÍCULOS (3 tipos de pergunta) =====
    {
      category: 'vehicles',
      generate: () => {
        const eligible = vehicles.filter((v) => normalizeText(v.vehicle_class) && normalizeText(v.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `vehicle-class-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a classe do veículo "${picked.name}"?`,
          correctLabel: picked.vehicle_class,
          pool: vehicleClasses,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'vehicles',
      generate: () => {
        const eligible = vehicles.filter((v) => splitCsv(v.manufacturer).length > 0 && normalizeText(v.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const manufacturers = splitCsv(picked.manufacturer);
        const correct = manufacturers[Math.floor(rng() * manufacturers.length)];
        if (!correct) return null;
        return createQuestion({
          id: `vehicle-manufacturer-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Quem fabricou o veículo "${picked.name}"?`,
          correctLabel: correct,
          pool: vehicleManufacturers,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'vehicles',
      generate: () => {
        const eligible = vehicles.filter((v) => normalizeText(v.model) && normalizeText(v.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `vehicle-model-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o modelo do veículo "${picked.name}"?`,
          correctLabel: picked.model,
          pool: vehicleModels,
          optionsCount,
          rng,
        });
      },
    },
    // ===== ESPÉCIES (3 tipos de pergunta) =====
    {
      category: 'species',
      generate: () => {
        const eligible = species.filter((s) => normalizeText(s.language) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `species-language-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o idioma associado à espécie "${picked.name}"?`,
          correctLabel: picked.language,
          pool: speciesLanguages,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'species',
      generate: () => {
        const eligible = species.filter((s) => normalizeText(s.classification) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `species-classification-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a classificação da espécie "${picked.name}"?`,
          correctLabel: picked.classification,
          pool: speciesClassifications,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'species',
      generate: () => {
        const eligible = species.filter((s) => normalizeText(s.designation) && normalizeText(s.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `species-designation-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a designação da espécie "${picked.name}"?`,
          correctLabel: picked.designation,
          pool: speciesDesignations,
          optionsCount,
          rng,
        });
      },
    },
    // ===== PERSONAGENS (5 tipos de pergunta) =====
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.gender) && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        return createQuestion({
          id: `character-gender-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o gênero de "${picked.name}"?`,
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
          id: `character-homeworld-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é o planeta natal de "${picked.name}"?`,
          correctLabel: picked.homeworld?.name ?? '',
          pool: planetNames,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.eye_color) && c.eye_color !== 'unknown' && c.eye_color !== 'n/a' && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const eyeColors = splitCsv(picked.eye_color);
        const correct = eyeColors[Math.floor(rng() * eyeColors.length)];
        if (!correct) return null;
        return createQuestion({
          id: `character-eyecolor-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a cor dos olhos de "${picked.name}"?`,
          correctLabel: correct,
          pool: characterEyeColors.filter((c) => c !== 'unknown' && c !== 'n/a'),
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.hair_color) && c.hair_color !== 'none' && c.hair_color !== 'n/a' && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const hairColors = splitCsv(picked.hair_color);
        const correct = hairColors[Math.floor(rng() * hairColors.length)];
        if (!correct || correct === 'none' || correct === 'n/a') return null;
        return createQuestion({
          id: `character-haircolor-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a cor do cabelo de "${picked.name}"?`,
          correctLabel: correct,
          pool: characterHairColors.filter((c) => c !== 'none' && c !== 'n/a'),
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'characters',
      generate: () => {
        const eligible = characters.filter((c) => normalizeText(c.skin_color) && c.skin_color !== 'unknown' && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked) return null;
        const skinColors = splitCsv(picked.skin_color);
        const correct = skinColors[Math.floor(rng() * skinColors.length)];
        if (!correct) return null;
        return createQuestion({
          id: `character-skincolor-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Qual é a cor da pele de "${picked.name}"?`,
          correctLabel: correct,
          pool: characterSkinColors.filter((c) => c !== 'unknown'),
          optionsCount,
          rng,
        });
      },
    },
    // ===== PERGUNTAS CRUZADAS (relacionam categorias) =====
    {
      category: 'characters',
      generate: () => {
        // Personagem -> Filme que aparece
        const eligible = characters.filter((c) => c.films && c.films.length > 0 && normalizeText(c.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked?.films?.length) return null;
        const filmAppearance = picked.films[Math.floor(rng() * picked.films.length)];
        if (!filmAppearance?.title) return null;
        return createQuestion({
          id: `character-film-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Em qual filme "${picked.name}" aparece?`,
          correctLabel: filmAppearance.title,
          pool: filmTitles,
          optionsCount,
          rng,
        });
      },
    },
    {
      category: 'planets',
      generate: () => {
        // Planeta -> Residente famoso
        const eligible = planets.filter((p) => p.residents && p.residents.length > 0 && normalizeText(p.name));
        const picked = eligible[Math.floor(rng() * eligible.length)];
        if (!picked?.residents?.length) return null;
        const resident = picked.residents[Math.floor(rng() * picked.residents.length)];
        if (!resident?.name) return null;
        return createQuestion({
          id: `planet-resident-${picked.id}-${Math.floor(rng() * 10000)}`,
          prompt: `Quem é um residente de ${picked.name}?`,
          correctLabel: resident.name,
          pool: characterNames,
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
  const { status: authStatus } = useAuth();
  const isAuthenticated = authStatus === 'authenticated';

  const leaderboardQuery = useQuizLeaderboard(10);
  const submitMutation = useSubmitQuizResult();

  const [mode, setMode] = useState<'setup' | 'playing'>('setup');
  const [selectedCategories, setSelectedCategories] = useState<QuizCategoryId[]>(
    QUIZ_CATEGORIES.map((c) => c.id)
  );
  const [setupError, setSetupError] = useState<string | null>(null);
  // Cache stats para mostrar na UI
  const [cacheStats, setCacheStats] = useState<Record<QuizCategoryId, number>>({
    characters: 0,
    planets: 0,
    films: 0,
    starships: 0,
    vehicles: 0,
    species: 0,
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  // Flag para evitar submit duplicado
  const submittedRef = useRef(false);

  // Atualiza estatísticas de cache quando o modal abre
  useEffect(() => {
    if (open) {
      setCacheStats(getCacheStats(queryClient));
    }
  }, [open, queryClient]);

  const totalCacheItems = useMemo(
    () => selectedCategories.reduce((sum, cat) => sum + (cacheStats[cat] || 0), 0),
    [selectedCategories, cacheStats]
  );

  const maxQuestionsAvailable = useMemo(
    () => estimateMaxQuestions(queryClient, selectedCategories),
    [queryClient, selectedCategories]
  );

  const resetRun = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setRevealed(false);
    setScore(0);
    setXpEarned(null);
    submittedRef.current = false;
  }, []);

  const regenerate = useCallback(
    (categories: QuizCategoryId[]) => {
      // Usa número dinâmico de perguntas: min 3, max 10, baseado nos dados disponíveis
      const maxAvailable = estimateMaxQuestions(queryClient, categories);
      const questionCount = Math.max(3, Math.min(10, maxAvailable));
      
      const next = buildQuizFromCache({
        queryClient,
        questionCount,
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
    
    // Verifica se há dados suficientes (mínimo 3 perguntas possíveis)
    const maxAvailable = estimateMaxQuestions(queryClient, selectedCategories);
    if (maxAvailable < 3) {
      setSetupError(
        `Dados insuficientes para gerar o quiz (${totalCacheItems} itens em cache). ` +
        'Navegue pelo Dashboard ou listas para carregar mais dados.'
      );
      return;
    }
    
    regenerate(selectedCategories);
    setMode('playing');
  }, [regenerate, selectedCategories, queryClient, totalCacheItems]);

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
    // Usa número dinâmico de perguntas: min 3, max 10
    const maxAvailable = estimateMaxQuestions(queryClient, selectedCategories);
    const questionCount = Math.max(3, Math.min(10, maxAvailable));
    
    const next = buildQuizFromCache({
      queryClient,
      questionCount,
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

  // Envia resultado ao backend quando o quiz termina (apenas se autenticado)
  useEffect(() => {
    if (!isFinished) return;
    if (!isAuthenticated) return;
    if (submittedRef.current) return;
    if (total === 0) return;

    submittedRef.current = true;
    submitMutation.mutate(
      {
        score,
        correct_answers: score,
        total_questions: total,
        categories: selectedCategories,
      },
      {
        onSuccess: (data) => {
          setXpEarned(data.xp_earned);
        },
      }
    );
  }, [isFinished, isAuthenticated, score, total, selectedCategories, submitMutation]);

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
            const itemCount = cacheStats[cat.id] || 0;
            const hasData = itemCount > 0;
            return (
              <button
                key={cat.id}
                type="button"
                className={[
                  styles.categoryCard,
                  active ? styles.categoryCardActive : '',
                  hasData ? '' : styles.categoryCardEmpty,
                ].join(' ')}
                onClick={() => toggleCategory(cat.id)}
                disabled={!hasData}
                title={hasData ? undefined : 'Sem dados em cache. Navegue pela seção correspondente para carregar.'}
              >
                <div className={styles.categoryTitle}>
                  <span className={styles.categoryCheckbox} aria-hidden="true">
                    {active ? '✓' : ''}
                  </span>
                  {cat.label}
                  <span className={styles.categoryBadge} data-empty={!hasData}>
                    {itemCount}
                  </span>
                </div>
                <div className={styles.categoryDescription}>{cat.description}</div>
              </button>
            );
          })}
        </div>

        {/* Info sobre perguntas disponíveis */}
        <div className={styles.setupStats}>
          <span>
            {totalCacheItems} itens em cache • até {Math.min(maxQuestionsAvailable, 10)} perguntas
          </span>
        </div>

        {setupError && <div className={styles.setupError}>{setupError}</div>}

        <div className={styles.setupFooter}>
          <button 
            type="button" 
            className={styles.primaryButton} 
            onClick={start}
            disabled={maxQuestionsAvailable < 3}
          >
            Iniciar {maxQuestionsAvailable >= 3 ? `(${Math.min(maxQuestionsAvailable, 10)} perguntas)` : ''}
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

        {isAuthenticated && xpEarned !== null && (
          <div className={styles.xpEarned}>+{xpEarned} XP ganhos!</div>
        )}
        {isAuthenticated && submitMutation.isPending && (
          <div className={styles.xpPending}>Salvando resultado…</div>
        )}
        {!isAuthenticated && (
          <div className={styles.loginHint}>
            Faça login com Google para salvar sua pontuação no ranking.
          </div>
        )}

        <div className={styles.finishActions}>
          <button type="button" className={styles.primaryButton} onClick={reroll}>
            Jogar de novo
          </button>
          <button type="button" className={styles.secondaryButton} onClick={goToSetup}>
            Trocar categorias
          </button>
        </div>

        {/* Mini-leaderboard */}
        {leaderboardQuery.data && leaderboardQuery.data.length > 0 && (
          <div className={styles.leaderboardSection}>
            <div className={styles.leaderboardTitle}>Ranking de Quiz</div>
            <div className={styles.leaderboardList}>
              {leaderboardQuery.data.slice(0, 5).map((entry, idx) => (
                <div key={entry.user_id} className={styles.leaderboardItem}>
                  <div className={styles.leaderboardRank}>#{idx + 1}</div>
                  {entry.picture ? (
                    <img
                      src={entry.picture}
                      alt={entry.name ?? 'User'}
                      className={styles.leaderboardAvatar}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={styles.leaderboardAvatarPlaceholder}>
                      {(entry.name?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className={styles.leaderboardInfo}>
                    <div className={styles.leaderboardName}>{entry.name ?? 'Anônimo'}</div>
                    <div className={styles.leaderboardStats}>
                      {entry.total_quizzes} quizzes · {entry.accuracy}% acertos
                    </div>
                  </div>
                  <div className={styles.leaderboardScore}>{entry.best_score}</div>
                </div>
              ))}
            </div>
          </div>
        )}
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
