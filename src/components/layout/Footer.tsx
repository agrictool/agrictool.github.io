import { Link } from 'react-router-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { usePartners } from '../../lib/usePartners'

export default function Footer() {
  const { settings } = useSettings()
  const { partners } = usePartners()

  return (
    <footer className="bg-[#12304A] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {settings.raiissatLogoUrl ? (
                <span className="w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center flex-shrink-0">
                  <img src={settings.raiissatLogoUrl} alt="RAISSAT logo" className="max-w-full max-h-full object-contain" />
                </span>
              ) : (
                <div className="w-8 h-8 bg-[#D4AF37] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-[#12304A] font-bold text-xs">R</span>
                </div>
              )}
              <span className="font-bold text-sm">RAISSAT</span>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed mb-2">
              Research Applied Institute for Sustainability in Science, Agriculture and Technology
            </p>
            <p className="text-xs text-blue-300">
              Community Impact Project — {settings.programmeLocation}
            </p>
          </div>

          {/* Collaborator */}
          <div>
            <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">In Collaboration With</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                {settings.collaboratorLogoUrl && (
                  <span className="w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center flex-shrink-0">
                    <img src={settings.collaboratorLogoUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </span>
                )}
                <span className="text-xs text-blue-200 leading-relaxed">{settings.collaboratorName}</span>
              </li>
              {partners.map(p => (
                <li key={p.id} className="flex items-center gap-2">
                  {p.logoUrl && (
                    <span className="w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center flex-shrink-0">
                      <img src={p.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                    </span>
                  )}
                  <span className="text-xs text-blue-200 leading-relaxed">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Quick Links</h3>
            <ul className="space-y-1">
              {[
                { to: '/toolkit', label: 'Explore Toolkit' },
                { to: '/contribute', label: 'Contribute a Tool' },
                { to: '/register', label: 'Participant Registration' },
                { to: '/privacy', label: 'Privacy Notice' },
              ].map(l => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-xs text-blue-200 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            {settings.contactEmail && (
              <p className="text-xs text-blue-200 mt-4">
                Contact:{' '}
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-white transition-colors">
                  {settings.contactEmail}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-blue-300">
            Project Lead: Oladipo Esther Modupe
          </p>
          <p className="text-xs text-blue-300">
            © {new Date().getFullYear()} RAISSAT Community Impact Project
          </p>
        </div>
      </div>
    </footer>
  )
}
