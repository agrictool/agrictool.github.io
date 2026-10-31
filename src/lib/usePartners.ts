import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { Partner } from '../types'

/** Loads collaborating / contributing organisations (oldest first). */
export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'collaborators'))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner))
        list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
        setPartners(list)
      })
      .catch(err => console.error('Failed to load partners', err))
      .finally(() => setLoading(false))
  }, [])

  return { partners, loading }
}
