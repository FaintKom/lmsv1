/**
 * Minimal layout for the `/courses/[id]/print` route used as the source
 * for PDF export. No sidebar, no top nav, no auth gate — the page
 * itself decides what to render and (for the Playwright-driven export
 * path) reads `?token=...` for one-shot auth. Teachers can also open
 * the URL in their normal session and Cmd+P to print directly.
 */
export default function PrintLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <div className="print-root min-h-screen bg-paper-2 text-text">
 <style>{`
 /* When the browser is actually printing (Cmd+P or Playwright PDF),
  drop all chrome and make the content edge-to-edge. */
 @media print {
 @page { size: A4; margin: 15mm; }
 body { background: white !important; }
 .no-print { display: none !important; }
 .page-break { break-after: page; }
 a { color: black !important; text-decoration: none !important; }
 }
 .print-root { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
 `}</style>
 {children}
 </div>
 );
}
