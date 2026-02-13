import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllVentureGroups, useGetContributionsWithProfilesByGroup, useDeleteContribution } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { centsToUnits } from '../lib/money';
import { sumCentsNumeric } from '../lib/moneyMath';

export default function Contributions() {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading: groupsLoading } = useGetAllVentureGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { data: contributions, isLoading: contributionsLoading } = useGetContributionsWithProfilesByGroup(selectedGroupId);
  const deleteContribution = useDeleteContribution();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    contributionId: string;
    groupId: string;
  } | null>(null);

  const userPrincipal = identity?.getPrincipal().toString();

  const myGroups = groups?.filter(
    (group) =>
      group.admin.toString() === userPrincipal ||
      group.members.some((m) => m.principal.toString() === userPrincipal)
  ) || [];

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  const myContributions = contributions?.filter(
    (c) => c.member.toString() === userPrincipal
  ) || [];

  // Calculate totals in cents first, then convert
  const paidCents = myContributions.filter(c => c.status === 'paid').map(c => Number(c.amount));
  const totalPaid = sumCentsNumeric(paidCents) / 100;

  const pendingCents = myContributions.filter(c => c.status === 'pending').map(c => Number(c.amount));
  const totalPending = sumCentsNumeric(pendingCents) / 100;

  const overdueCents = myContributions.filter(c => c.status === 'overdue').map(c => Number(c.amount));
  const totalOverdue = sumCentsNumeric(overdueCents) / 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDeleteContribution = (contributionId: string) => {
    if (selectedGroupId) {
      setDeleteConfirmation({ contributionId, groupId: selectedGroupId });
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;
    deleteContribution.mutate({
      contributionId: deleteConfirmation.contributionId,
      groupId: deleteConfirmation.groupId,
    });
    setDeleteConfirmation(null);
  };

  if (groupsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Contributions</h1>
        <p className="text-muted-foreground">Track your financial contributions across all groups</p>
      </div>

      {/* Group Selector */}
      <div className="mb-6">
        <Select value={selectedGroupId || ''} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a group to view contributions" />
          </SelectTrigger>
          <SelectContent>
            {myGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{selectedGroup?.currency || 'EUR'} {totalPaid.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully contributed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <DollarSign className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{selectedGroup?.currency || 'EUR'} {totalPending.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
                <AlertCircle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{selectedGroup?.currency || 'EUR'} {totalOverdue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Contributions List */}
          <Card>
            <CardHeader>
              <CardTitle>Contribution History</CardTitle>
              <CardDescription>
                Your contributions to {selectedGroup?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contributionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : myContributions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No contributions yet</h3>
                  <p className="text-muted-foreground">Your contribution history will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Contributor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myContributions.map((contribution) => (
                      <TableRow key={contribution.id}>
                        <TableCell className="font-medium">
                          {selectedGroup?.currency || 'EUR'} {centsToUnits(contribution.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{contribution.contributorName}</TableCell>
                        <TableCell>{getStatusBadge(contribution.status)}</TableCell>
                        <TableCell>
                          {contribution.datePaid
                            ? new Date(Number(contribution.datePaid / BigInt(1_000_000))).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContribution(contribution.id)}
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this contribution.
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
