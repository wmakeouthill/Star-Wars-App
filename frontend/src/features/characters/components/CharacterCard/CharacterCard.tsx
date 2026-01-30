import { useCharacterCard } from './CharacterCard.hooks';
import { CharacterCardProps } from './CharacterCard.types';
import styles from './CharacterCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function CharacterCard({ character, onSelect, isSelected }: Readonly<CharacterCardProps>) {
  const { heightLabel, massLabel } = useCharacterCard(character);
  const imageUrl = character.image_url ?? placeholderImage;

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
        <p className={styles.detail}>Altura: {heightLabel}</p>
        <p className={styles.detail}>Massa: {massLabel}</p>
        <p className={styles.detail}>Gênero: {character.gender}</p>
        {character.homeworld && (
          <p className={styles.detail}>Planeta natal: {character.homeworld.name}</p>
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
    </article>
  );
}
