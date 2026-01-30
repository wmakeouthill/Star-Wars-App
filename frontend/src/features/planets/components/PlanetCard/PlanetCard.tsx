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

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'climate', node: <>Clima: {planet.climate}</> },
    { key: 'terrain', node: <>Terreno: {planet.terrain}</> },
    ...(planet.gravity ? [{ key: 'gravity', node: <>Gravidade: {planet.gravity}</> }] : []),
    { key: 'surfaceWater', node: <>Água (superfície): {surfaceWaterLabel}</> },
    { key: 'population', node: <>População: {populationLabel}</> },
    { key: 'residentsCount', node: <>Residentes conhecidos: {planet.residents_count ?? 0}</> },
  ].slice(0, 5);

  return (
    <article className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>
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
        {detailsToRender.map((detail) => (
          <p key={detail.key} className={styles.detail}>
            {detail.node}
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
