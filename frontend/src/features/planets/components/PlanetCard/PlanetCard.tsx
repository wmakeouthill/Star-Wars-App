import { useState } from 'react';
import { usePlanetCard } from './PlanetCard.hooks';
import { PlanetCardProps } from './PlanetCard.types';
import styles from './PlanetCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useImageEditModeStore } from '@/shared/stores/imageEditMode.store';
import { canEditImageFallbacks } from '@/shared/utils/imageFallbackAuthorization';
import { FallbackEditableImage, ImageFallbackEditorModal } from '@/shared/components';

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { user } = useAuth();
  const isImageEditModeEnabled = useImageEditModeStore((state) => state.isEnabled);
  const canEditImages = canEditImageFallbacks({ userEmail: user?.email, isEditModeEnabled: isImageEditModeEnabled });

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
      <div className={styles.media} aria-hidden={!canEditImages}>
        <FallbackEditableImage
          canEdit={canEditImages}
          src={imageUrl}
          alt={planet.name}
          placeholderSrc={placeholderImage}
          imgClassName={styles.image}
          editLabel={`Editar fallback de imagem de ${planet.name}`}
          onEdit={() => setIsEditorOpen(true)}
        />
        {canEditImages && (
          <ImageFallbackEditorModal
            open={isEditorOpen}
            resource="locations"
            resourceLabel="Planeta"
            itemName={planet.name}
            onClose={() => setIsEditorOpen(false)}
          />
        )}
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
