import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVentureGroup, useGetCropTemplates } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { ContributionCycle } from '../backend';
import { Sprout } from 'lucide-react';
import { parseMoneyInputToCents } from '../lib/money';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { identity } = useInternetIdentity();
  const createGroup = useCreateVentureGroup();
  const { data: cropTemplates = [], isLoading: templatesLoading } = useGetCropTemplates();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [cropType, setCropType] = useState('');
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'weekly' | 'quarterly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string>('');

  // Auto-populate category when crop type changes
  useEffect(() => {
    if (cropType && cropTemplates.length > 0) {
      const selectedTemplate = cropTemplates.find(t => t.name === cropType);
      if (selectedTemplate) {
        setCategory(selectedTemplate.category);
      }
    }
  }, [cropType, cropTemplates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identity) return;

    try {
      const monthlyContributionInCents = parseMoneyInputToCents(amount);
      const targetAmountInCents = parseMoneyInputToCents(targetAmount);

      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      createGroup.mutate(
        {
          group: {
            id: groupId,
            name: name.trim(),
            description: description.trim(),
            category: category.trim(),
            monthlyContributionAmount: monthlyContributionInCents,
            contributionCycle: ContributionCycle[cycle],
            startDate: BigInt(new Date(startDate).getTime()) * BigInt(1_000_000),
            endDate: BigInt(new Date(endDate).getTime()) * BigInt(1_000_000),
            admin: identity.getPrincipal(),
            members: [],
            currency: 'EUR',
            targetAmount: targetAmountInCents,
          },
          cropType: cropType || 'General',
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setName('');
            setDescription('');
            setCategory('');
            setCropType('');
            setAmount('');
            setTargetAmount('');
            setCycle('monthly');
            setStartDate('');
            setEndDate('');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            Create New Venture Group
          </DialogTitle>
          <DialogDescription>Set up a new agriculture venture group with optional crop lifecycle templates</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rice Farming Venture 2025"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the venture goals and objectives"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cropType">Crop Type *</Label>
            <Select value={cropType} onValueChange={setCropType} disabled={templatesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select a crop type"} />
              </SelectTrigger>
              <SelectContent>
                {cropTemplates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {cropType === 'Maize (Corn)' && 'Will auto-generate milestones: Planting, Fertilizer Application, and Harvest'}
              {cropType && cropType !== 'Maize (Corn)' && 'You can add custom milestones after creating the group'}
              {!cropType && 'Select a crop type to automatically set the category'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Auto-filled from crop type"
                required
                disabled={!!cropType}
                className={cropType ? 'bg-muted' : ''}
              />
              {cropType && (
                <p className="text-xs text-muted-foreground">
                  Auto-populated from selected crop type
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Contribution Amount (EUR) *</Label>
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Fundraising Goal (EUR) *</Label>
            <Input
              id="targetAmount"
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Total amount the group aims to raise
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle">Contribution Cycle *</Label>
            <Select value={cycle} onValueChange={(value: any) => setCycle(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createGroup.isPending || !cropType} className="flex-1">
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
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
