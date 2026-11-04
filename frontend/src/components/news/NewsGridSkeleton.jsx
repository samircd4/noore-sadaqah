/**
 * Placeholder while the /news list streams in (it reads ?category= and ?page=, so it renders per request).
 * Same grid and card height as the real list, so nothing jumps when it arrives (CLS budget, RESPONSIVE.md §12).
 */
export default function NewsGridSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-20 rounded-lg bg-sand-200 motion-safe:animate-pulse" />
        ))}
      </div>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-sand-200 bg-white">
            <div className="h-48 bg-sand-200 motion-safe:animate-pulse" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-1/3 rounded-lg bg-sand-200" />
              <div className="h-5 w-4/5 rounded-lg bg-sand-200" />
              <div className="h-11 w-16 rounded-lg bg-sand-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
