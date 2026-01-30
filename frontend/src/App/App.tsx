import { useState } from 'react';
import { CharactersPage } from '@/features/characters/pages/CharactersPage/CharactersPage';
import { ChatProvider } from '@/features/chat/context';
import { ChatPage } from '@/features/chat/pages/ChatPage/ChatPage';
import { YodaChatBubble } from '@/features/chat/components/YodaChatBubble/YodaChatBubble';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage/DashboardPage';
import { FilmsPage } from '@/features/films/pages/FilmsPage/FilmsPage';
import { GamificationPage } from '@/features/gamification/pages/GamificationPage/GamificationPage';
import { PlanetsPage } from '@/features/planets/pages/PlanetsPage/PlanetsPage';
import { StarshipsPage } from '@/features/starships/pages/StarshipsPage/StarshipsPage';
import { PageLayout } from '@/shared/components/PageLayout';
import { useAppNavigation } from './App.hooks';
import styles from './App.module.css';

export function App() {
  const { activeSection, navigationItems, setActiveSection } = useAppNavigation();
  const [language, setLanguage] = useState<'en' | 'pt-BR'>('en');

  return (
    <ChatProvider>
      <div className={styles.app}>
        <PageLayout
          title="Holocron Analytics"
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
            {activeSection === 'characters' && <CharactersPage />}
            {activeSection === 'planets' && <PlanetsPage />}
            {activeSection === 'starships' && <StarshipsPage />}
            {activeSection === 'films' && <FilmsPage />}
            {activeSection === 'chat' && <ChatPage />}
            {activeSection === 'gamification' && <GamificationPage />}
          </section>
          <YodaChatBubble />
        </PageLayout>
      </div>
    </ChatProvider>
  );
}
