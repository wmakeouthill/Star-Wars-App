import { useStarshipCard } from './StarshipCard.hooks';
import { StarshipCardProps } from './StarshipCard.types';
import styles from './StarshipCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function StarshipCard({
  starship,
  onSelect,
  isSelected,
  variant = 'full',
  onViewDetails,
}: Readonly<StarshipCardProps>) {
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
  const isCompact = variant === 'compact';

  const details = [
    <>Modelo: {starship.model}</>,
    <>Fabricante: {starship.manufacturer}</>,
    <>Classe: {starship.starship_class}</>,
    <>Tripulação: {crewLabel}</>,
    <>Passageiros: {passengersLabel}</>,
    <>Hyperdrive: {hyperdriveLabel}</>,
    <>MGLT: {mgltLabel}</>,
    <>Velocidade: {speedLabel}</>,
    <>Comprimento: {lengthLabel}</>,
    <>Carga: {cargoLabel}</>,
    <>Consumíveis: {consumablesLabel}</>,
    <>Custo: {costLabel}</>,
    <>
      Filmes: {starship.films_count ?? 0} · Pilotos: {starship.pilots_count ?? 0}
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
                onClick={() => onSelect(starship.id)}
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
