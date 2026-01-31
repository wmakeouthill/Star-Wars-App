import { useState } from 'react';
import { useFilmCard } from './FilmCard.hooks';
import { FilmCardProps } from './FilmCard.types';
import styles from './FilmCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useImageEditModeStore } from '@/shared/stores/imageEditMode.store';
import { canEditImageFallbacks } from '@/shared/utils/imageFallbackAuthorization';
import { FallbackEditableImage, ImageFallbackEditorModal } from '@/shared/components';

export function FilmCard({
  film,
  onSelect,
  isSelected,
  variant = 'full',
  onViewDetails,
}: Readonly<FilmCardProps>) {
  const { releaseDate } = useFilmCard(film);
  const imageUrl = film.image_url ?? placeholderImage;
  const isCompact = variant === 'compact';
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { user } = useAuth();
  const isImageEditModeEnabled = useImageEditModeStore((state) => state.isEnabled);
  const canEditImages = canEditImageFallbacks({ userEmail: user?.email, isEditModeEnabled: isImageEditModeEnabled });

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'episode', node: <>Episódio: {film.episode_id}</> },
    { key: 'director', node: <>Diretor: {film.director}</> },
    { key: 'producer', node: <>Produtor: {film.producer}</> },
    { key: 'releaseDate', node: <>Lançamento: {releaseDate}</> },
    {
      key: 'counts',
      node: (
        <>
          Personagens: {film.characters_count ?? 0} · Planetas: {film.planets_count ?? 0} ·
          Naves: {film.starships_count ?? 0}
        </>
      ),
    },
  ].slice(0, 5);

  return (
    <article className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>
      <div className={styles.media} aria-hidden={!canEditImages}>
        <FallbackEditableImage
          canEdit={canEditImages}
          src={imageUrl}
          alt={film.title}
          placeholderSrc={placeholderImage}
          imgClassName={styles.image}
          editLabel={`Editar fallback de imagem de ${film.title}`}
          onEdit={() => setIsEditorOpen(true)}
        />
        {canEditImages && (
          <ImageFallbackEditorModal
            open={isEditorOpen}
            resource="films"
            resourceLabel="Filme"
            itemName={film.title}
            onClose={() => setIsEditorOpen(false)}
          />
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{film.title}</h3>
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
                onClick={() => onSelect(film.id)}
              >
                {isSelected ? 'Personagens carregados' : 'Ver personagens'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
