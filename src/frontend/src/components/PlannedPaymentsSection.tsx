import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetPlannedPaymentsByGroup, useGetVentureGroup } from '../hooks/useQueries';
import { Calendar, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PlannedPaymentStatus } from '../backend';
import type { PlannedPayment } from '../backend';
import { useState } from 'react';
import AddPlannedPaymentDialog from './AddPlannedPaymentDialog';
import { centsToUnits } from '../lib/money';

interface PlannedPaymentsSectionProps {
  groupId: string;
  isAdmin: boolean;
}

export default function PlannedPaymentsSection({ groupId, isAdmin }: PlannedPaymentsSectionProps) {
  const { data: plannedPayments, isLoading } = useGetPlannedPaymentsByGroup(groupId);
  const { data: group } = useGetVentureGroup(groupId);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const currency = group?.currency || 'EUR';

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  const upcomingPayments = plannedPayments?.filter(p => p.status === PlannedPaymentStatus.upcoming) || [];
  const paidPayments = plannedPayments?.filter(p => p.status === PlannedPaymentStatus.paid) || [];
  const missedPayments = plannedPayments?.filter(p => p.status === PlannedPaymentStatus.missed) || [];

  const getStatusBadge = (status: PlannedPaymentStatus) => {
    switch (status) {
      case PlannedPaymentStatus.upcoming:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">Upcoming</Badge>;
      case PlannedPaymentStatus.paid:
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
      case PlannedPaymentStatus.missed:
        return <Badge variant="destructive">Missed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderPaymentItem = (payment: PlannedPayment) => {
    const dueDate = new Date(Number(payment.dueDate) / 1_000_000);
    const isUpcoming = payment.status === PlannedPaymentStatus.upcoming;
    const isPaid = payment.status === PlannedPaymentStatus.paid;
    const isMissed = payment.status === PlannedPaymentStatus.missed;

    return (
      <div
        key={payment.id}
        className={`p-4 border rounded-lg ${
          isUpcoming ? 'bg-yellow-50 border-yellow-200' : 
          isPaid ? 'bg-green-50 border-green-200' : 
          isMissed ? 'bg-red-50 border-red-200' : 
          'bg-white'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{payment.description}</h4>
              {getStatusBadge(payment.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Due: {format(dueDate, 'dd MMM yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{currency} {centsToUnits(payment.amount).toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

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
              <CardDescription>
                Track upcoming and due payment obligations
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!plannedPayments || plannedPayments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No planned payments yet</p>
              {isAdmin && (
                <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
                  Create First Payment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Missed Payments */}
              {missedPayments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <h3 className="font-semibold text-red-600">Missed Payments ({missedPayments.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {missedPayments.map(renderPaymentItem)}
                  </div>
                </div>
              )}

              {/* Upcoming Payments */}
              {upcomingPayments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-yellow-700">Upcoming Payments ({upcomingPayments.length})</h3>
                  <div className="space-y-3">
                    {upcomingPayments.map(renderPaymentItem)}
                  </div>
                </div>
              )}

              {/* Paid Payments */}
              {paidPayments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-green-700">Paid Payments ({paidPayments.length})</h3>
                  <div className="space-y-3">
                    {paidPayments.map(renderPaymentItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <AddPlannedPaymentDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          groupId={groupId}
        />
      )}
    </>
  );
}
