import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalculatePayouts, useGetPayoutsByGroup, useRecordPayout } from '../hooks/useQueries';
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { centsToUnits } from '../lib/money';
import { sumCentsNumeric } from '../lib/moneyMath';
import type { Principal } from '@icp-sdk/core/principal';

interface PayoutCalculatorProps {
  groupId: string;
  currency: string;
  isAdmin: boolean;
}

export default function PayoutCalculator({ groupId, currency, isAdmin }: PayoutCalculatorProps) {
  const { data: payoutSuggestions, isLoading: suggestionsLoading } = useCalculatePayouts(groupId);
  const { data: payoutHistory } = useGetPayoutsByGroup(groupId);
  const recordPayout = useRecordPayout();
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  const handleMarkAsPaid = async (memberPrincipal: Principal, amount: bigint) => {
    setProcessingMember(memberPrincipal.toString());
    recordPayout.mutate(
      { groupId, member: memberPrincipal, amount },
      {
        onSuccess: () => {
          toast.success('Payout recorded successfully');
          setProcessingMember(null);
        },
        onError: (error) => {
          toast.error(`Failed to record payout: ${error.message}`);
          setProcessingMember(null);
        },
      }
    );
  };

  if (suggestionsLoading) {
    return <Skeleton className="h-96" />;
  }

  // Calculate total payout amounts in cents, then convert
  const totalPayoutCents = payoutSuggestions?.map(p => Number(p.payoutAmount)) || [];
  const totalPayoutAmount = sumCentsNumeric(totalPayoutCents) / 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Payout Calculator</CardTitle>
          </div>
          <CardDescription>
            Calculate member payouts based on ownership percentages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!payoutSuggestions || payoutSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No payout data available</h3>
              <p className="text-muted-foreground">
                Payouts will be calculated once contributions and revenue are recorded
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Payout Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    {currency} {totalPayoutAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Member Payouts */}
              <div className="space-y-3">
                {payoutSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.memberPrincipal.toString()}
                    className={`p-4 border rounded-lg ${
                      suggestion.isPaid ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{suggestion.memberName}</h4>
                          {suggestion.isPaid && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ownership: {Number(suggestion.ownershipPercentage)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {currency} {centsToUnits(suggestion.payoutAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {isAdmin && !suggestion.isPaid && (
                      <Button
                        onClick={() =>
                          handleMarkAsPaid(suggestion.memberPrincipal, suggestion.payoutAmount)
                        }
                        disabled={processingMember === suggestion.memberPrincipal.toString()}
                        className="w-full gap-2"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {processingMember === suggestion.memberPrincipal.toString()
                          ? 'Processing...'
                          : 'Mark as Paid'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      {payoutHistory && payoutHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Record of all completed payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payoutHistory.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Member Payout</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Number(payout.datePaid / BigInt(1_000_000))).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    {currency} {centsToUnits(payout.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
