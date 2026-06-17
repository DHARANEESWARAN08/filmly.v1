import { useApp } from '../context/AppContext';

export function useAuth() {
  const { user, booting, authNotice, clearAuthNotice, signIn, signUp, resendConfirmation, signOut } = useApp();
  return { user, booting, authNotice, clearAuthNotice, signIn, signUp, resendConfirmation, signOut };
}
