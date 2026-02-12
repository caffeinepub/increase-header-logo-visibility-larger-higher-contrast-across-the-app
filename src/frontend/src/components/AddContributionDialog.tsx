import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAddContribution } from '../hooks/useQueries';
import { ContributionStatus } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { parseMoneyInputToCents } from '../lib/money';

interface AddContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export default function AddContributionDialog({ open, onOpenChange, groupId }: AddContributionDialogProps) {
  const addContribution = useAddContribution();
  const { identity } = useInternetIdentity();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identity) {
      return;
    }

    // Parse and validate amount
    try {
      const amountInCents = parseMoneyInputToCents(amount);

      const contributionId = `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const memberPrincipal = identity.getPrincipal();

      addContribution.mutate(
        {
          id: contributionId,
          groupId,
          member: memberPrincipal,
          amount: amountInCents,
          status: ContributionStatus.paid,
          datePaid: BigInt(new Date(date).getTime()) * BigInt(1_000_000),
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setNote('');
            setError('');
          },
        }
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Your Contribution</DialogTitle>
          <DialogDescription>Record your contribution to the group</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (EUR) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              required
            />
            <p className="text-xs text-muted-foreground">Enter amount with cents (e.g., 100.00 for EUR 100.00)</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional notes about this contribution..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={addContribution.isPending} className="flex-1">
              {addContribution.isPending ? 'Adding...' : 'Add Contribution'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
