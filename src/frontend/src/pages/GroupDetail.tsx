import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  useGetVentureGroup,
  useGetContributionsWithProfilesByGroup,
  useGetMilestonesByGroup,
  useGetActivityFeedByGroup,
  useJoinVentureGroup,
  useGetGroupProgress,
  useGetExpensesByGroup,
  useGetRevenuesByGroup,
  useGetUserProfile,
  useDeleteContribution,
  useDeleteExpense,
} from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { ArrowLeft, Users, DollarSign, Target, Activity, Plus, TrendingUp, Receipt, FileText, TrendingDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AddContributionDialog from '../components/AddContributionDialog';
import AddMilestoneDialog from '../components/AddMilestoneDialog';
import AddExpenseDialog from '../components/AddExpenseDialog';
import AddRevenueDialog from '../components/AddRevenueDialog';
import ReceiptModal from '../components/ReceiptModal';
import PayoutCalculator from '../components/PayoutCalculator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ContributionWithProfile, Expense, Revenue, ExternalBlob } from '../backend';
import { centsToUnits } from '../lib/money';
import { sumCentsNumeric } from '../lib/moneyMath';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
  onNavigateToGroupDashboard?: (groupId: string) => void;
}

function ContributionItem({ 
  contribution, 
  currency, 
  canDelete, 
  onDelete 
}: { 
  contribution: ContributionWithProfile; 
  currency: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isPrincipalId = contribution.contributorName.length > 20 && !contribution.contributorName.includes(' ');
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium">{currency} {centsToUnits(contribution.amount).toFixed(2)}</p>
          <Badge variant={contribution.status === 'paid' ? 'default' : 'secondary'}>
            {contribution.status}
          </Badge>
        </div>
        <p className={`text-sm ${isPrincipalId ? 'text-muted-foreground text-xs font-mono' : 'text-muted-foreground'}`}>
          {isPrincipalId ? `${contribution.contributorName.slice(0, 15)}...` : contribution.contributorName}
        </p>
        {contribution.datePaid && (
          <p className="text-xs text-muted-foreground">
            {new Date(Number(contribution.datePaid / BigInt(1_000_000))).toLocaleDateString()}
          </p>
        )}
      </div>
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="gap-2 ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function ExpenseItem({ 
  expense, 
  currency, 
  onViewReceipt,
  canDelete,
  onDelete
}: { 
  expense: Expense; 
  currency: string; 
  onViewReceipt: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { data: addedByProfile } = useGetUserProfile(expense.addedBy);
  const addedByName = addedByProfile?.name || expense.addedBy.toString().slice(0, 10) + '...';

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium">{currency} {centsToUnits(expense.amount).toFixed(2)}</p>
          <Badge variant="outline">{expense.category}</Badge>
          {expense.receiptImage && (
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              Receipt
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{expense.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {new Date(Number(expense.dateSpent / BigInt(1_000_000))).toLocaleDateString()}
          </p>
          <span className="text-xs text-muted-foreground">•</span>
          <p className="text-xs text-muted-foreground">Added by {addedByName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        {expense.receiptImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewReceipt}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            View
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function RevenueItem({ revenue, currency }: { revenue: Revenue; currency: string }) {
  const { data: addedByProfile } = useGetUserProfile(revenue.addedBy);
  const addedByName = addedByProfile?.name || revenue.addedBy.toString().slice(0, 10) + '...';

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-green-600">{currency} {centsToUnits(revenue.amount).toFixed(2)}</p>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {revenue.source}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{revenue.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {new Date(Number(revenue.date / BigInt(1_000_000))).toLocaleDateString()}
          </p>
          <span className="text-xs text-muted-foreground">•</span>
          <p className="text-xs text-muted-foreground">Added by {addedByName}</p>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetail({ groupId, onBack, onNavigateToGroupDashboard }: GroupDetailProps) {
  const { identity } = useInternetIdentity();
  const { data: group, isLoading: groupLoading } = useGetVentureGroup(groupId);
  const { data: contributions } = useGetContributionsWithProfilesByGroup(groupId);
  const { data: expenses } = useGetExpensesByGroup(groupId);
  const { data: revenues } = useGetRevenuesByGroup(groupId);
  const { data: milestones } = useGetMilestonesByGroup(groupId);
  const { data: activities } = useGetActivityFeedByGroup(groupId);
  const { data: groupProgress } = useGetGroupProgress(groupId);
  const joinGroup = useJoinVentureGroup();
  const deleteContribution = useDeleteContribution();
  const deleteExpense = useDeleteExpense();

  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ receiptImage: ExternalBlob; expenseDescription: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'contribution' | 'expense';
    id: string;
    groupId: string;
  } | null>(null);

  const userPrincipal = identity?.getPrincipal().toString();
  const isAdmin = group?.admin.toString() === userPrincipal;
  const isMember =
    isAdmin || group?.members.some((m) => m.principal.toString() === userPrincipal);

  const currency = group?.currency || 'EUR';
  
  // Calculate totals in cents first, then convert for display
  const totalContributionsCents = contributions?.map(c => Number(c.amount)) || [];
  const totalContributions = sumCentsNumeric(totalContributionsCents) / 100;
  
  const paidContributionsCents = contributions?.filter(c => c.status === 'paid').map(c => Number(c.amount)) || [];
  const paidContributions = sumCentsNumeric(paidContributionsCents) / 100;
  
  const totalExpensesCents = expenses?.map(e => Number(e.amount)) || [];
  const totalExpenses = sumCentsNumeric(totalExpensesCents) / 100;
  
  const totalRevenueCents = revenues?.map(r => Number(r.amount)) || [];
  const totalRevenue = sumCentsNumeric(totalRevenueCents) / 100;
  
  const completedMilestones = milestones?.filter((m) => m.status === 'completed').length || 0;

  const handleJoinGroup = async () => {
    joinGroup.mutate(groupId, {
      onSuccess: (data) => {
        // Navigate to group dashboard after successfully joining
        if (onNavigateToGroupDashboard) {
          onNavigateToGroupDashboard(groupId);
        }
      },
    });
  };

  const handleViewReceipt = (expense: Expense) => {
    if (expense.receiptImage) {
      setSelectedReceipt({
        receiptImage: expense.receiptImage,
        expenseDescription: expense.description,
      });
    }
  };

  const handleDeleteContribution = (contributionId: string) => {
    setDeleteConfirmation({ type: 'contribution', id: contributionId, groupId });
  };

  const handleDeleteExpense = (expenseId: string) => {
    setDeleteConfirmation({ type: 'expense', id: expenseId, groupId });
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'contribution') {
      deleteContribution.mutate({
        contributionId: deleteConfirmation.id,
        groupId: deleteConfirmation.groupId,
      });
    } else {
      deleteExpense.mutate({
        expenseId: deleteConfirmation.id,
        groupId: deleteConfirmation.groupId,
      });
    }
    setDeleteConfirmation(null);
  };

  if (groupLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Group not found</h3>
            <Button onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Net profit calculation
  const netProfit = totalRevenue - totalExpenses;
  const netProfitFormatted = netProfit.toFixed(2);
  const netProfitColor = netProfit >= 0 ? 'text-green-600' : 'text-red-600';
  
  // Convert groupProgress values
  const progressData = groupProgress ? {
    totalContributions: centsToUnits(groupProgress.totalContributions),
    totalSpent: centsToUnits(groupProgress.totalSpent),
    totalRevenue: centsToUnits(groupProgress.totalRevenue),
    netProfit: centsToUnits(groupProgress.netProfit),
    targetAmount: centsToUnits(groupProgress.targetAmount),
    perMemberContribution: centsToUnits(groupProgress.perMemberContribution),
    progressPercentage: Number(groupProgress.progressPercentage),
  } : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{group.name}</h1>
              {isAdmin && <Badge variant="default">Admin</Badge>}
            </div>
            <p className="text-muted-foreground mb-4">{group.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{group.category}</Badge>
              <Badge variant="secondary">{group.contributionCycle}</Badge>
            </div>
          </div>
          {!isMember && (
            <Button onClick={handleJoinGroup} disabled={joinGroup.isPending} className="gap-2">
              <Users className="h-4 w-4" />
              {joinGroup.isPending ? 'Joining...' : 'Join Group'}
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary Card */}
      {isMember && progressData && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Financial Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Raised</p>
                <p className="text-2xl font-bold text-green-600">{currency} {progressData.totalContributions.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{currency} {progressData.totalSpent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{currency} {progressData.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${progressData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {progressData.netProfit >= 0 ? '+' : ''}{currency} {progressData.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
            {progressData.totalContributions > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Funds Spent</span>
                  <span className="font-semibold">
                    {progressData.totalContributions > 0 
                      ? Math.round((progressData.totalSpent / progressData.totalContributions) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={progressData.totalContributions > 0 
                    ? (progressData.totalSpent / progressData.totalContributions) * 100
                    : 0} 
                  className="h-3" 
                />
              </div>
            )}
            {progressData.targetAmount > 0 && (
              <div className="pt-4 border-t">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Target Goal</p>
                    <p className="text-xl font-bold">{currency} {progressData.targetAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Per Member</p>
                    <p className="text-xl font-bold text-muted-foreground">{currency} {progressData.perMemberContribution.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Progress</span>
                    <span className="font-semibold">{progressData.progressPercentage}%</span>
                  </div>
                  <Progress value={progressData.progressPercentage} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{group.members.length + 1}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{currency} {totalContributions.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{currency} {totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{currency} {totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedMilestones}/{milestones?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      {isMember && (
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="relative w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="inline-block min-w-full">
              <TabsList className="inline-flex w-auto min-w-full md:w-auto bg-muted p-1 rounded-lg shadow-sm">
                <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
                <TabsTrigger value="members" className="whitespace-nowrap">Members</TabsTrigger>
                <TabsTrigger value="contributions" className="whitespace-nowrap">Contributions</TabsTrigger>
                <TabsTrigger value="expenses" className="whitespace-nowrap">Expenses</TabsTrigger>
                <TabsTrigger value="revenue" className="whitespace-nowrap">Revenue & Profit</TabsTrigger>
                <TabsTrigger value="payouts" className="whitespace-nowrap">Dividends & Payouts</TabsTrigger>
                <TabsTrigger value="milestones" className="whitespace-nowrap">Milestones</TabsTrigger>
                <TabsTrigger value="activity" className="whitespace-nowrap">Activity</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Group Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{group.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contribution Cycle:</span>
                    <span className="font-medium">{group.contributionCycle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Contribution:</span>
                    <span className="font-medium">{currency} {centsToUnits(group.monthlyContributionAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Amount:</span>
                    <span className="font-medium">{currency} {centsToUnits(group.targetAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {new Date(Number(group.startDate / BigInt(1_000_000))).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {new Date(Number(group.endDate / BigInt(1_000_000))).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Contributions:</span>
                    <span className="font-medium text-green-600">{currency} {totalContributions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Contributions:</span>
                    <span className="font-medium text-green-600">{currency} {paidContributions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Expenses:</span>
                    <span className="font-medium text-orange-600">{currency} {totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium text-emerald-600">{currency} {totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-muted-foreground font-semibold">Net Profit:</span>
                    <span className={`font-bold ${netProfitColor}`}>
                      {netProfit >= 0 ? '+' : ''}{currency} {netProfitFormatted}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Group Members ({group.members.length + 1})</CardTitle>
                <CardDescription>All members participating in this venture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Admin */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Admin</p>
                        <p className="text-sm text-muted-foreground">Group Administrator</p>
                      </div>
                    </div>
                    <Badge>Admin</Badge>
                  </div>

                  {/* Members */}
                  {group.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>M</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Member {index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(Number(member.joinedDate / BigInt(1_000_000))).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Member</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contributions</CardTitle>
                    <CardDescription>Track all member contributions</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddContribution(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Contribution
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!contributions || contributions.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No contributions yet</h3>
                    <p className="text-muted-foreground mb-4">Start tracking member contributions</p>
                    <Button onClick={() => setShowAddContribution(true)}>Add First Contribution</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributions.map((contribution) => (
                      <ContributionItem
                        key={contribution.id}
                        contribution={contribution}
                        currency={currency}
                        canDelete={contribution.member.toString() === userPrincipal}
                        onDelete={() => handleDeleteContribution(contribution.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expenses</CardTitle>
                    <CardDescription>Track all group expenses</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddExpense(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!expenses || expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground mb-4">Start tracking group expenses</p>
                    <Button onClick={() => setShowAddExpense(true)}>Add First Expense</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <ExpenseItem
                        key={expense.id}
                        expense={expense}
                        currency={currency}
                        onViewReceipt={() => handleViewReceipt(expense)}
                        canDelete={expense.addedBy.toString() === userPrincipal || isAdmin}
                        onDelete={() => handleDeleteExpense(expense.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Revenue</CardTitle>
                      <CardDescription>Track income generated by the venture</CardDescription>
                    </div>
                    {isAdmin && (
                      <Button onClick={() => setShowAddRevenue(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Revenue
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!revenues || revenues.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No revenue yet</h3>
                      <p className="text-muted-foreground mb-4">Start tracking venture income</p>
                      {isAdmin && (
                        <Button onClick={() => setShowAddRevenue(true)}>Add First Revenue</Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {revenues.map((revenue) => (
                        <RevenueItem key={revenue.id} revenue={revenue} currency={currency} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle>Profit & Loss Summary</CardTitle>
                  <CardDescription>Overall financial performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span className="text-2xl font-bold text-emerald-600">{currency} {totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Expenses:</span>
                      <span className="text-2xl font-bold text-orange-600">{currency} {totalExpenses.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Net Profit/Loss:</span>
                        <span className={`text-3xl font-bold ${netProfitColor}`}>
                          {netProfit >= 0 ? '+' : ''}{currency} {netProfitFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutCalculator groupId={groupId} currency={currency} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Milestones</CardTitle>
                    <CardDescription>Track project progress and achievements</CardDescription>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => setShowAddMilestone(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Milestone
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!milestones || milestones.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
                    <p className="text-muted-foreground mb-4">Create milestones to track progress</p>
                    {isAdmin && (
                      <Button onClick={() => setShowAddMilestone(true)}>Add First Milestone</Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{milestone.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                          </div>
                          <Badge variant={milestone.status === 'completed' ? 'default' : 'secondary'}>
                            {milestone.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Target: {new Date(Number(milestone.targetDate / BigInt(1_000_000))).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
                <CardDescription>Recent group activities and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {!activities || activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                    <p className="text-muted-foreground">Group activities will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="p-3 border rounded-lg">
                        <p className="text-sm">{activity.details}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(Number(activity.timestamp / BigInt(1_000_000))).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <AddContributionDialog
        open={showAddContribution}
        onOpenChange={setShowAddContribution}
        groupId={groupId}
      />
      <AddMilestoneDialog
        open={showAddMilestone}
        onOpenChange={setShowAddMilestone}
        groupId={groupId}
      />
      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        groupId={groupId}
      />
      <AddRevenueDialog
        open={showAddRevenue}
        onOpenChange={setShowAddRevenue}
        groupId={groupId}
      />
      {selectedReceipt && (
        <ReceiptModal
          open={!!selectedReceipt}
          onOpenChange={() => setSelectedReceipt(null)}
          receiptImage={selectedReceipt.receiptImage}
          expenseDescription={selectedReceipt.expenseDescription}
        />
      )}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirmation?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
