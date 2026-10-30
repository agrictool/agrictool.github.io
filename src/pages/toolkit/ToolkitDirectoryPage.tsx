import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, startAfter, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Badge, Spinner, Card } from '../../components/ui'
import { Search, X, ExternalLink, ChevronRight, Filter, Image as ImageIcon } from 'lucide-react'
import type { ToolkitEntry, CostType, ToolType } from '../../types'
import { CATEGORIES } from '../../lib/constants'

const PAGE_SIZE = 24
const COST_TYPES: CostType[] = ['Free', 'Freemium', 'Premium']
const TOOL_TYPES: ToolType[] = ['Mobile App','GIS','Software/Web Platform','Digital Equipment','Data Analysis Tool']

const COST_BADGE: Record<CostType, 'green' | 'blue' | 'gold'> = {
  Free: 'green', Freemium: 'blue', Premium: 'gold',
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label={`Image: ${alt}`}
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button ref={closeRef} onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Close image">
          <X className="w-5 h-5" /> Close
        </button>
        <img src={src} alt={alt} className="max-h-[80vh] mx-auto rounded-lg object-contain bg-white p-2" />
        <p className="text-center text-white/70 text-sm mt-2">{alt}</p>
      </div>
    </div>
  )
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ tool, onImageClick }: { tool: ToolkitEntry; onImageClick: (src: string, alt: string) => void }) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="h-32 bg-[#F9FBF9] flex items-center justify-center p-3 border-b border-[#DDE3E7] rounded-t-lg overflow-hidden">
        {tool.imageUrl ? (
          <button onClick={() => onImageClick(tool.imageUrl!, tool.toolName)}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2E7D32] rounded"
            aria-label={`View image for ${tool.toolName}`}>
            <img
              src={tool.imageUrl} alt={tool.toolName} loading="lazy"
              className={`max-h-24 max-w-full rounded object-contain
                ${tool.imageType === 'logo' ? 'object-contain' : 'object-cover'}`}
            />
          </button>
        ) : (
          <div className="flex flex-col items-center text-[#5A6472]/40">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs mt-1">No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-[#12304A] text-sm leading-snug flex-1">{tool.toolName}</h3>
          <Badge variant={COST_BADGE[tool.costType]}>{tool.costType}</Badge>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E3EBF0] text-[#12304A] mb-2 self-start">{tool.category}</span>
        <p className="text-xs text-[#5A6472] leading-relaxed flex-1 line-clamp-3">{tool.function}</p>

        <div className="mt-3 flex items-center justify-between">
          <Link to={`/toolkit/${tool.id}`}
            className="text-xs text-[#2E7D32] font-medium hover:underline flex items-center gap-1">
            Details <ChevronRight className="w-3 h-3" />
          </Link>
          {tool.officialUrl && (
            <a href={tool.officialUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#5A6472] hover:text-[#12304A] flex items-center gap-1"
              aria-label={`Visit ${tool.toolName} website (external site)`}>
              <ExternalLink className="w-3 h-3" /> Visit
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ToolkitDirectoryPage() {
  const [tools, setTools] = useState<ToolkitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCost, setFilterCost] = useState<CostType | ''>('')
  const [filterToolType, setFilterToolType] = useState<ToolType | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  // Load tools
  useEffect(() => {
    setLoading(true)
    loadTools(true)
  }, [filterCategory, filterCost, filterToolType])

  const loadTools = async (reset = false) => {
    try {
      setLoadError('')
      let q = query(
        collection(db, 'toolkitEntries'),
        where('status', '==', 'approved'),
        orderBy('approvedAt', 'desc'),
        limit(PAGE_SIZE)
      )
      if (filterCategory) q = query(q, where('category', '==', filterCategory))
      if (filterCost) q = query(q, where('costType', '==', filterCost))
      if (filterToolType) q = query(q, where('toolType', '==', filterToolType))
      if (!reset && lastDoc) q = query(q, startAfter(lastDoc))

      const snap = await getDocs(q)
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolkitEntry))
      setTools(reset ? fetched : prev => [...prev, ...fetched])
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch (e) {
      console.error('Failed to load toolkit entries', e)
      const code = (e as { code?: string }).code
      setLoadError(
        code === 'failed-precondition'
          ? 'This filter combination needs a database index that has not been created yet. Please tell the administrator.'
          : 'Could not load tools. Please check your connection and try again.',
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Client-side search over loaded tools
  const filtered = tools.filter(t => {
    if (!searchTerm) return true
    const needle = searchTerm.toLowerCase()
    return (
      t.toolName.toLowerCase().includes(needle) ||
      t.function.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle) ||
      t.users.some(u => u.toLowerCase().includes(needle)) ||
      t.keywords.some(k => k.includes(needle))
    )
  })

  const clearFilters = () => {
    setFilterCategory(''); setFilterCost(''); setFilterToolType(''); setSearchTerm('')
  }
  const hasActiveFilters = filterCategory || filterCost || filterToolType || searchTerm

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#12304A]">Digital Food Systems Toolkit</h1>
        <p className="text-sm text-[#5A6472] mt-1">
          Browse practical digital tools curated by field specialists across agriculture and food systems.
          Only approved entries are shown.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6472]" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search tools, categories, users…"
              className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E7] rounded-lg text-sm
                focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]"
              aria-label="Search toolkit"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors
              ${showFilters ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32]' : 'border-[#DDE3E7] text-[#374151] hover:border-[#2E7D32]'}`}
            aria-expanded={showFilters}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {COST_TYPES.map(c => (
            <button key={c} onClick={() => setFilterCost(filterCost === c ? '' : c)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${filterCost === c ? 'bg-[#12304A] text-white border-[#12304A]' : 'bg-white border-[#DDE3E7] text-[#374151] hover:border-[#12304A]'}`}>
              {c}
            </button>
          ))}
          {['Mobile Apps','GIS'].map(t => (
            <button key={t} onClick={() => setFilterToolType(filterToolType === (t === 'Mobile Apps' ? 'Mobile App' : 'GIS') ? '' : (t === 'Mobile Apps' ? 'Mobile App' : 'GIS') as ToolType)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${filterToolType === (t === 'Mobile Apps' ? 'Mobile App' : 'GIS') ? 'bg-[#12304A] text-white border-[#12304A]' : 'bg-white border-[#DDE3E7] text-[#374151] hover:border-[#12304A]'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-4">
            <div>
              <label className="text-xs font-medium text-[#12304A] mb-1 block">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="w-full border border-[#DDE3E7] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#12304A] mb-1 block">Cost Type</label>
              <select value={filterCost} onChange={e => setFilterCost(e.target.value as CostType | '')}
                className="w-full border border-[#DDE3E7] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
                <option value="">All Costs</option>
                {COST_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#12304A] mb-1 block">Tool Type</label>
              <select value={filterToolType} onChange={e => setFilterToolType(e.target.value as ToolType | '')}
                className="w-full border border-[#DDE3E7] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
                <option value="">All Types</option>
                {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Result count & clear */}
        {(tools.length > 0 || hasActiveFilters) && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5A6472]">
              {filtered.length} tool{filtered.length !== 1 ? 's' : ''} shown
              {searchTerm ? ` matching "${searchTerm}"` : ''}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#C62828] hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-4 p-3 text-sm bg-[#FFEBEE] text-[#C62828] border border-[#C62828]/30 rounded-lg">{loadError}</div>
      )}

      {/* Grid */}
      {loading ? (
        <Spinner label="Loading toolkit entries…" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#F9FBF9] border border-[#DDE3E7] rounded-xl">
          <Search className="w-10 h-10 text-[#5A6472]/40 mx-auto mb-3" />
          <p className="font-semibold text-[#12304A] mb-1">
            {tools.length === 0 ? 'No approved tools yet' : 'No tools match your search'}
          </p>
          <p className="text-sm text-[#5A6472]">
            {tools.length === 0
              ? 'Be the first to contribute a tool to the directory.'
              : 'Try adjusting your filters or search term.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm text-[#2E7D32] underline">Clear filters</button>
          )}
          <div className="mt-4">
            <Link to="/contribute" className="text-sm text-[#2E7D32] font-medium hover:underline">
              Contribute a tool →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(tool => (
              <ToolCard key={tool.id} tool={tool} onImageClick={(src, alt) => setLightbox({ src, alt })} />
            ))}
          </div>
          {hasMore && !searchTerm && (
            <div className="text-center mt-8">
              <button
                onClick={() => { setLoadingMore(true); loadTools(false) }}
                disabled={loadingMore}
                className="px-6 py-2 border border-[#2E7D32] text-[#2E7D32] rounded-lg text-sm hover:bg-[#E8F5E9] transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </main>
  )
}
