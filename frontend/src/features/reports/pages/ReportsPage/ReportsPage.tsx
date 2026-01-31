import {
  ChartSkeleton,
  DonutChart,
  HorizontalBarChart,
  KpiSkeleton,
  LeaderboardTable,
  MiniStat,
  PanelSkeleton,
  RadarChartComponent,
  ReportPanel,
  ScatterPlotChart,
  StackedBarChart,
  StatGrid,
  StatSkeleton,
  TreemapChart,
  VerticalBarChart,
} from '@/features/reports/components';
import { useReportsPage } from './ReportsPage.hooks';
import styles from './ReportsPage.module.css';

export function ReportsPage() {
  const {
    loading,
    errors,
    totals,
    charactersReport,
    planetsReport,
    starshipsReport,
    speciesReport,
    vehiclesReport,
    filmsReport,
    crossAnalytics,
    gamificationReport,
    achievementsDonut,
    chatVsQueries,
    leaderboardDetailed,
    challengeProgress,
    currentUserId,
    currentUserName,
  } = useReportsPage();

  return (
    <section className={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COMMAND BAR - KPIs Principais */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={styles.commandBar}>
        <div className={styles.kicker}>Holocron Analytics — Relatórios</div>
        <div className={styles.hint}>
          Painel de inteligência galáctico: distribuições, rankings, correlações e análises cruzadas — tudo extraído da
          SWAPI para revelar os segredos do universo Star Wars.
        </div>

        <div className={styles.kpis}>
          {loading.characters ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Personagens</span>
              <span className={styles.kpiValue}>{totals.characters || '—'}</span>
            </div>
          )}
          {loading.planets ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Planetas</span>
              <span className={styles.kpiValue}>{totals.planets || '—'}</span>
            </div>
          )}
          {loading.starships ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Naves</span>
              <span className={styles.kpiValue}>{totals.starships || '—'}</span>
            </div>
          )}
          {loading.vehicles ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Veículos</span>
              <span className={styles.kpiValue}>{totals.vehicles || '—'}</span>
            </div>
          )}
          {loading.species ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Espécies</span>
              <span className={styles.kpiValue}>{totals.species || '—'}</span>
            </div>
          )}
          {loading.films ? <KpiSkeleton /> : (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Filmes</span>
              <span className={styles.kpiValue}>{totals.films || '—'}</span>
            </div>
          )}
          {loading.gamification ? <KpiSkeleton /> : (
            <>
              <div className={`${styles.kpi} ${styles.kpiHighlight}`}>
                <span className={styles.kpiLabel}>Rank</span>
                <span className={styles.kpiValue}>{gamificationReport?.jediRank ?? '—'}</span>
              </div>
              <div className={`${styles.kpi} ${styles.kpiHighlight}`}>
                <span className={styles.kpiLabel}>XP</span>
                <span className={styles.kpiValue}>{gamificationReport?.totalXp ?? '—'}</span>
              </div>
            </>
          )}
        </div>

        {errors.any && (
          <div className={styles.status}>Erro ao carregar alguns dados. Verifique o backend.</div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* GAMIFICAÇÃO + ATIVIDADE DO USUÁRIO - Side by Side */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={styles.sideBySide}>
        {/* GAMIFICAÇÃO */}
        {loading.gamification ? (
          <PanelSkeleton rows={3} />
        ) : gamificationReport && (
          <ReportPanel
            title="🏆 Gamificação"
            subtitle="Progresso do usuário (XP) + conquistas + ranking."
            rightSlot={
              gamificationReport.dailyChallenge ? (
                <div className={styles.challenge}>
                  <div className={styles.challengeTitleRow}>
                    <div className={styles.challengeTitle}>{gamificationReport.dailyChallenge.title}</div>
                    <div className={styles.challengeXp}>+{gamificationReport.dailyChallenge.xp_reward} XP</div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.round((challengeProgress?.ratio ?? (gamificationReport.dailyChallenge.completed ? 1 : 0)) * 100)}%` }}
                    />
                  </div>
                  <div className={styles.challengeMeta}>
                    {gamificationReport.dailyChallenge.completed
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
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Conquistas</div>
                  <DonutChart data={achievementsDonut} height={240} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Recompensas XP</div>
                  <HorizontalBarChart
                    data={gamificationReport.achievementsRewardsTop}
                    height={Math.min(320, 100 + gamificationReport.achievementsRewardsTop.length * 26)}
                  />
                </div>
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ATIVIDADE DO USUÁRIO */}
        {loading.gamification ? (
          <PanelSkeleton rows={2} />
        ) : gamificationReport && (
          <ReportPanel title="💬 Atividade do Usuário" subtitle="Consultas à API e mensagens no chat.">
            <div className={styles.panelStack}>
              <StatGrid>
                <MiniStat
                  icon="🔍"
                  label="Total de Consultas"
                  value={gamificationReport.totalQueries}
                />
                <MiniStat
                  icon="💬"
                  label="Mensagens Chat"
                  value={gamificationReport.chatMessages}
                />
                <MiniStat
                  icon="⭐"
                  label="Total XP"
                  value={gamificationReport.totalXp}
                />
                <MiniStat
                  icon="🎖️"
                  label="Conquistas"
                  value={`${gamificationReport.achievementsUnlocked}/${gamificationReport.achievementsUnlocked + gamificationReport.achievementsLocked}`}
                />
              </StatGrid>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Atividade: Consultas e Conversas</div>
                <VerticalBarChart data={chatVsQueries} height={280} />
              </div>
            </div>
          </ReportPanel>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEADERBOARD GLOBAL - Tabela Completa */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {loading.leaderboardDetailed ? (
        <PanelSkeleton rows={1} />
      ) : (
        <ReportPanel
          title="🏆 Leaderboard Global"
          subtitle="Ranking completo de jogadores com estatísticas detalhadas."
        >
          <LeaderboardTable
            data={leaderboardDetailed}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            isLoading={loading.leaderboardDetailed}
            isError={errors.leaderboardDetailed}
          />
        </ReportPanel>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CROSS ANALYTICS - Visão Geral da Galáxia */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ReportPanel
        title="🌌 Visão Geral da Galáxia"
        subtitle="Métricas agregadas e índice de diversidade do universo Star Wars."
      >
        <div className={styles.panelStack}>
          {loading.any ? (
            <>
              <div className={styles.statGridSkeleton}>
                {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
              </div>
              <div className={styles.panelGrid}>
                <ChartSkeleton height={300} />
                <ChartSkeleton height={300} />
              </div>
            </>
          ) : (
            <>
              <StatGrid>
                <MiniStat
                  icon="🎯"
                  label="Índice de Diversidade"
                  value={crossAnalytics.diversityScore}
                  subValue="Baseado em espécies, idiomas e climas"
                />
                <MiniStat
                  icon="👥"
                  label="Média Personagens/Filme"
                  value={crossAnalytics.avgCharactersPerFilm}
                />
                <MiniStat
                  icon="🌍"
                  label="Média Planetas/Filme"
                  value={crossAnalytics.avgPlanetsPerFilm}
                />
                <MiniStat
                  icon="🗣️"
                  label="Idiomas Únicos"
                  value={crossAnalytics.uniqueLanguages}
                />
                <MiniStat
                  icon="🏭"
                  label="Fabricantes Únicos"
                  value={crossAnalytics.uniqueManufacturers}
                />
                <MiniStat
                  icon="🔬"
                  label="Total Espécies"
                  value={totals.species}
                />
              </StatGrid>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Distribuição de Entidades</div>
                  <RadarChartComponent data={crossAnalytics.entitiesSummary} height={300} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Entidades por Filme (Stacked)</div>
                  <StackedBarChart
                    data={filmsReport?.entitiesPerFilm ?? []}
                    keys={['Personagens', 'Planetas', 'Naves', 'Veículos', 'Espécies']}
                    height={300}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ReportPanel>

      <div className={styles.grid}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PERSONAGENS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.characters ? (
          <PanelSkeleton rows={4} />
        ) : charactersReport && (
          <ReportPanel title="👤 Personagens" subtitle="Distribuições demográficas e correlações biométricas.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Gênero</div>
                  <DonutChart data={charactersReport.gender} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Espécies</div>
                  <DonutChart data={charactersReport.speciesDistribution} height={280} />
                </div>
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Altura (buckets)</div>
                  <VerticalBarChart data={charactersReport.heightBuckets} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Massa (buckets)</div>
                  <VerticalBarChart data={charactersReport.massBuckets} height={280} />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Correlação: Altura × Massa</div>
                <ScatterPlotChart
                  data={charactersReport.heightVsMass}
                  xLabel="Altura (cm)"
                  yLabel="Massa (kg)"
                  height={320}
                />
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Cores de Cabelo</div>
                  <HorizontalBarChart
                    data={charactersReport.hairColorsTop}
                    height={Math.min(400, 140 + charactersReport.hairColorsTop.length * 28)}
                  />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Cores de Olhos</div>
                  <HorizontalBarChart
                    data={charactersReport.eyeColorsTop}
                    height={Math.min(400, 140 + charactersReport.eyeColorsTop.length * 28)}
                  />
                </div>
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Cores de Pele</div>
                  <HorizontalBarChart
                    data={charactersReport.skinColorsTop}
                    height={Math.min(400, 140 + charactersReport.skinColorsTop.length * 28)}
                  />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Planetas de Origem</div>
                  <HorizontalBarChart
                    data={charactersReport.homeworldTop}
                    height={Math.min(400, 140 + charactersReport.homeworldTop.length * 28)}
                  />
                </div>
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ESPÉCIES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.species ? (
          <PanelSkeleton rows={3} />
        ) : speciesReport && (
          <ReportPanel title="🧬 Espécies" subtitle="Classificação, designação, idiomas e características biológicas.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Classificação</div>
                  <DonutChart data={speciesReport.classificationTop} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Designação</div>
                  <DonutChart data={speciesReport.designationTop} height={280} />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Idiomas Falados (Top 10)</div>
                <HorizontalBarChart
                  data={speciesReport.languageTop}
                  height={Math.min(480, 140 + speciesReport.languageTop.length * 30)}
                />
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Altura Média</div>
                  <VerticalBarChart data={speciesReport.avgHeightBuckets} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Expectativa de Vida</div>
                  <VerticalBarChart data={speciesReport.avgLifespanBuckets} height={280} />
                </div>
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PLANETAS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.planets ? (
          <PanelSkeleton rows={4} />
        ) : planetsReport && (
          <ReportPanel title="🌍 Planetas" subtitle="Características geográficas, populacionais e ambientais.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>População (buckets)</div>
                  <VerticalBarChart data={planetsReport.populationBuckets} height={300} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Diâmetro (buckets)</div>
                  <VerticalBarChart data={planetsReport.diameterBuckets} height={300} />
                </div>
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Água na Superfície</div>
                  <DonutChart data={planetsReport.surfaceWaterBuckets} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Gravidade</div>
                  <DonutChart data={planetsReport.gravityTypes} height={280} />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Treemap: Climas × Terrenos</div>
                <TreemapChart data={planetsReport.climateTerrainTreemap} height={320} />
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Climas</div>
                  <HorizontalBarChart
                    data={planetsReport.climateTop}
                    height={Math.min(400, 140 + planetsReport.climateTop.length * 28)}
                  />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Terrenos</div>
                  <HorizontalBarChart
                    data={planetsReport.terrainTop}
                    height={Math.min(400, 140 + planetsReport.terrainTop.length * 28)}
                  />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Top Planetas por Residentes</div>
                <HorizontalBarChart
                  data={planetsReport.residentsTop}
                  height={Math.min(400, 140 + planetsReport.residentsTop.length * 30)}
                />
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VEÍCULOS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.vehicles ? (
          <PanelSkeleton rows={3} />
        ) : vehiclesReport && (
          <ReportPanel title="🚗 Veículos" subtitle="Classes, fabricantes e capacidade de transporte terrestre/aéreo.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Classes de Veículos</div>
                  <DonutChart data={vehiclesReport.classTop} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Tripulação (buckets)</div>
                  <VerticalBarChart data={vehiclesReport.crewBuckets} height={280} />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Fabricantes de Veículos</div>
                <HorizontalBarChart
                  data={vehiclesReport.manufacturerTop}
                  height={Math.min(480, 140 + vehiclesReport.manufacturerTop.length * 30)}
                />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Capacidade de Passageiros</div>
                <VerticalBarChart data={vehiclesReport.passengersBuckets} height={280} />
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* NAVES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.starships ? (
          <PanelSkeleton rows={5} />
        ) : starshipsReport && (
          <ReportPanel title="🚀 Naves Estelares" subtitle="Análise técnica: velocidade, custo, capacidade e fabricantes.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Tripulação (buckets)</div>
                  <VerticalBarChart data={starshipsReport.crewBuckets} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Hyperdrive Rating</div>
                  <VerticalBarChart data={starshipsReport.hyperdriveBuckets} height={280} />
                </div>
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Custo em Créditos</div>
                  <VerticalBarChart data={starshipsReport.costBuckets} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Comprimento</div>
                  <VerticalBarChart data={starshipsReport.lengthBuckets} height={280} />
                </div>
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Capacidade de Carga</div>
                <HorizontalBarChart
                  data={starshipsReport.cargoBuckets}
                  height={Math.min(360, 140 + starshipsReport.cargoBuckets.length * 28)}
                />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Correlação: Comprimento × Custo</div>
                <ScatterPlotChart
                  data={starshipsReport.costVsLength}
                  xLabel="Comprimento (m)"
                  yLabel="Custo (créditos)"
                  height={320}
                />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Treemap: Fabricantes por Classe</div>
                <TreemapChart data={starshipsReport.manufacturerByClass} height={300} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Radar: Perfil Médio das Naves</div>
                <RadarChartComponent data={starshipsReport.topShipsRadar} height={320} />
              </div>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Classes de Naves</div>
                  <HorizontalBarChart
                    data={starshipsReport.classTop}
                    height={Math.min(400, 140 + starshipsReport.classTop.length * 28)}
                  />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Top Fabricantes de Naves</div>
                  <HorizontalBarChart
                    data={starshipsReport.manufacturerTop}
                    height={Math.min(480, 140 + starshipsReport.manufacturerTop.length * 28)}
                  />
                </div>
              </div>
            </div>
          </ReportPanel>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILMES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {loading.films ? (
          <PanelSkeleton rows={3} />
        ) : filmsReport && (
          <ReportPanel title="🎬 Filmes" subtitle="Diretores, timeline e scope de cada episódio.">
            <div className={styles.panelStack}>
              <div className={styles.panelGrid}>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Por Ano de Lançamento</div>
                  <VerticalBarChart data={filmsReport.byYear} height={280} />
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartSectionTitle}>Por Diretor</div>
                  <HorizontalBarChart
                    data={filmsReport.byDirector}
                    height={Math.max(260, Math.min(400, 140 + filmsReport.byDirector.length * 30))}
                  />
                </div>
              </div>

              <div className={styles.filmsPreviewHeader}>
                <div className={styles.filmsPreviewTitle}>Filmes (detalhes expandidos)</div>
                <div className={styles.filmsPreviewHint}>
                  {filmsReport.preview.length ? `Mostrando ${filmsReport.preview.length} de ${totals.films}` : '—'}
                </div>
              </div>
              <div className={styles.filmsPreview}>
                {filmsReport.preview.map((film) => (
                  <article key={film.id} className={styles.filmCard}>
                    <div className={styles.filmCardTitleRow}>
                      <div className={styles.filmCardTitle}>
                        Ep. {film.episode_id} · {film.title}
                      </div>
                      <div className={styles.filmCardYear}>{(film.release_date ?? '').slice(0, 4) || '—'}</div>
                    </div>
                    <div className={styles.filmCardMeta}>
                      Diretor: {film.director || '—'} · Produtor: {film.producer || '—'}
                    </div>
                    <div className={styles.filmCardCounts}>
                      <span className={styles.filmCountBadge}>👥 {film.characters_count ?? 0}</span>
                      <span className={styles.filmCountBadge}>🌍 {film.planets_count ?? 0}</span>
                      <span className={styles.filmCountBadge}>🚀 {film.starships_count ?? 0}</span>
                      <span className={styles.filmCountBadge}>🚗 {film.vehicles_count ?? 0}</span>
                      <span className={styles.filmCountBadge}>🧬 {film.species_count ?? 0}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </ReportPanel>
        )}

      </div>
    </section>
  );
}
