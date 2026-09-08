import { Database } from './database.types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface AuthUser {
  id: string
  email: string
  profile?: ProfileRow | null
}

export interface SessionContextType {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
}
