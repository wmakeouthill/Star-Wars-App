import {
  DonutChart,
  HorizontalBarChart,
  MiniStat,
  RadarChartComponent,
  ReportPanel,
  ScatterPlotChart,
  StackedBarChart,
  StatGrid,
  TreemapChart,
  VerticalBarChart,
} from '@/features/reports/components';
import { useReportsPage } from './ReportsPage.hooks';
import styles from './ReportsPage.module.css';

export function ReportsPage() {
  const { snapshotQuery, report, achievementsDonut, chatVsQueries, leaderboard, challengeProgress } = useReportsPage();

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
            <span className={styles.kpiLabel}>Veículos</span>
            <span className={styles.kpiValue}>{report?.totals.vehicles ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Espécies</span>
            <span className={styles.kpiValue}>{report?.totals.species ?? '—'}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Filmes</span>
            <span className={styles.kpiValue}>{report?.totals.films ?? '—'}</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiHighlight}`}>
            <span className={styles.kpiLabel}>Rank</span>
            <span className={styles.kpiValue}>{report?.gamification.jediRank ?? '—'}</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiHighlight}`}>
            <span className={styles.kpiLabel}>XP</span>
            <span className={styles.kpiValue}>{report?.gamification.totalXp ?? '—'}</span>
          </div>
        </div>

        {snapshotQuery.isLoading && <div className={styles.status}>Carregando relatórios…</div>}
        {snapshotQuery.isError && (
          <div className={styles.status}>Não foi possível carregar os relatórios. Verifique o backend e tente novamente.</div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CROSS ANALYTICS - Visão Geral da Galáxia */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ReportPanel
        title="🌌 Visão Geral da Galáxia"
        subtitle="Métricas agregadas e índice de diversidade do universo Star Wars."
      >
        <div className={styles.panelStack}>
          <StatGrid>
            <MiniStat
              icon="🎯"
              label="Índice de Diversidade"
              value={report?.crossAnalytics.diversityScore ?? 0}
              subValue="Baseado em espécies, idiomas e climas"
            />
            <MiniStat
              icon="👥"
              label="Média Personagens/Filme"
              value={report?.crossAnalytics.avgCharactersPerFilm ?? 0}
            />
            <MiniStat
              icon="🌍"
              label="Média Planetas/Filme"
              value={report?.crossAnalytics.avgPlanetsPerFilm ?? 0}
            />
            <MiniStat
              icon="🗣️"
              label="Idiomas Únicos"
              value={report?.crossAnalytics.uniqueLanguages ?? 0}
            />
            <MiniStat
              icon="🏭"
              label="Fabricantes Únicos"
              value={report?.crossAnalytics.uniqueManufacturers ?? 0}
            />
            <MiniStat
              icon="🔬"
              label="Total Espécies"
              value={report?.totals.species ?? 0}
            />
          </StatGrid>
          <div className={styles.panelGrid}>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Distribuição de Entidades</div>
              <RadarChartComponent data={report?.crossAnalytics.entitiesSummary ?? []} height={300} />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Entidades por Filme (Stacked)</div>
              <StackedBarChart
                data={report?.films.entitiesPerFilm ?? []}
                keys={['Personagens', 'Planetas', 'Naves', 'Veículos', 'Espécies']}
                height={300}
              />
            </div>
          </div>
        </div>
      </ReportPanel>

      <div className={styles.grid}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PERSONAGENS - Expandido */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="👤 Personagens" subtitle="Distribuições demográficas e correlações biométricas.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Gênero</div>
                <DonutChart data={report?.characters.gender ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Espécies</div>
                <DonutChart data={report?.characters.speciesDistribution ?? []} height={280} />
              </div>
            </div>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Altura (buckets)</div>
                <VerticalBarChart data={report?.characters.heightBuckets ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Massa (buckets)</div>
                <VerticalBarChart data={report?.characters.massBuckets ?? []} height={280} />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Correlação: Altura × Massa</div>
              <ScatterPlotChart
                data={report?.characters.heightVsMass ?? []}
                xLabel="Altura (cm)"
                yLabel="Massa (kg)"
                height={320}
              />
            </div>
            <div className={styles.panelGrid}>
              <HorizontalBarChart
                data={report?.characters.hairColorsTop ?? []}
                height={Math.min(400, 140 + (report?.characters.hairColorsTop.length ?? 0) * 28)}
              />
              <HorizontalBarChart
                data={report?.characters.eyeColorsTop ?? []}
                height={Math.min(400, 140 + (report?.characters.eyeColorsTop.length ?? 0) * 28)}
              />
            </div>
            <div className={styles.panelGrid}>
              <HorizontalBarChart
                data={report?.characters.skinColorsTop ?? []}
                height={Math.min(400, 140 + (report?.characters.skinColorsTop.length ?? 0) * 28)}
              />
              <HorizontalBarChart
                data={report?.characters.homeworldTop ?? []}
                height={Math.min(400, 140 + (report?.characters.homeworldTop.length ?? 0) * 28)}
              />
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ESPÉCIES - Nova Seção */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="🧬 Espécies" subtitle="Classificação, designação, idiomas e características biológicas.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Classificação</div>
                <DonutChart data={report?.species.classificationTop ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Designação</div>
                <DonutChart data={report?.species.designationTop ?? []} height={280} />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Idiomas Falados (Top 10)</div>
              <HorizontalBarChart
                data={report?.species.languageTop ?? []}
                height={Math.min(480, 140 + (report?.species.languageTop.length ?? 0) * 30)}
              />
            </div>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Altura Média</div>
                <VerticalBarChart data={report?.species.avgHeightBuckets ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Expectativa de Vida</div>
                <VerticalBarChart data={report?.species.avgLifespanBuckets ?? []} height={280} />
              </div>
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PLANETAS - Expandido */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="🌍 Planetas" subtitle="Características geográficas, populacionais e ambientais.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>População (buckets)</div>
                <VerticalBarChart data={report?.planets.populationBuckets ?? []} height={300} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Diâmetro (buckets)</div>
                <VerticalBarChart data={report?.planets.diameterBuckets ?? []} height={300} />
              </div>
            </div>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Água na Superfície</div>
                <DonutChart data={report?.planets.surfaceWaterBuckets ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Gravidade</div>
                <DonutChart data={report?.planets.gravityTypes ?? []} height={280} />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Treemap: Climas × Terrenos</div>
              <TreemapChart data={report?.planets.climateTerrainTreemap ?? []} height={320} />
            </div>
            <div className={styles.panelGrid}>
              <HorizontalBarChart
                data={report?.planets.climateTop ?? []}
                height={Math.min(400, 140 + (report?.planets.climateTop.length ?? 0) * 28)}
              />
              <HorizontalBarChart
                data={report?.planets.terrainTop ?? []}
                height={Math.min(400, 140 + (report?.planets.terrainTop.length ?? 0) * 28)}
              />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Top Planetas por Residentes</div>
              <HorizontalBarChart
                data={report?.planets.residentsTop ?? []}
                height={Math.min(400, 140 + (report?.planets.residentsTop.length ?? 0) * 30)}
              />
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VEÍCULOS - Nova Seção */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="🚗 Veículos" subtitle="Classes, fabricantes e capacidade de transporte terrestre/aéreo.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Classes de Veículos</div>
                <DonutChart data={report?.vehicles.classTop ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Tripulação (buckets)</div>
                <VerticalBarChart data={report?.vehicles.crewBuckets ?? []} height={280} />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Fabricantes de Veículos</div>
              <HorizontalBarChart
                data={report?.vehicles.manufacturerTop ?? []}
                height={Math.min(480, 140 + (report?.vehicles.manufacturerTop.length ?? 0) * 30)}
              />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Capacidade de Passageiros</div>
              <VerticalBarChart data={report?.vehicles.passengersBuckets ?? []} height={280} />
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* NAVES - Expandido */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="🚀 Naves Estelares" subtitle="Análise técnica: velocidade, custo, capacidade e fabricantes.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Tripulação (buckets)</div>
                <VerticalBarChart data={report?.starships.crewBuckets ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Hyperdrive Rating</div>
                <VerticalBarChart data={report?.starships.hyperdriveBuckets ?? []} height={280} />
              </div>
            </div>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Custo em Créditos</div>
                <VerticalBarChart data={report?.starships.costBuckets ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Comprimento</div>
                <VerticalBarChart data={report?.starships.lengthBuckets ?? []} height={280} />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Capacidade de Carga</div>
              <HorizontalBarChart
                data={report?.starships.cargoBuckets ?? []}
                height={Math.min(360, 140 + (report?.starships.cargoBuckets.length ?? 0) * 28)}
              />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Correlação: Comprimento × Custo</div>
              <ScatterPlotChart
                data={report?.starships.costVsLength ?? []}
                xLabel="Comprimento (m)"
                yLabel="Custo (créditos)"
                height={320}
              />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Treemap: Fabricantes por Classe</div>
              <TreemapChart data={report?.starships.manufacturerByClass ?? []} height={300} />
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Radar: Perfil Médio das Naves</div>
              <RadarChartComponent data={report?.starships.topShipsRadar ?? []} height={320} />
            </div>
            <div className={styles.panelGrid}>
              <HorizontalBarChart
                data={report?.starships.classTop ?? []}
                height={Math.min(400, 140 + (report?.starships.classTop.length ?? 0) * 28)}
              />
              <HorizontalBarChart
                data={report?.starships.manufacturerTop ?? []}
                height={Math.min(480, 140 + (report?.starships.manufacturerTop.length ?? 0) * 28)}
              />
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILMES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="🎬 Filmes" subtitle="Diretores, timeline e scope de cada episódio.">
          <div className={styles.panelStack}>
            <div className={styles.panelGrid}>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Por Ano de Lançamento</div>
                <VerticalBarChart data={report?.films.byYear ?? []} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Por Diretor</div>
                <HorizontalBarChart
                  data={report?.films.byDirector ?? []}
                  height={Math.max(260, Math.min(400, 140 + (report?.films.byDirector.length ?? 0) * 30))}
                />
              </div>
            </div>

            <div className={styles.filmsPreviewHeader}>
              <div className={styles.filmsPreviewTitle}>Filmes (detalhes expandidos)</div>
              <div className={styles.filmsPreviewHint}>
                {report?.films.preview?.length ? `Mostrando ${report.films.preview.length} de ${report.totals.films}` : '—'}
              </div>
            </div>
            <div className={styles.filmsPreview}>
              {(report?.films.preview ?? []).map((film) => (
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* GAMIFICAÇÃO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
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
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Conquistas</div>
                <DonutChart data={achievementsDonut} height={280} />
              </div>
              <div className={styles.chartSection}>
                <div className={styles.chartSectionTitle}>Top Recompensas XP</div>
                <HorizontalBarChart
                  data={report?.gamification.achievementsRewardsTop ?? []}
                  height={Math.min(400, 140 + (report?.gamification.achievementsRewardsTop.length ?? 0) * 28)}
                />
              </div>
            </div>
            <div className={styles.chartSection}>
              <div className={styles.chartSectionTitle}>Leaderboard Global</div>
              <HorizontalBarChart data={leaderboard} height={Math.min(480, 160 + leaderboard.length * 30)} />
            </div>
          </div>
        </ReportPanel>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CHAT / ATIVIDADE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ReportPanel title="💬 Atividade do Usuário" subtitle="Comparação entre consultas à API e mensagens no chat.">
          <div className={styles.panelStack}>
            <StatGrid>
              <MiniStat
                icon="🔍"
                label="Total de Consultas"
                value={report?.gamification.totalQueries ?? 0}
              />
              <MiniStat
                icon="💬"
                label="Mensagens Chat"
                value={report?.gamification.chatMessages ?? 0}
              />
              <MiniStat
                icon="⭐"
                label="Total XP"
                value={report?.gamification.totalXp ?? 0}
              />
              <MiniStat
                icon="🎖️"
                label="Conquistas"
                value={`${report?.gamification.achievementsUnlocked ?? 0}/${(report?.gamification.achievementsUnlocked ?? 0) + (report?.gamification.achievementsLocked ?? 0)}`}
              />
            </StatGrid>
            <VerticalBarChart data={chatVsQueries} height={280} />
          </div>
        </ReportPanel>
      </div>
    </section>
  );
}
