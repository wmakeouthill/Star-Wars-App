import { useQuery } from '@tanstack/react-query';
import { DetailsModal } from '@/shared/components';
import { fetchQuizHistory } from '../../services/gamification.service';
import type { QuizHistoryEntry } from '../../types/gamification.types';
import styles from './QuizHistoryModal.module.css';

interface QuizHistoryModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  characters: 'Personagens',
  planets: 'Planetas',
  starships: 'Naves',
  vehicles: 'Veículos',
  species: 'Espécies',
  films: 'Filmes',
};

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category.toLowerCase()] ?? category;
}

export function QuizHistoryModal({ open, onClose }: QuizHistoryModalProps) {
  const { data: history, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['gamification', 'quiz-history'],
    queryFn: () => fetchQuizHistory(20),
    enabled: open,
    staleTime: 1000 * 60, // 1 minuto
    gcTime: 1000 * 60 * 5, // 5 minutos
  });

  const handleRefresh = () => {
    refetch();
  };

  const summary = history?.length
    ? {
        totalQuizzes: history.length,
        totalCorrect: history.reduce((acc, h) => acc + h.correct_answers, 0),
        totalQuestions: history.reduce((acc, h) => acc + h.total_questions, 0),
        totalXp: history.reduce((acc, h) => acc + h.xp_earned, 0),
        avgAccuracy:
          history.length > 0
            ? Math.round(history.reduce((acc, h) => acc + h.accuracy, 0) / history.length)
            : 0,
      }
    : null;

  const refreshButton = (
    <button
      type="button"
      className={styles.refreshButton}
      onClick={handleRefresh}
      disabled={isFetching}
      aria-label="Atualizar histórico"
    >
      {isFetching ? 'Atualizando...' : 'Atualizar'}
    </button>
  );

  return (
    <DetailsModal open={open} onClose={onClose} title="Histórico de Quizzes" headerActions={refreshButton}>
      <div className={styles.container}>
        {isLoading && <div className={styles.loading}>Carregando histórico...</div>}

        {isError && (
          <div className={styles.error}>
            Não foi possível carregar o histórico. Verifique se você está logado.
          </div>
        )}

        {!isLoading && !isError && (!history || history.length === 0) && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🧠</div>
            <div className={styles.emptyText}>
              Você ainda não jogou nenhum quiz.
              <br />
              Jogue agora para ver seu histórico aqui!
            </div>
          </div>
        )}

        {summary && (
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Quizzes</div>
              <div className={styles.summaryValue}>{summary.totalQuizzes}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Acertos</div>
              <div className={styles.summaryValue}>
                {summary.totalCorrect}/{summary.totalQuestions}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Precisão</div>
              <div className={styles.summaryValue}>{summary.avgAccuracy}%</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>XP Total</div>
              <div className={styles.summaryValue}>{summary.totalXp}</div>
            </div>
          </div>
        )}

        {history && history.length > 0 && (
          <div className={styles.list}>
            {history.map((entry: QuizHistoryEntry) => (
              <div key={entry.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemDate}>{formatDate(entry.played_at)}</div>
                  <div className={styles.itemScore}>{entry.score} pts</div>
                </div>

                <div className={styles.itemStats}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Acertos:</span>
                    <span className={styles.statValue}>
                      {entry.correct_answers}/{entry.total_questions}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Precisão:</span>
                    <span className={`${styles.statValue} ${entry.accuracy >= 70 ? styles.statValueGood : ''}`}>
                      {entry.accuracy}%
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>XP:</span>
                    <span className={`${styles.statValue} ${styles.statValueXp}`}>+{entry.xp_earned}</span>
                  </div>
                </div>

                {entry.categories.length > 0 && (
                  <div className={styles.itemCategories}>
                    {entry.categories.map((cat) => (
                      <span key={cat} className={styles.categoryBadge}>
                        {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailsModal>
  );
}
