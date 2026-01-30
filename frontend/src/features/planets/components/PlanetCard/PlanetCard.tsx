import { usePlanetCard } from './PlanetCard.hooks';
import { PlanetCardProps } from './PlanetCard.types';
import styles from './PlanetCard.module.css';

export function PlanetCard({ planet }: PlanetCardProps) {
  const { populationLabel } = usePlanetCard(planet);

  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{planet.name}</h3>
      <p className={styles.detail}>Clima: {planet.climate}</p>
      <p className={styles.detail}>Terreno: {planet.terrain}</p>
      <p className={styles.detail}>População: {populationLabel}</p>
    </article>
  );
}
