import { useSpeciesCard } from './SpeciesCard.hooks';
import { SpeciesCardProps } from './SpeciesCard.types';
import styles from './SpeciesCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function SpeciesCard({ species }: Readonly<SpeciesCardProps>) {
  const { heightLabel, lifespanLabel } = useSpeciesCard(species);
  const imageUrl = species.image_url ?? placeholderImage;

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
        <p className={styles.detail}>Classificação: {species.classification}</p>
        <p className={styles.detail}>Designação: {species.designation}</p>
        <p className={styles.detail}>Idioma: {species.language}</p>
        <p className={styles.detail}>Altura média: {heightLabel}</p>
        <p className={styles.detail}>Longevidade média: {lifespanLabel}</p>
      </div>
    </article>
  );
}

