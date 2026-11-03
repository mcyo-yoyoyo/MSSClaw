import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import './backButton.css';
type BackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & { label: string };
/** Shared page-back control. Each caller retains its own destination. */
export function BackButton({ label, className, type = 'button', ...props }: BackButtonProps) {
  return <button {...props} type={type} className={cn('platform-back-button',className)} aria-label={label} title={label}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>;
}
