import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetAllVentureGroups, useGetCallerUserProfile, useGetMyReturns } from '../hooks/useQueries';
import { Users, DollarSign, Target, TrendingUp, Plus, TrendingDown } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import MyPlannedPayments from '../components/MyPlannedPayments';

interface DashboardProps {
  onNavigateToGroup: (groupId: string) => void;
}

export default function Dashboard({ onNavigateToGroup }: DashboardProps) {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading: groupsLoading } = useGetAllVentureGroups();
  const { data: userProfile } = useGetCallerUserProfile();

  const userPrincipal = identity?.getPrincipal().toString();

  // Filter groups where user is a member or admin
  const myGroups = groups?.filter(
    (group) =>
      group.admin.toString() === userPrincipal ||
      group.members.some((m) => m.principal.toString() === userPrincipal)
  ) || [];

  const stats = [
    {
      title: 'My Groups',
      value: myGroups.length,
      icon: Users,
      description: 'Active venture groups',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: 'Total Groups',
      value: groups?.length || 0,
      icon: TrendingUp,
      description: 'Available on platform',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: 'Admin Groups',
      value: myGroups.filter((g) => g.admin.toString() === userPrincipal).length,
      icon: Target,
      description: 'Groups you manage',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      title: 'Member Groups',
      value: myGroups.filter((g) => g.admin.toString() !== userPrincipal).length,
      icon: DollarSign,
      description: 'Groups you joined',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
  ];

  if (groupsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {userProfile?.name}!</h1>
        <p className="text-muted-foreground">Here's an overview of your agriculture ventures</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Planned Payments Section */}
      {myGroups.length > 0 && (
        <div className="mb-8">
          <MyPlannedPayments />
        </div>
      )}

      {/* My Returns Section */}
      {myGroups.length > 0 && (
        <Card className="mb-8 border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <img src="/assets/generated/payout-icon-transparent.dim_64x64.png" alt="Returns" className="h-8 w-8" />
              <CardTitle>My Returns</CardTitle>
            </div>
            <CardDescription>Your investment returns across all groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myGroups.map((group) => (
                <MyReturnsCard key={group.id} groupId={group.id} groupName={group.name} currency={group.currency} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Groups */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">My Recent Groups</h2>
        </div>
        {myGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">Create or join a venture group to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myGroups.slice(0, 6).map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigateToGroup(group.id)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.admin.toString() === userPrincipal && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{group.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members:</span>
                      <span className="font-medium">{group.members.length + 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contribution:</span>
                      <span className="font-medium">EUR {Number(group.monthlyContributionAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Group
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Browse All Groups
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MyReturnsCard({ groupId, groupName, currency }: { groupId: string; groupName: string; currency: string }) {
  const { data: returns, isLoading } = useGetMyReturns(groupId);

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  if (!returns) {
    return null;
  }

  const totalContributed = Number(returns.totalContributed);
  const totalReceived = Number(returns.totalReceived);
  const netProfit = Number(returns.netProfit);
  const netProfitColor = netProfit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold">{groupName}</h3>
        <Badge variant="outline">{currency}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Contributed</p>
          <p className="text-lg font-bold">{currency} {totalContributed.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Received</p>
          <p className="text-lg font-bold text-emerald-600">{currency} {totalReceived.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Net Profit/Loss</p>
          <div className="flex items-center gap-1">
            <p className={`text-lg font-bold ${netProfitColor}`}>
              {netProfit >= 0 ? '+' : ''}{currency} {netProfit.toFixed(2)}
            </p>
            {netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
