import React, { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ProgrammeSettings } from '../types'

const DEFAULT_SETTINGS: ProgrammeSettings = {
  preSurveyState: 'not_open',
  postSurveyState: 'not_open',
  certificatePhaseState: 'not_open',
  programmeTitle: 'Preparing the Next Generation for Digital Food Systems: AI, Data, and Innovation from Farm to Fork',
  programmeDate: 'October 16, 2026',
  programmeLocation: 'Akure, Nigeria',
  collaboratorName: 'Federal University of Technology, Akure (FUTA), School of Agriculture and Agricultural Technology (SAAT)',
  requireGroupScoreForCertificate: false,
  projectDescription: '[Project description — to be configured by administrator]',
  projectObjectives: [],
  certificateSettings: {
    titleText: 'CERTIFICATE OF COMPLETION',
    awardedToLabel: 'THIS IS AWARDED TO',
    bodyText: 'For successfully participating in and completing the capacity-building project and training:',
    coveringTopics: 'Precision Agriculture, AI Diagnostics, GIS & Remote Sensing, Food Traceability, Laboratory Data Systems, and Practical Problem-Solving Challenges.',
    projectLeadName: 'Oladipo Esther Modupe',
    projectLeadTitle: 'Project Lead, RAISSAT Community Impact Project',
    partnerSignatoryName: '[Partner Authorized Signatory]',
    partnerSignatoryTitle: '[Title / Organization]',
    idPrefix: 'DFS',
    templateVersion: 1,
    backgroundColour: '#12304A',
    accentColour: '#2E7D32',
  },
  updatedAt: '',
  updatedBy: '',
}

interface SettingsContextValue {
  settings: ProgrammeSettings
  loading: boolean
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProgrammeSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, 'programmeSettings', 'current')
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<ProgrammeSettings>) })
      }
      setLoading(false)
    }, () => {
      // If offline or error, use defaults
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
