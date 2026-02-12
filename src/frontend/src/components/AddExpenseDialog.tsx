import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddExpense } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { ExternalBlob } from '../backend';
import { Upload, X } from 'lucide-react';
import { parseMoneyInputToCents } from '../lib/money';

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const EXPENSE_CATEGORIES = [
  'equipment',
  'seeds',
  'fertilizer',
  'labor',
  'transportation',
  'utilities',
  'maintenance',
  'supplies',
  'other',
];

export default function AddExpenseDialog({ open, onOpenChange, groupId }: AddExpenseDialogProps) {
  const addExpense = useAddExpense();
  const { identity } = useInternetIdentity();

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dateSpent, setDateSpent] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG or PNG)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identity) {
      return;
    }

    // Parse and validate amount
    try {
      const amountInCents = parseMoneyInputToCents(amount);

      const expenseId = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const addedByPrincipal = identity.getPrincipal();

      let receiptBlob: ExternalBlob | undefined = undefined;

      // Convert file to ExternalBlob if present
      if (receiptFile) {
        const arrayBuffer = await receiptFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        receiptBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      addExpense.mutate(
        {
          groupId,
          expense: {
            id: expenseId,
            groupId,
            category,
            amount: amountInCents,
            description,
            dateSpent: BigInt(new Date(dateSpent).getTime()) * BigInt(1_000_000),
            addedBy: addedByPrincipal,
            receiptImage: receiptBlob,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setCategory('');
            setAmount('');
            setDescription('');
            setDateSpent(new Date().toISOString().split('T')[0]);
            setReceiptFile(null);
            setReceiptPreview(null);
            setUploadProgress(0);
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
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record a new expense for the group</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="35.50"
              required
            />
            <p className="text-xs text-muted-foreground">Enter amount with cents (e.g., 35.50 for EUR 35.50)</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the expense..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateSpent">Date Spent *</Label>
            <Input
              id="dateSpent"
              type="date"
              value={dateSpent}
              onChange={(e) => setDateSpent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt Image (Optional)</Label>
            <div className="space-y-3">
              {!receiptFile ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload receipt image (JPG or PNG)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Max file size: 5MB</p>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('receipt')?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{receiptFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(receiptFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {receiptPreview && (
                    <div className="relative">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full max-h-64 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={addExpense.isPending || (uploadProgress > 0 && uploadProgress < 100)} 
              className="flex-1"
            >
              {addExpense.isPending ? 'Adding...' : 'Add Expense'}
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
