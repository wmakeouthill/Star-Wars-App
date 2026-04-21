import { lazy, Suspense, useState } from 'react';
import { ChatProvider } from '@/features/chat/context';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LoginPage } from '@/features/auth/pages/LoginPage/LoginPage';
import { AuthLoadingPage } from '@/features/auth/pages/AuthLoadingPage';
import { UserMenu } from '@/features/auth/components/UserMenu/UserMenu';
import { PageLayout } from '@/shared/components/PageLayout';
import { StarfieldEvents } from '@/shared/components/StarfieldEvents';
import { ScrollToTop } from '@/shared/components/ScrollToTop';
import { usePrefetchAllData } from '@/shared/hooks/usePrefetchAllData';
import { useAppNavigation } from './App.hooks';
import styles from './App.module.css';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const CharactersPage = lazy(() =>
  import('@/features/characters/pages/CharactersPage/CharactersPage').then((m) => ({ default: m.CharactersPage }))
);
const PlanetsPage = lazy(() =>
  import('@/features/planets/pages/PlanetsPage/PlanetsPage').then((m) => ({ default: m.PlanetsPage }))
);
const StarshipsPage = lazy(() =>
  import('@/features/starships/pages/StarshipsPage/StarshipsPage').then((m) => ({ default: m.StarshipsPage }))
);
const VehiclesPage = lazy(() =>
  import('@/features/vehicles/pages/VehiclesPage/VehiclesPage').then((m) => ({ default: m.VehiclesPage }))
);
const SpeciesPage = lazy(() =>
  import('@/features/species/pages/SpeciesPage/SpeciesPage').then((m) => ({ default: m.SpeciesPage }))
);
const FilmsPage = lazy(() =>
  import('@/features/films/pages/FilmsPage/FilmsPage').then((m) => ({ default: m.FilmsPage }))
);
const GamificationPage = lazy(() =>
  import('@/features/gamification/pages/GamificationPage/GamificationPage').then((m) => ({ default: m.GamificationPage }))
);
const YodaChatBubble = lazy(() =>
  import('@/features/chat/components/YodaChatBubble/YodaChatBubble').then((m) => ({ default: m.YodaChatBubble }))
);

function AppShell() {
  const { activeSection, navigationItems, setActiveSection } = useAppNavigation();
  const [language, setLanguage] = useState<'en' | 'pt-BR'>('en');
  const { status } = useAuth();

  const isAuthenticated = status === 'authenticated';
  usePrefetchAllData({ enabled: isAuthenticated });

  if (status === 'loading') {
    return <AuthLoadingPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ChatProvider>
      <StarfieldEvents />
      <div className={styles.app}>
        <PageLayout
          title="Holocron Analytics"
          right={<UserMenu />}
          subtitle={
            <div className={styles.subtitleBlock}>
              <div className={styles.punLine}>
                <div className={styles.tagline}>
                  {language === 'en' ? (
                    <>May the <strong>Power of Data</strong> be with you.</>
                  ) : (
                    <>Que a <strong>força dos dados</strong> esteja com você.</>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.languageToggle}
                  onClick={() => setLanguage((prev) => (prev === 'en' ? 'pt-BR' : 'en'))}
                  aria-label={language === 'en' ? 'Traduzir para PT-BR' : 'Switch to English'}
                  title={language === 'en' ? 'Traduzir para PT-BR' : 'Switch to English'}
                >
                  {language === 'en' ? 'PT-BR' : 'EN'}
                </button>
              </div>

              <div className={styles.subline}>Desbloqueie o conhecimento da galáxia</div>
            </div>
          }
        >
          <nav className={styles.navigation}>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`${styles.navigationButton} ${
                  activeSection === item.id ? styles.navigationButtonActive : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <section className={styles.content}>
            <Suspense fallback={null}>
              {activeSection === 'dashboard' && <DashboardPage />}
              {activeSection === 'reports' && <ReportsPage />}
              {activeSection === 'characters' && <CharactersPage />}
              {activeSection === 'planets' && <PlanetsPage />}
              {activeSection === 'starships' && <StarshipsPage />}
              {activeSection === 'vehicles' && <VehiclesPage />}
              {activeSection === 'species' && <SpeciesPage />}
              {activeSection === 'films' && <FilmsPage />}
              {activeSection === 'gamification' && <GamificationPage />}
            </Suspense>
          </section>
          <Suspense fallback={null}>
            <YodaChatBubble />
          </Suspense>
          <ScrollToTop />
        </PageLayout>
      </div>
    </ChatProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
