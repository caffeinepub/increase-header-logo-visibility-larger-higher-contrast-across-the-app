import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetGroupDashboardData } from '../hooks/useQueries';
import { ArrowLeft, CheckCircle2, Clock, DollarSign, TrendingUp, TrendingDown, Users, Target, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { MilestoneStatus, ContributionStatus, ActivityType } from '../backend';
import PlannedPaymentsSection from '../components/PlannedPaymentsSection';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { centsToUnits } from '../lib/money';

interface GroupDashboardProps {
  groupId: string;
  onBack: () => void;
  onViewDetails: () => void;
}

export default function GroupDashboard({ groupId, onBack, onViewDetails }: GroupDashboardProps) {
  const { identity } = useInternetIdentity();
  const { data: dashboardData, isLoading } = useGetGroupDashboardData(groupId);

  const userPrincipal = identity?.getPrincipal().toString();
  const isAdmin = dashboardData?.groupInfo.admin.toString() === userPrincipal;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Group not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { groupInfo, groupProgress, milestones, recentContributions, financialSummary, activityFeed } = dashboardData;

  // Convert all cents values to display units
  const totalRaised = centsToUnits(financialSummary.totalRaised);
  const totalSpent = centsToUnits(financialSummary.totalSpent);
  const totalRevenue = centsToUnits(financialSummary.totalRevenue);
  const netProfit = centsToUnits(financialSummary.netProfit);
  const remainingBalance = centsToUnits(financialSummary.remainingBalance);
  const targetAmount = centsToUnits(groupProgress.targetAmount);

  const progressPercentage = Number(groupProgress.progressPercentage);
  const netProfitColor = netProfit >= 0 ? 'text-green-600' : 'text-red-600';

  const pendingMilestones = milestones.filter(m => m.status === MilestoneStatus.pending).length;
  const completedMilestones = milestones.filter(m => m.status === MilestoneStatus.completed).length;

  // Calculate funds spent percentage
  const fundsSpentPercentage = totalRaised > 0 
    ? Math.round((totalSpent / totalRaised) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{groupInfo.name}</h1>
            <p className="text-muted-foreground">{groupInfo.description}</p>
          </div>
        </div>
        <Button onClick={onViewDetails} className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Group
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialSummary.currency} {totalRaised.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {financialSummary.currency} {targetAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialSummary.currency} {totalSpent.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fundsSpentPercentage}% of funds used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialSummary.currency} {totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Income generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <div className={`h-10 w-10 rounded-lg ${netProfit >= 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'} flex items-center justify-center`}>
              {netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfitColor}`}>
              {netProfit >= 0 ? '+' : ''}{financialSummary.currency} {netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Fundraising Progress */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Fundraising Progress</CardTitle>
          </div>
          <CardDescription>Track progress towards your target goal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Progress</p>
                <p className="text-2xl font-bold">{financialSummary.currency} {totalRaised.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Target Goal</p>
                <p className="text-2xl font-bold text-muted-foreground">{financialSummary.currency} {targetAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Remaining Balance</p>
                <p className="text-xl font-bold">{financialSummary.currency} {remainingBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Members</p>
                <p className="text-xl font-bold">{groupInfo.members.length + 1}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planned Payments Section */}
      <div className="mb-8">
        <PlannedPaymentsSection groupId={groupId} isAdmin={isAdmin} />
      </div>

      {/* Milestones */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>Track project progress and achievements</CardDescription>
            </div>
            <Badge variant="outline">
              {completedMilestones}/{milestones.length} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No milestones yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.slice(0, 5).map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {milestone.status === MilestoneStatus.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(Number(milestone.targetDate / BigInt(1_000_000))), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={milestone.status === MilestoneStatus.completed ? 'default' : 'secondary'}>
                    {milestone.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Contributions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Contributions</CardTitle>
          <CardDescription>Latest member contributions to the group</CardDescription>
        </CardHeader>
        <CardContent>
          {recentContributions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No contributions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentContributions.map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{contribution.contributorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {contribution.datePaid && format(new Date(Number(contribution.datePaid / BigInt(1_000_000))), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{financialSummary.currency} {centsToUnits(contribution.amount).toFixed(2)}</p>
                    <Badge variant={contribution.status === ContributionStatus.paid ? 'default' : 'secondary'}>
                      {contribution.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates and events in the group</CardDescription>
        </CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityFeed.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.activityType === ActivityType.memberJoined && <Users className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.contributionMade && <DollarSign className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.milestoneUpdated && <Target className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.expenseAdded && <TrendingDown className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(Number(activity.timestamp / BigInt(1_000_000))), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
