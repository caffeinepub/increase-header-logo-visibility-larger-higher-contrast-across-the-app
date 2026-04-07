import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGetMyPlannedPayments, useGetAllVentureGroups } from '../hooks/useQueries';
import { Calendar, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { centsToDisplayUnits } from '../lib/moneyModel';

export default function MyPlannedPayments() {
  const { data: payments, isLoading: paymentsLoading } = useGetMyPlannedPayments();
  const { data: groups } = useGetAllVentureGroups();

  const getGroupName = (groupId: string) => {
    const group = groups?.find(g => g.id === groupId);
    return group?.name || 'Unknown Group';
  };

  const getGroupCurrency = (groupId: string) => {
    const group = groups?.find(g => g.id === groupId);
    return group?.currency || 'EUR';
  };

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
  const missedPayments = payments?.filter(p => p.status === 'missed') || [];

  if (paymentsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Planned Payments
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

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Planned Payments
          </CardTitle>
          <CardDescription>Your upcoming payment obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No planned payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          My Planned Payments
        </CardTitle>
        <CardDescription>Your upcoming payment obligations across all groups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {missedPayments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">Missed Payments</h3>
              <div className="space-y-3">
                {missedPayments.map((payment) => (
                  <div key={payment.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{getGroupName(payment.groupId)}</h4>
                        <p className="text-sm text-muted-foreground">{payment.description}</p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{getGroupCurrency(payment.groupId)} {centsToDisplayUnits(Number(payment.amount)).toFixed(2)}</span>
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
                        <h4 className="font-semibold">{getGroupName(payment.groupId)}</h4>
                        <p className="text-sm text-muted-foreground">{payment.description}</p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{getGroupCurrency(payment.groupId)} {centsToDisplayUnits(Number(payment.amount)).toFixed(2)}</span>
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
      </CardContent>
    </Card>
  );
}
