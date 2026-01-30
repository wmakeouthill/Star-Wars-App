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
