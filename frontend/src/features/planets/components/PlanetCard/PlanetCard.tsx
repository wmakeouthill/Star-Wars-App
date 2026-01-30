import { usePlanetCard } from './PlanetCard.hooks';
import { PlanetCardProps } from './PlanetCard.types';
import styles from './PlanetCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function PlanetCard({
  planet,
  onSelect,
  isSelected,
  variant = 'full',
  onViewDetails,
}: Readonly<PlanetCardProps>) {
  const { populationLabel, surfaceWaterLabel } = usePlanetCard(planet);
  const imageUrl = planet.image_url ?? placeholderImage;
  const isCompact = variant === 'compact';

  const details = [
    <>Clima: {planet.climate}</>,
    <>Terreno: {planet.terrain}</>,
    planet.gravity ? <>Gravidade: {planet.gravity}</> : null,
    <>Água (superfície): {surfaceWaterLabel}</>,
    <>População: {populationLabel}</>,
    <>Residentes conhecidos: {planet.residents_count ?? 0}</>,
  ].filter(Boolean);

  const detailsToRender = isCompact ? details.slice(0, 5) : details;

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
        {detailsToRender.map((detail, index) => (
          <p key={index} className={styles.detail}>
            {detail}
          </p>
        ))}

        {(onViewDetails || onSelect) && (
          <div className={styles.buttonRow}>
            {onViewDetails && (
              <button type="button" className={styles.button} onClick={onViewDetails}>
                Ver detalhes
              </button>
            )}
            {onSelect && (
              <button
                type="button"
                className={`${styles.button} ${isSelected ? styles.buttonActive : ''}`}
                onClick={() => onSelect(planet.id)}
              >
                {isSelected ? 'Detalhes carregados' : 'Ver detalhes'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
