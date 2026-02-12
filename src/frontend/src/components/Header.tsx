import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetVentureGroup } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, Users, DollarSign, Target, Menu, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Page } from '../App';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  selectedGroupId?: string | null;
}

export default function Header({ currentPage, onNavigate, selectedGroupId }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: selectedGroup } = useGetVentureGroup(selectedGroupId || null);
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const navItems = [
    { page: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { page: 'groups' as Page, label: 'My Groups', icon: Users },
    { page: 'contributions' as Page, label: 'Contributions', icon: DollarSign },
    { page: 'milestones' as Page, label: 'Milestones', icon: Target },
  ];

  const showGroupBreadcrumb = (currentPage === 'group-dashboard' || currentPage === 'group-detail') && selectedGroup;

  const handleNavigation = (page: Page) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
              <div className="relative p-1.5 rounded-xl bg-primary/10 ring-2 ring-primary/20 shadow-md hover:shadow-lg transition-shadow">
                <img 
                  src="/assets/generated/platform-logo-high-contrast.dim_200x200.png" 
                  alt="AgriVenture Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-lg" 
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold text-primary">AgriVenture</h1>
                <p className="text-xs text-muted-foreground">Funding Platform</p>
              </div>
            </div>
            
            {/* Breadcrumb for Group Views */}
            {showGroupBreadcrumb && (
              <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('dashboard')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[150px]">{selectedGroup.name}</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && userProfile && !showGroupBreadcrumb && (
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navItems.map(({ page, label, icon: Icon }) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate(page)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              ))}
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAuthenticated && userProfile && (
              <div className="hidden sm:flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline max-w-[120px] truncate">{userProfile.name}</span>
              </div>
            )}
            <Button
              onClick={handleAuth}
              disabled={disabled}
              variant={isAuthenticated ? 'outline' : 'default'}
              size="sm"
              className="whitespace-nowrap"
            >
              {disabled ? 'Loading...' : isAuthenticated ? 'Logout' : 'Login'}
            </Button>

            {/* Mobile Menu Toggle */}
            {isAuthenticated && userProfile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6">
                    <div className="flex flex-col gap-2">
                      {/* User Profile in Mobile Menu */}
                      <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-muted">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {userProfile.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userProfile.name}</p>
                          <p className="text-xs text-muted-foreground">{userProfile.country}</p>
                        </div>
                      </div>

                      {/* Navigation Items */}
                      {navItems.map(({ page, label, icon: Icon }) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'ghost'}
                          onClick={() => handleNavigation(page)}
                          className="justify-start gap-3 h-12"
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-base">{label}</span>
                        </Button>
                      ))}

                      {/* Group Breadcrumb in Mobile Menu */}
                      {showGroupBreadcrumb && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-2 px-3">Current Group</p>
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-sm font-medium">{selectedGroup.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{selectedGroup.category}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
