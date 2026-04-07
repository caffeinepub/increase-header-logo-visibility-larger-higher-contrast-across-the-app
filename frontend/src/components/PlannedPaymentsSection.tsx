import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetPlannedPaymentsByGroup, useGetVentureGroup, useIsCallerAdmin } from '../hooks/useQueries';
import { Calendar, Plus, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AddPlannedPaymentDialog from './AddPlannedPaymentDialog';
import { centsToDisplayUnits } from '../lib/moneyModel';

interface PlannedPaymentsSectionProps {
  groupId: string;
}

export default function PlannedPaymentsSection({ groupId }: PlannedPaymentsSectionProps) {
  const { data: payments, isLoading } = useGetPlannedPaymentsByGroup(groupId);
  const { data: group } = useGetVentureGroup(groupId);
  const { data: isAdmin } = useIsCallerAdmin();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingPayments = payments?.filter(p => p.status === 'upcoming') || [];
  const paidPayments = payments?.filter(p => p.status === 'paid') || [];
  const missedPayments = payments?.filter(p => p.status === 'missed') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planned Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planned Payments
              </CardTitle>
              <CardDescription>Scheduled payment obligations for group members</CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No planned payments yet</p>
              {isAdmin && (
                <Button onClick={() => setAddDialogOpen(true)} variant="outline" size="sm" className="mt-4">
                  Create First Payment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {missedPayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-2">Missed Payments</h3>
                  <div className="space-y-3">
                    {missedPayments.map((payment) => (
                      <div key={payment.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{payment.description}</p>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold">{group?.currency || 'EUR'} {centsToDisplayUnits(Number(payment.amount)).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(Number(payment.dueDate / BigInt(1_000_000))).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcomingPayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Upcoming Payments</h3>
                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => (
                      <div key={payment.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{payment.description}</p>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold">{group?.currency || 'EUR'} {centsToDisplayUnits(Number(payment.amount)).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(Number(payment.dueDate / BigInt(1_000_000))).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paidPayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Paid Payments</h3>
                  <div className="space-y-3">
                    {paidPayments.map((payment) => (
                      <div key={payment.id} className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{payment.description}</p>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold">{group?.currency || 'EUR'} {centsToDisplayUnits(Number(payment.amount)).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(Number(payment.dueDate / BigInt(1_000_000))).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <AddPlannedPaymentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          groupId={groupId}
        />
      )}
    </>
  );
}
