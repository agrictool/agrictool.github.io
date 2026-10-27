import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Badge, Spinner, Alert } from '../../components/ui'
import { ExternalLink, ChevronLeft, Tag, Users, Wrench, DollarSign } from 'lucide-react'
import type { ToolkitEntry, CostType } from '../../types'

const COST_BADGE: Record<CostType, 'green' | 'blue' | 'gold'> = {
  Free: 'green', Freemium: 'blue', Premium: 'gold',
}

export default function ToolkitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tool, setTool] = useState<ToolkitEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'toolkitEntries', id)).then(snap => {
      if (!snap.exists() || snap.data().status !== 'approved') {
        setNotFound(true)
      } else {
        setTool({ id: snap.id, ...snap.data() } as ToolkitEntry)
      }
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12"><Spinner /></div>

  if (notFound || !tool) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <Alert variant="warning" title="Tool not found">
        This tool does not exist or has not been approved yet.
      </Alert>
      <Link to="/toolkit" className="mt-4 inline-block text-sm text-[#2E7D32] underline">← Back to Toolkit</Link>
    </div>
  )

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/toolkit" className="text-sm text-[#2E7D32] hover:underline flex items-center gap-1 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Toolkit Directory
      </Link>

      <div className="bg-white border border-[#DDE3E7] rounded-xl overflow-hidden shadow-sm">
        {/* Image */}
        {tool.imageUrl && (
          <div className="h-48 bg-[#F9FBF9] flex items-center justify-center border-b border-[#DDE3E7] p-6">
            <img
              src={tool.imageUrl} alt={tool.toolName}
              className={`max-h-36 max-w-full rounded object-contain`}
            />
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#12304A]">{tool.toolName}</h1>
              <Badge variant={COST_BADGE[tool.costType]}>{tool.costType}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="navy">{tool.category}</Badge>
              <Badge variant="gray">{tool.toolType}</Badge>
            </div>
          </div>

          {/* Function */}
          <div>
            <h2 className="text-sm font-semibold text-[#12304A] flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-[#2E7D32]" /> What It Does
            </h2>
            <p className="text-sm text-[#374151] leading-relaxed">{tool.function}</p>
          </div>

          {/* Cost details */}
          {tool.costDetails && (
            <div>
              <h2 className="text-sm font-semibold text-[#12304A] flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[#2E7D32]" /> Pricing
              </h2>
              <p className="text-sm text-[#374151]">{tool.costDetails}</p>
            </div>
          )}

          {/* Who uses it */}
          {tool.users?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#12304A] flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#2E7D32]" /> Who Uses It
              </h2>
              <div className="flex flex-wrap gap-2">
                {tool.users.map(u => (
                  <span key={u} className="text-xs bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 rounded-full">{u}</span>
                ))}
              </div>
            </div>
          )}

          {/* Use case */}
          {tool.useCase && (
            <div>
              <h2 className="text-sm font-semibold text-[#12304A] mb-2">Use Case</h2>
              <p className="text-sm text-[#374151] leading-relaxed">{tool.useCase}</p>
            </div>
          )}

          {/* Keywords */}
          {tool.keywords?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#12304A] flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-[#5A6472]" /> Keywords
              </h2>
              <div className="flex flex-wrap gap-1">
                {tool.keywords.map(k => (
                  <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Official URL */}
          {tool.officialUrl && (
            <div className="pt-4 border-t border-[#DDE3E7]">
              <a
                href={tool.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#12304A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d2237] transition-colors"
                aria-label={`Visit ${tool.toolName} official website (opens in new tab)`}
              >
                <ExternalLink className="w-4 h-4" />
                Visit Official Website
              </a>
              <p className="text-xs text-[#5A6472] mt-2">
                External site — opens in a new tab. RAISSAT is not affiliated with this tool.
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="pt-4 border-t border-[#DDE3E7] text-xs text-[#5A6472]">
            {tool.approvedAt && (
              <p>Added to directory: {new Date(tool.approvedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
