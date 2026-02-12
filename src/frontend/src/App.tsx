import { useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import Dashboard from './pages/Dashboard';
import MyGroups from './pages/MyGroups';
import Contributions from './pages/Contributions';
import Milestones from './pages/Milestones';
import GroupDetail from './pages/GroupDetail';
import GroupDashboard from './pages/GroupDashboard';
import LandingPage from './pages/LandingPage';

export type Page = 'landing' | 'dashboard' | 'groups' | 'contributions' | 'milestones' | 'group-detail' | 'group-dashboard';

export default function App() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const isAuthenticated = !!identity;

  // Show profile setup modal only when authenticated, profile is fetched, and no profile exists
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPage('landing');
      setSelectedGroupId(null);
    } else if (userProfile && currentPage === 'landing') {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, userProfile, currentPage]);

  const navigateToGroupDetail = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentPage('group-detail');
  };

  const navigateToGroupDashboard = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentPage('group-dashboard');
  };

  const navigateToPage = (page: Page) => {
    setCurrentPage(page);
    if (page !== 'group-detail' && page !== 'group-dashboard') {
      setSelectedGroupId(null);
    }
  };

  const renderPage = () => {
    if (!isAuthenticated || !userProfile) {
      return <LandingPage />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigateToGroup={navigateToGroupDashboard} />;
      case 'groups':
        return (
          <MyGroups 
            onNavigateToGroup={navigateToGroupDetail}
            onNavigateToGroupDashboard={navigateToGroupDashboard}
          />
        );
      case 'contributions':
        return <Contributions />;
      case 'milestones':
        return <Milestones />;
      case 'group-detail':
        return selectedGroupId ? (
          <GroupDetail 
            groupId={selectedGroupId} 
            onBack={() => navigateToPage('groups')}
            onNavigateToGroupDashboard={navigateToGroupDashboard}
          />
        ) : (
          <Dashboard onNavigateToGroup={navigateToGroupDashboard} />
        );
      case 'group-dashboard':
        return selectedGroupId ? (
          <GroupDashboard 
            groupId={selectedGroupId} 
            onBack={() => navigateToPage('dashboard')}
            onViewDetails={() => navigateToGroupDetail(selectedGroupId)}
          />
        ) : (
          <Dashboard onNavigateToGroup={navigateToGroupDashboard} />
        );
      default:
        return <Dashboard onNavigateToGroup={navigateToGroupDashboard} />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header 
          currentPage={currentPage} 
          onNavigate={navigateToPage}
          selectedGroupId={selectedGroupId}
        />
        <main className="flex-1">
          {renderPage()}
        </main>
        <Footer />
        {showProfileSetup && <ProfileSetupModal />}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
