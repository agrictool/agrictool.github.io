import { Link } from 'react-router-dom'
import {
  Cpu, Satellite, Leaf, ShieldCheck, Truck, BarChart2,
  ArrowRight, Users, BookOpen, FlaskConical, CheckCircle2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { ButtonLink } from '../../components/ui'

const KEY_AREAS = [
  { icon: Satellite,    label: 'Precision Agriculture & GIS',       desc: 'Satellite imagery, drone mapping, IoT sensors, and remote sensing for crop and soil monitoring.' },
  { icon: Cpu,          label: 'AI & Data Analytics',               desc: 'Machine learning for disease detection, yield prediction, market intelligence, and decision support.' },
  { icon: ShieldCheck,  label: 'Food Safety & Traceability',        desc: 'Blockchain, hyperspectral imaging, and digital traceability from farm to consumer.' },
  { icon: Truck,        label: 'Supply Chain & Logistics',          desc: 'Cold chain monitoring, demand forecasting, and digital logistics management.' },
  { icon: Leaf,         label: 'Livestock & Aquaculture Tech',      desc: 'Wearable biosensors, smart feeding systems, health monitoring, and digital production records.' },
  { icon: BarChart2,    label: 'Agricultural Data & Research Tools', desc: 'Open-access platforms, research databases, analysis tools, and data visualization for agricultural science.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Register',           desc: 'Create your participant account using your FUTA student details.' },
  { step: '02', title: 'Pre-Assessment',     desc: 'Complete the baseline digital readiness survey to establish your starting point.' },
  { step: '03', title: 'Training Programme', desc: 'Attend the one-day capacity-building event — panel discussions, live demos, and group challenges.' },
  { step: '04', title: 'Post-Assessment',    desc: 'Reflect on your learning through the post-training survey.' },
  { step: '05', title: 'Earn Certificate',   desc: 'Download your personalised certificate of completion when all phases are complete.' },
]

export default function HomePage() {
  const { firebaseUser } = useAuth()
  const { settings } = useSettings()

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#12304A] text-white overflow-hidden" aria-labelledby="hero-heading">
        {/* Background decorative shapes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#2E7D32]/10" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#D4AF37]/5" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#2E7D32]/20 border border-[#2E7D32]/40 rounded-full px-3 py-1 mb-6">
              <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-xs font-medium text-[#D4AF37]">RAISSAT Community Impact Project · FUTA, Akure</span>
            </div>

            <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Preparing the Next Generation for{' '}
              <span className="text-[#2E7D32]">Digital Food Systems</span>
            </h1>

            <p className="text-lg text-blue-200 mb-3 font-medium">
              AI, Data, and Innovation from Farm to Fork
            </p>

            <p className="text-blue-200/80 text-base leading-relaxed mb-8 max-w-2xl">
              Discover how digital technologies are transforming agriculture and food systems.
              Explore practical tools, assess your digital skills, and learn how artificial intelligence,
              data, remote sensing, traceability, and other innovations can address real-world challenges
              across the agrifood value chain.
            </p>

            <div className="flex flex-wrap gap-3">
              {!firebaseUser ? (
                <>
                  <ButtonLink to="/register" size="lg" variant="primary">
                      Create Participant Account
                      <ArrowRight className="w-4 h-4" />
                    </ButtonLink>
                  <ButtonLink to="/login" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                      Log In
                    </ButtonLink>
                </>
              ) : (
                <ButtonLink to="/dashboard" size="lg" variant="primary">
                    My Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </ButtonLink>
              )}
              <ButtonLink to="/contribute" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <FlaskConical className="w-4 h-4" />
                  Contribute a Digital Tool
                </ButtonLink>
              <ButtonLink to="/toolkit" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <BookOpen className="w-4 h-4" />
                  Explore the Toolkit
                </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── About the Project ─────────────────────────────────────────────── */}
      <section className="py-16 bg-[#F9FBF9]" aria-labelledby="about-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-2">About the Project</p>
              <h2 id="about-heading" className="text-2xl sm:text-3xl font-bold text-[#12304A] mb-4">
                Bridging the Gap Between Agricultural Education and Digital Innovation
              </h2>
              <div className="text-[#5A6472] leading-relaxed space-y-3 text-sm">
                {settings.projectDescription === '[Project description — to be configured by administrator]' ? (
                  <p className="italic text-gray-400">
                    [Project description will be added by the administrator in Settings.]
                  </p>
                ) : (
                  <p>{settings.projectDescription}</p>
                )}
                <p>
                  The RAISSAT Digital Food Systems Project is a community impact initiative bringing
                  capacity-building in digital agriculture directly to undergraduate students at the
                  Federal University of Technology, Akure — one of Nigeria's leading technical universities
                  in an agriculturally productive region.
                </p>
                <p>
                  Through expert panel discussions, live demonstrations of AI and digital tools, a practical
                  group challenge, and a curated Toolkit manual, participants gain foundational skills for the
                  increasingly digital future of food and agriculture.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users,       value: '80–120',    label: 'Expected Participants' },
                { icon: BookOpen,    value: '10',         label: 'Specialist Sections' },
                { icon: Cpu,         value: '100+',       label: 'Digital Tools Covered' },
                { icon: CheckCircle2,value: settings.programmeDate, label: 'Programme Date' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#DDE3E7] rounded-lg p-4 text-center shadow-sm">
                  <stat.icon className="w-6 h-6 text-[#2E7D32] mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xl font-bold text-[#12304A]">{stat.value}</p>
                  <p className="text-xs text-[#5A6472] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Areas ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white" aria-labelledby="areas-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-2">What We Cover</p>
            <h2 id="areas-heading" className="text-2xl sm:text-3xl font-bold text-[#12304A]">
              Key Areas of Digital Food Systems
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_AREAS.map(area => (
              <div key={area.label} className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-[#E8F5E9] rounded-lg flex items-center justify-center mb-3">
                  <area.icon className="w-5 h-5 text-[#2E7D32]" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-[#12304A] text-sm mb-2">{area.label}</h3>
                <p className="text-xs text-[#5A6472] leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#12304A]" aria-labelledby="how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-2">The Participant Journey</p>
            <h2 id="how-heading" className="text-2xl sm:text-3xl font-bold text-white">
              How the Participant Programme Works
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-1/2 w-full h-0.5 bg-[#2E7D32]/30 z-0" aria-hidden="true" />
                )}
                <div className="relative z-10 bg-[#1a4266] border border-white/10 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-[#2E7D32] rounded-full flex items-center justify-center mx-auto mb-3 text-xs font-bold text-white">
                    {step.step}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-blue-200 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {!firebaseUser && (
            <div className="text-center mt-10">
              <ButtonLink to="/register" size="lg" variant="primary">
                  Register Now
                  <ArrowRight className="w-4 h-4" />
                </ButtonLink>
            </div>
          )}
        </div>
      </section>

      {/* ── Toolkit Preview ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white" aria-labelledby="toolkit-preview-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-1">Digital Food Systems Toolkit</p>
              <h2 id="toolkit-preview-heading" className="text-2xl font-bold text-[#12304A]">
                Explore Approved Tools
              </h2>
              <p className="text-sm text-[#5A6472] mt-1">
                Browse our curated directory of digital tools across agriculture and food systems.
              </p>
            </div>
            <ButtonLink to="/toolkit" variant="outline">
                View Full Directory
                <ArrowRight className="w-4 h-4" />
              </ButtonLink>
          </div>

          {/* Live toolkit entries injected in Stage 5 */}
          <div className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-8 text-center">
            <BookOpen className="w-10 h-10 text-[#2E7D32]/40 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-[#5A6472]">
              Approved toolkit entries will appear here once the directory is populated.
            </p>
            <Link to="/contribute" className="text-sm text-[#2E7D32] underline mt-2 inline-block">
              Contribute a tool →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Participating Organisations ───────────────────────────────────── */}
      <section className="py-12 bg-[#F9FBF9] border-t border-[#DDE3E7]" aria-labelledby="partners-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="partners-heading" className="text-sm font-semibold text-[#5A6472] uppercase tracking-widest mb-6">
            Participating Organisations
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Logo slots — admin uploads actual logos in Settings */}
            {[
              { abbr: 'RAISSAT', full: 'Research Applied Institute for Sustainability in Science, Agriculture and Technology' },
              { abbr: 'FUTA', full: 'Federal University of Technology, Akure' },
            ].map(org => (
              <div key={org.abbr} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white border border-[#DDE3E7] rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-[#12304A]">{org.abbr}</span>
                </div>
                <p className="text-xs text-[#5A6472] max-w-[120px] text-center leading-tight">{org.full}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-6 italic">
            Organisation logos can be uploaded by the administrator in Settings.
          </p>
        </div>
      </section>
    </main>
  )
}
