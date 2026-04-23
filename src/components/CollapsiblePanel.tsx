"use client";

import { useId, useState, type ReactNode } from "react";

type CollapsiblePanelProps = {
  title: string | ReactNode;
  /** Used when `title` is a string. Defaults to 3. */
  titleLevel?: 2 | 3;
  subtitle?: string;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const headingClass =
  "text-2xl font-light tracking-wide text-white";

export function CollapsiblePanel({
  title,
  titleLevel = 3,
  subtitle,
  defaultOpen = true,
  headerRight,
  children,
  className = "",
  contentClassName = "",
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  const titleBlock =
    typeof title === "string" ? (
      <>
        {titleLevel === 2 ? (
          <h2
            className={headingClass}
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {title}
          </h2>
        ) : (
          <h3
            className={headingClass}
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {title}
          </h3>
        )}
        {subtitle ? (
          <p className="mt-0.5 text-sm text-[#777]">{subtitle}</p>
        ) : null}
      </>
    ) : (
      title
    );

  return (
    <section className={`border border-[#222] bg-[#111] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#222] px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-sm text-left text-inherit -mx-2 px-2 py-1 transition-colors hover:bg-[#141414] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#555]"
          aria-expanded={open}
          aria-controls={regionId}
        >
          <span
            className={`mt-1.5 inline-flex shrink-0 text-[#666] transition-transform ${
              open ? "" : "-rotate-90"
            }`}
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <span className="min-w-0">{titleBlock}</span>
        </button>
        {headerRight != null ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerRight}
          </div>
        ) : null}
      </div>
      {open ? (
        <div id={regionId} className={contentClassName}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
