import { useStarshipCard } from './StarshipCard.hooks';
import { StarshipCardProps } from './StarshipCard.types';
import styles from './StarshipCard.module.css';

export function StarshipCard({ starship }: StarshipCardProps) {
  const { crewLabel, passengersLabel } = useStarshipCard(starship);

  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{starship.name}</h3>
      <p className={styles.detail}>Modelo: {starship.model}</p>
      <p className={styles.detail}>Fabricante: {starship.manufacturer}</p>
      <p className={styles.detail}>Tripulação: {crewLabel}</p>
      <p className={styles.detail}>Passageiros: {passengersLabel}</p>
    </article>
  );
}
