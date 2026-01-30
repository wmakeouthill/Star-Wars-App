import { useStarshipCard } from './StarshipCard.hooks';
import { StarshipCardProps } from './StarshipCard.types';
import styles from './StarshipCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function StarshipCard({ starship, onSelect, isSelected }: Readonly<StarshipCardProps>) {
  const {
    crewLabel,
    passengersLabel,
    hyperdriveLabel,
    mgltLabel,
    costLabel,
    lengthLabel,
    speedLabel,
    cargoLabel,
    consumablesLabel,
  } = useStarshipCard(starship);
  const imageUrl = starship.image_url ?? placeholderImage;

  return (
    <article className={styles.card}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={starship.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{starship.name}</h3>
        <p className={styles.detail}>Modelo: {starship.model}</p>
        <p className={styles.detail}>Fabricante: {starship.manufacturer}</p>
        <p className={styles.detail}>Classe: {starship.starship_class}</p>
        <p className={styles.detail}>Tripulação: {crewLabel}</p>
        <p className={styles.detail}>Passageiros: {passengersLabel}</p>
        <p className={styles.detail}>Hyperdrive: {hyperdriveLabel}</p>
        <p className={styles.detail}>MGLT: {mgltLabel}</p>
        <p className={styles.detail}>Velocidade: {speedLabel}</p>
        <p className={styles.detail}>Comprimento: {lengthLabel}</p>
        <p className={styles.detail}>Carga: {cargoLabel}</p>
        <p className={styles.detail}>Consumíveis: {consumablesLabel}</p>
        <p className={styles.detail}>Custo: {costLabel}</p>
        <p className={styles.detail}>Filmes: {starship.films_count ?? 0} · Pilotos: {starship.pilots_count ?? 0}</p>
        {onSelect && (
          <button
            type="button"
            className={`${styles.button} ${isSelected ? styles.buttonActive : ''}`}
            onClick={() => onSelect(starship.id)}
          >
            {isSelected ? 'Detalhes carregados' : 'Ver detalhes'}
          </button>
        )}
      </div>
    </article>
  );
}
