import { useState } from 'react';
import { CharactersPage } from '@/features/characters/pages/CharactersPage/CharactersPage';
import { ChatProvider } from '@/features/chat/context';
import { YodaChatBubble } from '@/features/chat/components/YodaChatBubble/YodaChatBubble';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage/DashboardPage';
import { FilmsPage } from '@/features/films/pages/FilmsPage/FilmsPage';
import { GamificationPage } from '@/features/gamification/pages/GamificationPage/GamificationPage';
import { PlanetsPage } from '@/features/planets/pages/PlanetsPage/PlanetsPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage/ReportsPage';
import { StarshipsPage } from '@/features/starships/pages/StarshipsPage/StarshipsPage';
import { VehiclesPage } from '@/features/vehicles/pages/VehiclesPage/VehiclesPage';
import { SpeciesPage } from '@/features/species/pages/SpeciesPage/SpeciesPage';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LoginPage } from '@/features/auth/pages/LoginPage/LoginPage';
import { AuthLoadingPage } from '@/features/auth/pages/AuthLoadingPage';
import { UserMenu } from '@/features/auth/components/UserMenu/UserMenu';
import { PageLayout } from '@/shared/components/PageLayout';
import { StarfieldEvents } from '@/shared/components/StarfieldEvents';
import { usePrefetchAllData } from '@/shared/hooks/usePrefetchAllData';
import { useAppNavigation } from './App.hooks';
import styles from './App.module.css';

function AppShell() {
  const { activeSection, navigationItems, setActiveSection } = useAppNavigation();
  const [language, setLanguage] = useState<'en' | 'pt-BR'>('en');
  const { status } = useAuth();

  // Prefetch de todos os dados em background após autenticação
  // Isso garante navegação rápida e dados disponíveis para o quiz
  usePrefetchAllData();

  if (status === 'loading') {
    return <AuthLoadingPage />;
  }

  if (status !== 'authenticated') {
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
            {activeSection === 'dashboard' && <DashboardPage />}
            {activeSection === 'reports' && <ReportsPage />}
            {activeSection === 'characters' && <CharactersPage />}
            {activeSection === 'planets' && <PlanetsPage />}
            {activeSection === 'starships' && <StarshipsPage />}
            {activeSection === 'vehicles' && <VehiclesPage />}
            {activeSection === 'species' && <SpeciesPage />}
            {activeSection === 'films' && <FilmsPage />}
            {activeSection === 'gamification' && <GamificationPage />}
          </section>
          <YodaChatBubble />
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
