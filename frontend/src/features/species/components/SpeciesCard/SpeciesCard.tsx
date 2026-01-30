import { useSpeciesCard } from './SpeciesCard.hooks';
import { SpeciesCardProps } from './SpeciesCard.types';
import styles from './SpeciesCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function SpeciesCard({
  species,
  variant = 'full',
  onViewDetails,
}: Readonly<SpeciesCardProps>) {
  const { heightLabel, lifespanLabel } = useSpeciesCard(species);
  const imageUrl = species.image_url ?? placeholderImage;
  const isCompact = variant === 'compact';

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'classification', node: <>Classificação: {species.classification}</> },
    { key: 'designation', node: <>Designação: {species.designation}</> },
    { key: 'language', node: <>Idioma: {species.language}</> },
    { key: 'height', node: <>Altura média: {heightLabel}</> },
    { key: 'lifespan', node: <>Longevidade média: {lifespanLabel}</> },
  ].slice(0, 5);

  return (
    <article className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={species.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{species.name}</h3>
        {detailsToRender.map((detail) => (
          <p key={detail.key} className={styles.detail}>
            {detail.node}
          </p>
        ))}

        {onViewDetails && (
          <div className={styles.buttonRow}>
            <button type="button" className={styles.button} onClick={onViewDetails}>
              Ver detalhes
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

