import { useVehicleCard } from './VehicleCard.hooks';
import { VehicleCardProps } from './VehicleCard.types';
import styles from './VehicleCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function VehicleCard({
  vehicle,
  variant = 'full',
  onViewDetails,
}: Readonly<VehicleCardProps>) {
  const { crewLabel, passengersLabel } = useVehicleCard(vehicle);
  const imageUrl = vehicle.image_url ?? placeholderImage;
  const isCompact = variant === 'compact';

  const detailsToRender: Array<{ key: string; node: React.ReactNode }> = [
    { key: 'model', node: <>Modelo: {vehicle.model}</> },
    { key: 'manufacturer', node: <>Fabricante: {vehicle.manufacturer}</> },
    { key: 'class', node: <>Classe: {vehicle.vehicle_class}</> },
    { key: 'crew', node: <>Tripulação: {crewLabel}</> },
    { key: 'passengers', node: <>Passageiros: {passengersLabel}</> },
  ].slice(0, 5);

  return (
    <article className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>
      <div className={styles.media} aria-hidden="true">
        <img
          className={styles.image}
          src={imageUrl}
          alt={vehicle.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{vehicle.name}</h3>
        {detailsToRender.map((detail) => (
          <p key={detail.key} className={styles.detail}>
            {detail.node}
          </p>
        ))}

        {onViewDetails && (
          <div className={styles.buttonRow}>
            <button type="button" className={styles.button} onClick={onViewDetails}>
              Ver detalhes
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

