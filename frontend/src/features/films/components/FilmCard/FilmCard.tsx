import { useFilmCard } from './FilmCard.hooks';
import { FilmCardProps } from './FilmCard.types';
import styles from './FilmCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function FilmCard({ film, onSelect, isSelected }: Readonly<FilmCardProps>) {
  const { releaseDate, openingCrawlPreview } = useFilmCard(film);
  const imageUrl = (film as { image_url?: string | null }).image_url ?? placeholderImage;

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
        <p className={styles.detail}>Episódio: {film.episode_id}</p>
        <p className={styles.detail}>Diretor: {film.director}</p>
        <p className={styles.detail}>Produtor: {film.producer}</p>
        <p className={styles.detail}>Lançamento: {releaseDate}</p>
        {!!openingCrawlPreview && (
          <p className={styles.detail}>{openingCrawlPreview}</p>
        )}
        <p className={styles.detail}>
          Personagens: {film.characters_count ?? 0} · Planetas: {film.planets_count ?? 0} · Naves:{' '}
          {film.starships_count ?? 0}
        </p>
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
    </article>
  );
}
