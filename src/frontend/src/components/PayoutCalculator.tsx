import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCalculatePayouts, useRecordPayout, useGetPayoutsByGroup } from '../hooks/useQueries';
import { CheckCircle2, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PayoutSuggestion } from '../backend';
import { centsToUnits } from '../lib/money';

interface PayoutCalculatorProps {
  groupId: string;
  currency: string;
  isAdmin: boolean;
}

export default function PayoutCalculator({ groupId, currency, isAdmin }: PayoutCalculatorProps) {
  const { data: payoutSuggestions, isLoading } = useCalculatePayouts(groupId);
  const { data: payouts } = useGetPayoutsByGroup(groupId);
  const recordPayout = useRecordPayout();
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  const handleMarkAsPaid = async (suggestion: PayoutSuggestion) => {
    setProcessingMember(suggestion.memberPrincipal.toString());
    try {
      await recordPayout.mutateAsync({
        groupId,
        member: suggestion.memberPrincipal,
        amount: suggestion.payoutAmount,
      });
    } finally {
      setProcessingMember(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!payoutSuggestions || payoutSuggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <img src="/assets/generated/payout-icon-transparent.dim_64x64.png" alt="Payouts" className="h-8 w-8" />
            <CardTitle>Dividends & Payouts</CardTitle>
          </div>
          <CardDescription>Calculate and distribute dividends based on ownership</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No payout data available yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Payouts are calculated based on member contributions and group revenue
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPayoutAmount = payoutSuggestions.reduce((sum, s) => sum + centsToUnits(s.payoutAmount), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <img src="/assets/generated/payout-icon-transparent.dim_64x64.png" alt="Payouts" className="h-8 w-8" />
            <CardTitle>Payout Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Payout Pool</p>
              <p className="text-3xl font-bold text-emerald-600">
                {currency} {totalPayoutAmount.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-3xl font-bold">{payoutSuggestions.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Paid Out</p>
              <p className="text-3xl font-bold text-green-600">
                {payoutSuggestions.filter((s) => s.isPaid).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Payouts</CardTitle>
          <CardDescription>
            Dividends calculated based on ownership percentage and total revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Percent className="h-4 w-4" />
                      Ownership
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-4 w-4" />
                      Payout Amount
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {isAdmin && <TableHead className="text-center">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutSuggestions.map((suggestion) => {
                  const isPrincipalId = suggestion.memberName.length > 20 && !suggestion.memberName.includes(' ');
                  const displayName = isPrincipalId
                    ? `${suggestion.memberName.slice(0, 10)}...`
                    : suggestion.memberName;

                  return (
                    <TableRow key={suggestion.memberPrincipal.toString()}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          {isPrincipalId && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {suggestion.memberPrincipal.toString().slice(0, 15)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(suggestion.ownershipPercentage)}%
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {currency} {centsToUnits(suggestion.payoutAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {suggestion.isPaid ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          {!suggestion.isPaid && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(suggestion)}
                              disabled={
                                recordPayout.isPending &&
                                processingMember === suggestion.memberPrincipal.toString()
                              }
                            >
                              {recordPayout.isPending &&
                              processingMember === suggestion.memberPrincipal.toString()
                                ? 'Processing...'
                                : 'Mark as Paid'}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      {payouts && payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Record of all completed payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-emerald-600">
                      {currency} {centsToUnits(payout.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Member: {payout.member.toString().slice(0, 15)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(Number(payout.datePaid / BigInt(1_000_000))).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
