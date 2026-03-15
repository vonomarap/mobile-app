import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getLocales } from "expo-localization";
import { auth, db } from "./firebase";
import { usePushRegistration } from "../hooks/usePushRegistration";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  usePushRegistration(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (!nextUser) return;

      const profileRef = doc(db, "users", nextUser.uid);
      const profileDoc = await getDoc(profileRef);
      const now = serverTimestamp();
      const locale = getLocales()[0]?.languageCode ?? "en";

      await setDoc(
        profileRef,
        {
          email: nextUser.email,
          displayName: nextUser.displayName ?? "",
          locale,
          updatedAt: now,
          createdAt: profileDoc.exists() ? profileDoc.data().createdAt : now
        },
        { merge: true }
      );
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
