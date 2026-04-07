import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAddMilestone } from '../hooks/useQueries';
import { MilestoneStatus, ExternalBlob } from '../backend';

interface AddMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export default function AddMilestoneDialog({ open, onOpenChange, groupId }: AddMilestoneDialogProps) {
  const addMilestone = useAddMilestone();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const milestoneId = `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let imageBlob: ExternalBlob | undefined;
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      imageBlob = ExternalBlob.fromBytes(new Uint8Array(arrayBuffer));
    }

    addMilestone.mutate(
      {
        id: milestoneId,
        groupId,
        name: name.trim(),
        description: description.trim(),
        targetDate: BigInt(new Date(targetDate).getTime()) * BigInt(1_000_000),
        status: MilestoneStatus.pending,
        image: imageBlob,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setDescription('');
          setTargetDate('');
          setImageFile(null);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Milestone</DialogTitle>
          <DialogDescription>Add a new milestone for the group</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Milestone Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Land Preparation Complete"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the milestone"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date *</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image (Optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={addMilestone.isPending} className="flex-1">
              {addMilestone.isPending ? 'Creating...' : 'Create Milestone'}
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
