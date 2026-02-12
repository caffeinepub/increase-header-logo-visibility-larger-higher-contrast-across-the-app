import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMyPlannedPayments, useGetVentureGroup } from '../hooks/useQueries';
import { Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PlannedPaymentStatus } from '../backend';
import type { PlannedPayment } from '../backend';
import { centsToUnits } from '../lib/money';

export default function MyPlannedPayments() {
  const { data: plannedPayments, isLoading } = useGetMyPlannedPayments();

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!plannedPayments || plannedPayments.length === 0) {
    return null;
  }

  const upcomingPayments = plannedPayments.filter(p => p.status === PlannedPaymentStatus.upcoming);
  const missedPayments = plannedPayments.filter(p => p.status === PlannedPaymentStatus.missed);

  const getStatusBadge = (status: PlannedPaymentStatus) => {
    switch (status) {
      case PlannedPaymentStatus.upcoming:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">Due Soon</Badge>;
      case PlannedPaymentStatus.paid:
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
      case PlannedPaymentStatus.missed:
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-yellow-700" />
          <CardTitle className="text-yellow-900">My Upcoming Payments</CardTitle>
        </div>
        <CardDescription className="text-yellow-800">
          Your scheduled payment obligations across all groups
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {missedPayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h3 className="font-semibold text-red-600">Overdue ({missedPayments.length})</h3>
              </div>
              {missedPayments.map((payment) => (
                <PaymentItem key={payment.id} payment={payment} />
              ))}
            </div>
          )}

          {upcomingPayments.length > 0 && (
            <div className="space-y-3">
              {missedPayments.length > 0 && <div className="border-t pt-4" />}
              <h3 className="font-semibold text-yellow-800">Upcoming ({upcomingPayments.length})</h3>
              {upcomingPayments.map((payment) => (
                <PaymentItem key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentItem({ payment }: { payment: PlannedPayment }) {
  const { data: group } = useGetVentureGroup(payment.groupId);
  const currency = group?.currency || 'EUR';
  const dueDate = new Date(Number(payment.dueDate) / 1_000_000);
  const isMissed = payment.status === PlannedPaymentStatus.missed;

  return (
    <div className={`p-3 border rounded-lg ${isMissed ? 'bg-red-50 border-red-200' : 'bg-white border-yellow-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{payment.description}</h4>
            {payment.status === PlannedPaymentStatus.upcoming && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">Due Soon</Badge>
            )}
            {payment.status === PlannedPaymentStatus.missed && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">{group?.name || 'Loading...'}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Due: {format(dueDate, 'dd MMM yyyy')}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{currency} {centsToUnits(payment.amount).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
