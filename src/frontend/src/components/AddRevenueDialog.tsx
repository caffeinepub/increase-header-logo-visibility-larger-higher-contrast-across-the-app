import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAddRevenue } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { parseMoneyInputToCents } from '../lib/money';

interface AddRevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export default function AddRevenueDialog({ open, onOpenChange, groupId }: AddRevenueDialogProps) {
  const addRevenue = useAddRevenue();
  const { identity } = useInternetIdentity();

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identity) {
      return;
    }

    // Parse and validate amount
    try {
      const amountInCents = parseMoneyInputToCents(amount);

      const revenueId = `revenue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const addedByPrincipal = identity.getPrincipal();

      addRevenue.mutate(
        {
          groupId,
          revenue: {
            id: revenueId,
            groupId,
            source,
            amount: amountInCents,
            date: BigInt(new Date(date).getTime()) * BigInt(1_000_000),
            description,
            addedBy: addedByPrincipal,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setSource('');
            setAmount('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Revenue</DialogTitle>
          <DialogDescription>Record income from agricultural activities</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source *</Label>
            <Input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., Harvest Sale, Product Sale"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (EUR) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500.00"
              required
            />
            <p className="text-xs text-muted-foreground">Enter amount with cents (e.g., 500.00 for EUR 500.00)</p>
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the revenue source..."
              rows={3}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={addRevenue.isPending} 
              className="flex-1"
            >
              {addRevenue.isPending ? 'Adding...' : 'Add Revenue'}
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
