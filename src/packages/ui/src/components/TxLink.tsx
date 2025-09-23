import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';

interface TxLinkProps {
  signature: string;
  explorerBase?: string;
  className?: string;
  children?: React.ReactNode;
}

export function TxLink({ 
  signature, 
  explorerBase = 'https://explorer.solana.com', 
  className,
  children 
}: TxLinkProps) {
  const href = `${explorerBase}/tx/${signature}`;
  
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline',
        className
      )}
    >
      {children || signature.slice(0, 8) + '...'}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
