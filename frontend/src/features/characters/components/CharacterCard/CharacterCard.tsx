import { useState } from 'react';
import { useCharacterCard } from './CharacterCard.hooks';
import { CharacterCardProps } from './CharacterCard.types';
import styles from './CharacterCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';
import { useImageEditModeStore } from '@/shared/stores/imageEditMode.store';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CharacterImageFallbackEditorModal } from '../CharacterImageFallbackEditorModal';

const IMAGE_FALLBACK_EDITOR_EMAIL = 'wcacorreia1995@gmail.com';

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { user } = useAuth();
  const isImageEditModeEnabled = useImageEditModeStore((state) => state.isEnabled);
  const canEditImages =
    (user?.email ?? '').trim().toLowerCase() === IMAGE_FALLBACK_EDITOR_EMAIL && isImageEditModeEnabled;

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
      <div className={styles.media}>
        {canEditImages ? (
          <>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => setIsEditorOpen(true)}
              aria-label={`Editar fallback de imagem de ${character.name}`}
              title="Editar fallback de imagem"
            >
              <img
                className={styles.image}
                src={imageUrl}
                alt={character.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = placeholderImage;
                }}
              />
              <span className={styles.imageEditBadge}>Editar</span>
            </button>
            <CharacterImageFallbackEditorModal
              open={isEditorOpen}
              characterName={character.name}
              onClose={() => setIsEditorOpen(false)}
            />
          </>
        ) : (
          <img
            className={styles.image}
            src={imageUrl}
            alt={character.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = placeholderImage;
            }}
          />
        )}
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
