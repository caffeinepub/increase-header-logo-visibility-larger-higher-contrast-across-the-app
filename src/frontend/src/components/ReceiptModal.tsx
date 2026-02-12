import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import type { ExternalBlob } from '../backend';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptImage: ExternalBlob;
  expenseDescription: string;
}

export default function ReceiptModal({ open, onOpenChange, receiptImage, expenseDescription }: ReceiptModalProps) {
  const imageUrl = receiptImage.getDirectURL();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `receipt-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Receipt: {expenseDescription}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={`Receipt for ${expenseDescription}`}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
