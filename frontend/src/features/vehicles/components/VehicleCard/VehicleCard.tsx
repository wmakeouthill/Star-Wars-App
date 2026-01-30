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

  const details = [
    <>Modelo: {vehicle.model}</>,
    <>Fabricante: {vehicle.manufacturer}</>,
    <>Classe: {vehicle.vehicle_class}</>,
    <>Tripulação: {crewLabel}</>,
    <>Passageiros: {passengersLabel}</>,
  ];

  // Sempre no máximo 5 atributos no card.
  const detailsToRender = (isCompact ? details : details).slice(0, 5);

  return (
    <article className={styles.card}>
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
        {detailsToRender.map((detail, index) => (
          <p key={index} className={styles.detail}>
            {detail}
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

