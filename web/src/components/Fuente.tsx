/** Link a una fuente: subrayado, con ↗ y abre en otra pestaña. */
export default function Fuente({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-ink-3 underline-offset-2 hover:text-ink hover:decoration-ink"
    >
      {children} <span aria-hidden>↗</span>
    </a>
  );
}
