import { usePlanetCard } from './PlanetCard.hooks';
import { PlanetCardProps } from './PlanetCard.types';
import styles from './PlanetCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function PlanetCard({ planet }: Readonly<PlanetCardProps>) {
  const { populationLabel, surfaceWaterLabel } = usePlanetCard(planet);
  const imageUrl = planet.image_url ?? placeholderImage;

  return (
    <article className={styles.card}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={planet.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{planet.name}</h3>
        <p className={styles.detail}>Clima: {planet.climate}</p>
        <p className={styles.detail}>Terreno: {planet.terrain}</p>
        {planet.gravity && <p className={styles.detail}>Gravidade: {planet.gravity}</p>}
        <p className={styles.detail}>Água (superfície): {surfaceWaterLabel}</p>
        <p className={styles.detail}>População: {populationLabel}</p>
        <p className={styles.detail}>Residentes conhecidos: {planet.residents_count ?? 0}</p>
      </div>
    </article>
  );
}
