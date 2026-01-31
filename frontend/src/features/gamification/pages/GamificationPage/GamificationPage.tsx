import styles from './GamificationPage.module.css';
import {
  useDailyChallenge,
  useGamificationAchievements,
  useGamificationLeaderboard,
  useGamificationProfile,
} from '../../hooks/useGamification';
import { useChatContext } from '@/features/chat/context';

export function GamificationPage() {
  const profileQuery = useGamificationProfile();
  const achievementsQuery = useGamificationAchievements();
  const leaderboardQuery = useGamificationLeaderboard(10);
  const dailyQuery = useDailyChallenge();
  const { persona, setPersona } = useChatContext();

  const isLoading =
    profileQuery.isLoading ||
    achievementsQuery.isLoading ||
    leaderboardQuery.isLoading ||
    dailyQuery.isLoading;

  if (isLoading) {
    return <div className={styles.container}>Carregando progresso...</div>;
  }

  if (profileQuery.error || achievementsQuery.error || leaderboardQuery.error || dailyQuery.error) {
    return <div className={styles.container}>Falha ao carregar gamificação.</div>;
  }

  const profile = profileQuery.data!;
  const achievements = achievementsQuery.data!;
  const leaderboard = leaderboardQuery.data!;
  const daily = dailyQuery.data!;
  const profileDisplayName = profile.name?.trim() ? profile.name : 'Visitante';

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Seu perfil Jedi</h3>
          <div className={styles.mono}>Usuário: {profileDisplayName}</div>
          <div className={styles.row}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Rank</div>
              <div className={styles.statValue}>{profile.jedi_rank}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>XP</div>
              <div className={styles.statValue}>{profile.total_xp}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Consultas</div>
              <div className={styles.statValue}>{profile.total_queries}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Chat</div>
              <div className={styles.statValue}>{profile.chat_messages}</div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Desafio diário</h3>
          <div>{daily.description}</div>
          <div className={styles.row} style={{ marginTop: 12 }}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Progresso</div>
              <div className={styles.statValue}>
                {(daily.progress_current ?? 0)}/{daily.progress_target ?? '-'}
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Recompensa</div>
              <div className={styles.statValue}>{daily.xp_reward} XP</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Status</div>
              <div className={styles.statValue}>{daily.completed ? 'Concluído' : 'Em andamento'}</div>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Conselheiros Galácticos</h3>
          <p className={styles.chatIntro}>
            Converse com os personagens mais icônicos da galáxia! Cada mensagem no chat te dá XP.
          </p>
          <div className={styles.chatPersonas}>
            <button
              type="button"
              className={`${styles.personaCard} ${persona === 'yoda' ? styles.personaActive : ''}`}
              onClick={() => setPersona('yoda')}
            >
              <span className={styles.personaEmoji}>🟢</span>
              <span className={styles.personaName}>Mestre Yoda</span>
              <span className={styles.personaDesc}>Sabedoria e luz</span>
            </button>
            <button
              type="button"
              className={`${styles.personaCard} ${persona === 'vader' ? styles.personaActive : ''}`}
              onClick={() => setPersona('vader')}
            >
              <span className={styles.personaEmoji}>🔴</span>
              <span className={styles.personaName}>Darth Vader</span>
              <span className={styles.personaDesc}>Poder do lado sombrio</span>
            </button>
          </div>
          <p className={styles.chatHint}>
            Clique para selecionar e use o botão flutuante no canto inferior direito para conversar.
          </p>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Conquistas</h3>
          <ul className={styles.list}>
            {achievements.map((a) => (
              <li
                key={a.id}
                className={a.unlocked ? styles.achievementUnlocked : styles.achievementLocked}
              >
                <div>
                  <strong>{a.name}</strong> — {a.description}
                </div>
                <div className={styles.mono}>{a.xp_reward} XP</div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Ranking</h3>
          <ul className={styles.list}>
            {leaderboard.map((entry, index) => (
              <li key={`${entry.user_id}-${index}`} className={styles.stat}>
                <div>
                  <strong>#{index + 1}</strong> {entry.jedi_rank} — {entry.total_xp} XP
                </div>
                <div className={styles.mono}>{entry.name?.trim() ? entry.name : entry.user_id}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

