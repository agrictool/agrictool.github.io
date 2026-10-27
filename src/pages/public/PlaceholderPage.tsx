import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, stage }: { title: string; stage: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Construction className="w-12 h-12 text-[#2E7D32]/40 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#12304A] mb-2">{title}</h1>
        <p className="text-sm text-[#5A6472]">
          This page will be implemented in <strong>Build Stage {stage}</strong>.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Real Firebase connections, forms, and data will be wired in that stage.
        </p>
      </div>
    </div>
  )
}
