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

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'model', node: <>Modelo: {starship.model}</> },
    { key: 'manufacturer', node: <>Fabricante: {starship.manufacturer}</> },
    { key: 'class', node: <>Classe: {starship.starship_class}</> },
    { key: 'crew', node: <>Tripulação: {crewLabel}</> },
    { key: 'passengers', node: <>Passageiros: {passengersLabel}</> },
    { key: 'hyperdrive', node: <>Hyperdrive: {hyperdriveLabel}</> },
    { key: 'mglt', node: <>MGLT: {mgltLabel}</> },
    { key: 'speed', node: <>Velocidade: {speedLabel}</> },
    { key: 'length', node: <>Comprimento: {lengthLabel}</> },
    { key: 'cargo', node: <>Carga: {cargoLabel}</> },
    { key: 'consumables', node: <>Consumíveis: {consumablesLabel}</> },
    { key: 'cost', node: <>Custo: {costLabel}</> },
    {
      key: 'counts',
      node: (
        <>
          Filmes: {starship.films_count ?? 0} · Pilotos: {starship.pilots_count ?? 0}
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
