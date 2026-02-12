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
            <p className="text-xs text-muted-foreground mt-1">Operating expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
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
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfitColor}`}>
              {netProfit >= 0 ? '+' : ''}
              {financialSummary.currency} {netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fundraising Progress</CardTitle>
          <CardDescription>
            {progressPercentage}% of target amount raised
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-3 mb-4" />
          <div className="flex justify-between text-sm mb-6">
            <span className="text-muted-foreground">
              Raised: {financialSummary.currency} {totalRaised.toFixed(2)}
            </span>
            <span className="text-muted-foreground">
              Target: {financialSummary.currency} {targetAmount.toFixed(2)}
            </span>
          </div>
          
          {totalRaised > 0 && (
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Funds Spent</span>
                  <span className="font-semibold">{fundsSpentPercentage}%</span>
                </div>
                <Progress value={fundsSpentPercentage} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Spent: {financialSummary.currency} {totalSpent.toFixed(2)}</span>
                  <span>Remaining: {financialSummary.currency} {remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planned Payments Section */}
      <div className="mb-8">
        <PlannedPaymentsSection groupId={groupId} isAdmin={isAdmin} />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Milestones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Milestones</CardTitle>
                <CardDescription>
                  {completedMilestones} completed, {pendingMilestones} pending
                </CardDescription>
              </div>
              <img src="/assets/generated/milestone-badge-transparent.dim_64x64.png" alt="Milestones" className="h-10 w-10" />
            </div>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No milestones yet</p>
            ) : (
              <div className="space-y-4">
                {milestones.slice(0, 5).map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {milestone.status === MilestoneStatus.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{milestone.name}</h4>
                        <Badge variant={milestone.status === MilestoneStatus.completed ? 'default' : 'secondary'} className="flex-shrink-0">
                          {milestone.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {milestone.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(Number(milestone.targetDate) / 1000000), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
                {milestones.length > 5 && (
                  <Button variant="outline" className="w-full" onClick={onViewDetails}>
                    View All {milestones.length} Milestones
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contributions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Contributions</CardTitle>
                <CardDescription>Latest member contributions</CardDescription>
              </div>
              <img src="/assets/generated/contribution-icon-transparent.dim_64x64.png" alt="Contributions" className="h-10 w-10" />
            </div>
          </CardHeader>
          <CardContent>
            {recentContributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No contributions yet</p>
            ) : (
              <div className="space-y-3">
                {recentContributions.map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {contribution.contributorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contribution.contributorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {contribution.datePaid ? format(new Date(Number(contribution.datePaid) / 1000000), 'MMM dd, yyyy') : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {groupInfo.currency} {centsToUnits(contribution.amount).toFixed(2)}
                      </p>
                      <Badge variant={contribution.status === ContributionStatus.paid ? 'default' : 'secondary'} className="text-xs">
                        {contribution.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates and events in this group</CardDescription>
        </CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activityFeed.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.activityType === ActivityType.contributionMade && <DollarSign className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.memberJoined && <Users className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.milestoneUpdated && <Target className="h-4 w-4 text-primary" />}
                    {activity.activityType === ActivityType.expenseAdded && <TrendingDown className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(Number(activity.timestamp) / 1000000), 'MMM dd, yyyy HH:mm')}
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
