import { useFilmCard } from './FilmCard.hooks';
import { FilmCardProps } from './FilmCard.types';
import styles from './FilmCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function FilmCard({
  film,
  onSelect,
  isSelected,
  variant = 'full',
  onViewDetails,
}: Readonly<FilmCardProps>) {
  const { releaseDate } = useFilmCard(film);
  const imageUrl = (film as { image_url?: string | null }).image_url ?? placeholderImage;
  const isCompact = variant === 'compact';

  const details = [
    <>Episódio: {film.episode_id}</>,
    <>Diretor: {film.director}</>,
    <>Produtor: {film.producer}</>,
    <>Lançamento: {releaseDate}</>,
    <>
      Personagens: {film.characters_count ?? 0} · Planetas: {film.planets_count ?? 0} · Naves:{' '}
      {film.starships_count ?? 0}
    </>,
  ];

  // Sempre no máximo 5 atributos no card (detalhes completos ficam no modal).
  const detailsToRender = (isCompact ? details : details).slice(0, 5);

  return (
    <article className={styles.card}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={film.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{film.title}</h3>
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
