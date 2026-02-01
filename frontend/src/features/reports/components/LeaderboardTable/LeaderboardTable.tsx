import type { LeaderboardEntryDetailed } from '@/features/gamification/types/gamification.types';
import styles from './LeaderboardTable.module.css';

interface LeaderboardTableProps {
  readonly data: LeaderboardEntryDetailed[];
  readonly currentUserId?: string | null;
  readonly currentUserName?: string | null;
  readonly isLoading?: boolean;
  readonly isError?: boolean;
  readonly searchQuery?: string;
}

function shortUserId(userId: string) {
  const raw = (userId ?? '').trim();
  if (!raw) return 'Usuário';
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 6)}…${raw.slice(-3)}`;
}

export function LeaderboardTable({
  data,
  currentUserId,
  currentUserName,
  isLoading,
  isError,
  searchQuery = '',
}: LeaderboardTableProps) {

  if (isLoading) {
    return <div className={styles.loading}>Carregando ranking...</div>;
  }

  if (isError) {
    return <div className={styles.error}>Erro ao carregar o ranking.</div>;
  }

  if (!data || data.length === 0) {
    return <div className={styles.empty}>Nenhum dado de ranking disponível.</div>;
  }

  // Filtra os dados pelo nome
  const filteredData = searchQuery.trim()
    ? data.filter((entry) => {
        const name = entry.name?.toLowerCase() || '';
        const userId = entry.user_id?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return name.includes(query) || userId.includes(query);
      })
    : data;

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={`${styles.th} ${styles.thRank}`}>#</th>
            <th className={`${styles.th} ${styles.thName}`}>Jogador</th>
            <th className={`${styles.th} ${styles.thStat}`}>XP</th>
            <th className={`${styles.th} ${styles.thStat}`}>Consultas</th>
            <th className={`${styles.th} ${styles.thStat}`}>Conversas</th>
              <th className={`${styles.th} ${styles.thStat}`}>Conquistas</th>
              <th className={`${styles.th} ${styles.thStat}`}>Quizzes</th>
            </tr>
          </thead>
        <tbody className={styles.tbody}>
          {filteredData.map((entry) => {
            const originalIndex = data.findIndex((e) => e.user_id === entry.user_id);
            const isMe = !!currentUserId && entry.user_id === currentUserId;
            const displayName = (isMe && currentUserName) || entry.name || shortUserId(entry.user_id);
            const initials = displayName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('');

            return (
              <tr key={entry.user_id} className={`${styles.tr} ${isMe ? styles.trCurrent : ''}`}>
                <td className={`${styles.td} ${styles.rankCell}`}>
                  <div className={styles.rank}>#{originalIndex + 1}</div>
                </td>
                <td className={styles.td}>
                  <div className={styles.playerCell}>
                    {entry.picture?.trim() ? (
                      <img
                        className={styles.avatar}
                        src={entry.picture}
                        alt={displayName}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>{initials || '—'}</div>
                    )}
                    <div className={styles.playerInfo}>
                      <div className={styles.playerName}>
                        {isMe ? `Você (${displayName})` : displayName}
                      </div>
                      <div className={styles.playerRank}>{entry.jedi_rank}</div>
                    </div>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.statCell}`}>
                  <div className={`${styles.statValue} ${styles.statXp}`}>{entry.total_xp}</div>
                </td>
                <td className={`${styles.td} ${styles.statCell}`}>
                  <div className={styles.statValue}>{entry.total_queries}</div>
                </td>
                <td className={`${styles.td} ${styles.statCell}`}>
                  <div className={styles.statValue}>{entry.chat_messages}</div>
                </td>
                <td className={`${styles.td} ${styles.statCell}`}>
                  <div className={styles.statValue}>{entry.achievements_count}</div>
                </td>
                <td className={`${styles.td} ${styles.statCell}`}>
                  <div className={styles.statValue}>{entry.total_quizzes}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
