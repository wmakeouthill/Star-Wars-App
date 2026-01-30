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

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'height', node: <>Altura: {heightLabel}</> },
    { key: 'mass', node: <>Massa: {massLabel}</> },
    { key: 'gender', node: <>Gênero: {character.gender}</> },
    ...(character.homeworld
      ? [{ key: 'homeworld', node: <>Planeta natal: {character.homeworld.name}</> }]
      : []),
  ].slice(0, 5);

  return (
    <article className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>
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
