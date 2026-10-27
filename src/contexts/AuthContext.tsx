import React, { createContext, useContext, useEffect, useState } from 'react'
import { type User, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { UserProfile } from '../types'

interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isParticipant: boolean
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isParticipant: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsubscribeAuth
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    const ref = doc(db, 'users', firebaseUser.uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [firebaseUser])

  const isAdmin = profile?.role === 'admin'
  const isParticipant = profile?.role === 'participant'

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, isAdmin, isParticipant }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
