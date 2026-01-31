import styles from './FallbackEditableImage.module.css';

type FallbackEditableImageProps = {
  canEdit: boolean;
  src: string;
  alt: string;
  placeholderSrc: string;
  onEdit?: () => void;
  editLabel?: string;
  imgClassName?: string;
};

export function FallbackEditableImage({
  canEdit,
  src,
  alt,
  placeholderSrc,
  onEdit,
  editLabel,
  imgClassName,
}: Readonly<FallbackEditableImageProps>) {
  const imageClassName = imgClassName ?? styles.imageFallback;

  const imageNode = (
    <img
      className={imageClassName}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = placeholderSrc;
      }}
    />
  );

  if (!canEdit || !onEdit) return imageNode;

  return (
    <button type="button" className={styles.button} onClick={onEdit} aria-label={editLabel} title="Editar fallback de imagem">
      {imageNode}
      <span className={styles.badge}>Editar</span>
    </button>
  );
}

