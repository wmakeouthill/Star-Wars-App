import { DonutChart, HorizontalBarChart, ReportPanel, VerticalBarChart } from '@/features/reports/components';
import { useReportsPage } from './ReportsPage.hooks';
import styles from './ReportsPage.module.css';

export function ReportsPage() {
  const { snapshotQuery, report, achievementsDonut, chatVsQueries, leaderboard, challengeProgress } = useReportsPage();

  return (
    <section className={styles.container}>
      <div className={styles.commandBar}>
        <div className={styles.kicker}>Holocron Analytics — Relatórios</div>
        <div className={styles.hint}>
          Um painel de inteligência para ler a galáxia: distribuições, “top N” e buckets numéricos — tudo extraído da
          API que você já está usando.
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Personagens</span>
            <span className={styles.kpiValue}>{report?.totals.characters ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Planetas</span>
            <span className={styles.kpiValue}>{report?.totals.planets ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Naves</span>
            <span className={styles.kpiValue}>{report?.totals.starships ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Filmes</span>
            <span className={styles.kpiValue}>{report?.totals.films ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Rank</span>
            <span className={styles.kpiValue}>{report?.gamification.jediRank ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>XP</span>
            <span className={styles.kpiValue}>{report?.gamification.totalXp ?? '—'}</span>
          </div>
        </div>

        {snapshotQuery.isLoading && <div className={styles.status}>Carregando relatórios…</div>}
        {snapshotQuery.isError && (
          <div className={styles.status}>Não foi possível carregar os relatórios. Verifique o backend e tente novamente.</div>
        )}
      </div>

      <div className={styles.grid}>
        <ReportPanel title="👤 Personagens" subtitle="Distribuições (gênero, altura, cor do cabelo).">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <DonutChart data={report?.characters.gender ?? []} height={300} />
              <VerticalBarChart data={report?.characters.heightBuckets ?? []} height={300} />
            </div>
            <HorizontalBarChart
              data={report?.characters.hairColorsTop ?? []}
              height={Math.min(520, 140 + (report?.characters.hairColorsTop.length ?? 0) * 30)}
            />
          </div>
        </ReportPanel>

        <ReportPanel title="🌍 Planetas" subtitle="Top climas/terrenos e buckets de população.">
          <div className={styles.panelStack}>
            <VerticalBarChart data={report?.planets.populationBuckets ?? []} height={320} />
            <div className={styles.panelGrid}>
              <HorizontalBarChart
                data={report?.planets.climateTop ?? []}
                height={Math.min(520, 140 + (report?.planets.climateTop.length ?? 0) * 30)}
              />
              <HorizontalBarChart
                data={report?.planets.terrainTop ?? []}
                height={Math.min(520, 140 + (report?.planets.terrainTop.length ?? 0) * 30)}
              />
            </div>
          </div>
        </ReportPanel>

        <ReportPanel title="🚀 Naves" subtitle="Top fabricantes/classes e buckets de tripulação.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <VerticalBarChart data={report?.starships.crewBuckets ?? []} height={300} />
              <HorizontalBarChart
                data={report?.starships.classTop ?? []}
                height={Math.min(520, 140 + (report?.starships.classTop.length ?? 0) * 30)}
              />
            </div>
            <HorizontalBarChart
              data={report?.starships.manufacturerTop ?? []}
              height={Math.min(560, 160 + (report?.starships.manufacturerTop.length ?? 0) * 30)}
            />
          </div>
        </ReportPanel>

        <ReportPanel title="🎬 Filmes" subtitle="Diretores e distribuição por ano de lançamento.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <VerticalBarChart data={report?.films.byYear ?? []} height={300} />
              <HorizontalBarChart
                data={report?.films.byDirector ?? []}
                height={Math.min(480, 140 + (report?.films.byDirector.length ?? 0) * 30)}
              />
            </div>
          </div>
        </ReportPanel>

        <ReportPanel
          title="🏆 Gamificação"
          subtitle="Progresso do usuário (XP) + estado de conquistas + top ranking."
          rightSlot={
            report?.gamification.dailyChallenge ? (
              <div className={styles.challenge}>
                <div className={styles.challengeTitleRow}>
                  <div className={styles.challengeTitle}>{report.gamification.dailyChallenge.title}</div>
                  <div className={styles.challengeXp}>+{report.gamification.dailyChallenge.xp_reward} XP</div>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.round((challengeProgress?.ratio ?? (report.gamification.dailyChallenge.completed ? 1 : 0)) * 100)}%` }}
                  />
                </div>
                <div className={styles.challengeMeta}>
                  {report.gamification.dailyChallenge.completed
                    ? 'Concluído'
                    : challengeProgress
                      ? `${challengeProgress.current}/${challengeProgress.target}`
                      : 'Em andamento'}
                </div>
              </div>
            ) : null
          }
        >
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <DonutChart data={achievementsDonut} height={300} />
              <HorizontalBarChart
                data={report?.gamification.achievementsRewardsTop ?? []}
                height={Math.min(480, 140 + (report?.gamification.achievementsRewardsTop.length ?? 0) * 30)}
              />
            </div>
            <HorizontalBarChart data={leaderboard} height={Math.min(560, 160 + leaderboard.length * 30)} />
          </div>
        </ReportPanel>

        <ReportPanel title="💬 Chat (API + Perfil)" subtitle="Leitura rápida da sua atividade: consultas vs mensagens.">
          <VerticalBarChart data={chatVsQueries} height={300} />
        </ReportPanel>
      </div>
    </section>
  );
}

