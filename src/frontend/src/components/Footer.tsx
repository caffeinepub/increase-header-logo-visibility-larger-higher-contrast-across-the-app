import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground">
          © 2025. Built with <Heart className="inline h-4 w-4 text-red-500 fill-red-500" /> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
