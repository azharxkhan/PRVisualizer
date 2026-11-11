/**
 * The same four cells as the favicon, drawn inline so the header mark cannot disappear behind
 * a missing file or a cached icon. Decorative: the heading beside it already names the app.
 */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#14171d" />
      <rect x="4" y="4" width="14" height="15" rx="2" fill="#2f9e44" />
      <rect x="4" y="21" width="14" height="7" rx="2" fill="#d97706" />
      <rect x="20" y="4" width="8" height="10" rx="2" fill="#8b5cf6" />
      <rect x="20" y="16" width="8" height="12" rx="2" fill="#e5484d" />
    </svg>
  )
}
