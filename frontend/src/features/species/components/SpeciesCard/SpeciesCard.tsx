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

  const details = [
    <>Classificação: {species.classification}</>,
    <>Designação: {species.designation}</>,
    <>Idioma: {species.language}</>,
    <>Altura média: {heightLabel}</>,
    <>Longevidade média: {lifespanLabel}</>,
  ];

  // Sempre no máximo 5 atributos no card.
  const detailsToRender = (isCompact ? details : details).slice(0, 5);

  return (
    <article className={styles.card}>
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
        {detailsToRender.map((detail, index) => (
          <p key={index} className={styles.detail}>
            {detail}
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

