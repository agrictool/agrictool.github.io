function initials(name: string): string {
  const letters = name
    .split(/[\s,()]+/)
    .filter(w => /^[A-Za-z]/.test(w) && w.length > 2)
    .map(w => w[0].toUpperCase())
    .join('')
  return letters.slice(0, 4) || name.slice(0, 3).toUpperCase()
}

/** A logo tile with the organisation name underneath. Falls back to initials when there is no logo. */
export default function OrgCard({ name, logoUrl, caption }: {
  name: string
  logoUrl?: string
  caption?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-20 h-20 bg-white border border-[#DDE3E7] rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
        {logoUrl ? (
          <img src={logoUrl} alt={`${name} logo`} className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-xs font-bold text-[#12304A] text-center">{initials(name)}</span>
        )}
      </div>
      <p className="text-xs text-[#5A6472] max-w-[150px] text-center leading-tight">{name}</p>
      {caption && <p className="text-[10px] uppercase tracking-wide text-[#2E7D32] font-semibold">{caption}</p>}
    </div>
  )
}
