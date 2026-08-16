import { useApp } from '../store.jsx'

export function useAuth() {
  const { user, authLoading, isAuthed } = useApp()

  return {
    user,
    loading: authLoading,
    isAuthed
  }
}
