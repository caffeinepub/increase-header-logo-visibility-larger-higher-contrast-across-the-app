import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePlannedPayment, useGetVentureGroup } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { PlannedPaymentStatus } from '../backend';
import type { PlannedPayment } from '../backend';
import { Calendar } from 'lucide-react';
import { parseMoneyInputToCents } from '../lib/money';

interface AddPlannedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export default function AddPlannedPaymentDialog({ open, onOpenChange, groupId }: AddPlannedPaymentDialogProps) {
  const { identity } = useInternetIdentity();
  const { data: group } = useGetVentureGroup(groupId);
  const createPlannedPayment = useCreatePlannedPayment();

  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identity || !group) return;

    try {
      const amountInCents = parseMoneyInputToCents(amount);
      const dueDateValue = new Date(dueDate).getTime() * 1_000_000;

      const payment: PlannedPayment = {
        id: `${groupId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        member: selectedMember === 'all' ? identity.getPrincipal() : group.members.find(m => m.principal.toString() === selectedMember)?.principal || identity.getPrincipal(),
        amount: amountInCents,
        dueDate: BigInt(dueDateValue),
        description,
        status: PlannedPaymentStatus.upcoming,
      };

      createPlannedPayment.mutate(payment, {
        onSuccess: () => {
          setAmount('');
          setDueDate('');
          setDescription('');
          setSelectedMember('');
          setError('');
          onOpenChange(false);
        },
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const allMembers = group ? [
    { principal: group.admin, label: 'Admin' },
    ...group.members.map(m => ({ principal: m.principal, label: 'Member' }))
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Planned Payment
          </DialogTitle>
          <DialogDescription>
            Create a scheduled payment obligation for a group member
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member">Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember} required>
                <SelectTrigger id="member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map((member, index) => (
                    <SelectItem key={index} value={member.principal.toString()}>
                      {member.label} - {member.principal.toString().slice(0, 10)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({group?.currency || 'EUR'})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter amount with cents (e.g., 50.00 for {group?.currency || 'EUR'} 50.00)
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Monthly contribution, special assessment, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPlannedPayment.isPending}>
              {createPlannedPayment.isPending ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
