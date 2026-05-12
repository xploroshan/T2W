import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Optional icon — pass a lucide-react component or anything renderable. */
  icon?: ReactNode;
  /** Short, action-oriented headline (1 line). */
  title: string;
  /** Supporting body copy (1-2 sentences). */
  body?: string;
  /** Optional call-to-action button/link. */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Shared "nothing here yet" surface used across the app so empty states
 * have a consistent voice and visual treatment. Cheaper than reinventing
 * the markup per page; also keeps a11y wired (role="status" announces the
 * empty state to screen readers).
 */
export function EmptyState({ icon, title, body, action, className = "" }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-2xl border border-t2w-border bg-t2w-surface/60 px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-t2w-accent/10 text-t2w-accent">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-t2w-muted">{body}</p>}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-t2w-accent/40 bg-t2w-accent/10 px-4 py-2 text-sm font-medium text-t2w-accent hover:bg-t2w-accent/20"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-t2w-accent/40 bg-t2w-accent/10 px-4 py-2 text-sm font-medium text-t2w-accent hover:bg-t2w-accent/20"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
