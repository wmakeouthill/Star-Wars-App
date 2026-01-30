import { useFilmCard } from './FilmCard.hooks';
import { FilmCardProps } from './FilmCard.types';
import styles from './FilmCard.module.css';

export function FilmCard({ film, onSelect, isSelected }: FilmCardProps) {
  const { releaseDate } = useFilmCard(film);

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{film.title}</h3>
      <p className={styles.detail}>Episódio: {film.episode_id}</p>
      <p className={styles.detail}>Diretor: {film.director}</p>
      <p className={styles.detail}>Lançamento: {releaseDate}</p>
      {onSelect && (
        <button
          type="button"
          className={`${styles.button} ${isSelected ? styles.buttonActive : ''}`}
          onClick={() => onSelect(film.id)}
        >
          {isSelected ? 'Personagens carregados' : 'Ver personagens'}
        </button>
      )}
    </article>
  );
}
