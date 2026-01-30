import { useVehicleCard } from './VehicleCard.hooks';
import { VehicleCardProps } from './VehicleCard.types';
import styles from './VehicleCard.module.css';
import placeholderImage from '@/shared/images/placeholder.svg';

export function VehicleCard({ vehicle }: Readonly<VehicleCardProps>) {
  const { crewLabel, passengersLabel } = useVehicleCard(vehicle);
  const imageUrl = vehicle.image_url ?? placeholderImage;

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
        <p className={styles.detail}>Modelo: {vehicle.model}</p>
        <p className={styles.detail}>Fabricante: {vehicle.manufacturer}</p>
        <p className={styles.detail}>Classe: {vehicle.vehicle_class}</p>
        <p className={styles.detail}>Tripulação: {crewLabel}</p>
        <p className={styles.detail}>Passageiros: {passengersLabel}</p>
      </div>
    </article>
  );
}

