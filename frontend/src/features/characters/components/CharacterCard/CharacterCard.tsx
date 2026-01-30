import { useCharacterCard } from './CharacterCard.hooks';
import { CharacterCardProps } from './CharacterCard.types';
import styles from './CharacterCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function CharacterCard({
  character,
  onSelect,
  isSelected,
  variant = 'full',
  onViewDetails,
}: Readonly<CharacterCardProps>) {
  const { heightLabel, massLabel } = useCharacterCard(character);
  const imageUrl = character.image_url ?? placeholderImage;
  const isCompact = variant === 'compact';

  const details = [
    <>Altura: {heightLabel}</>,
    <>Massa: {massLabel}</>,
    <>Gênero: {character.gender}</>,
    character.homeworld ? <>Planeta natal: {character.homeworld.name}</> : null,
  ].filter(Boolean);

  const detailsToRender = isCompact ? details.slice(0, 5) : details;

  return (
    <article className={styles.card}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={character.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{character.name}</h3>
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
                onClick={() => onSelect(character.id)}
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
