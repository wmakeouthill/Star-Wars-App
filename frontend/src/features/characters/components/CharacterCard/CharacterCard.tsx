import { useCharacterCard } from './CharacterCard.hooks';
import { CharacterCardProps } from './CharacterCard.types';
import styles from './CharacterCard.module.css';

export function CharacterCard({ character }: CharacterCardProps) {
  const { heightLabel, massLabel } = useCharacterCard(character);

  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{character.name}</h3>
      <p className={styles.detail}>Altura: {heightLabel} cm</p>
      <p className={styles.detail}>Massa: {massLabel} kg</p>
      <p className={styles.detail}>Gênero: {character.gender}</p>
      {character.homeworld && (
        <p className={styles.detail}>Planeta natal: {character.homeworld.name}</p>
      )}
    </article>
  );
}
