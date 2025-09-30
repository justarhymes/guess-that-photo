import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  auth,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
} from "../firebase.js";

const LOCAL_USER_KEY = "guess-that-photo/local-user";
const ANON_DISABLED_KEY = "guess-that-photo/anonymous-disabled";

const createLocalId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2, 11)}`;
};

const readLocalUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.uid) return null;
    return {
      uid: parsed.uid,
      displayName: parsed.displayName || "Guest",
      photoURL: parsed.photoURL || null,
      isLocal: true,
    };
  } catch (err) {
    console.warn("Failed to read local user identity", err);
    return null;
  }
};

const writeLocalUser = (user) => {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      window.localStorage.removeItem(LOCAL_USER_KEY);
      return;
    }
    window.localStorage.setItem(
      LOCAL_USER_KEY,
      JSON.stringify({
        uid: user.uid,
        displayName: user.displayName || "Guest",
        photoURL: user.photoURL || null,
      })
    );
  } catch (err) {
    console.warn("Failed to persist local user identity", err);
  }
};

const createLocalUser = (previous) => ({
  uid: previous?.uid || createLocalId(),
  displayName: previous?.displayName || "Guest",
  photoURL: previous?.photoURL || null,
  isLocal: true,
});

export default function useAuthUser() {
  const initialFirebaseUser = auth.currentUser;
  const initialLocalUser = initialFirebaseUser ? null : readLocalUser();
  const initialAnonDisabled =
    typeof window !== "undefined" &&
    window.localStorage.getItem(ANON_DISABLED_KEY) === "true";

  const [firebaseUser, setFirebaseUser] = useState(initialFirebaseUser || null);
  const [localUser, setLocalUser] = useState(initialLocalUser);
  const anonymousDisabledRef = useRef(initialAnonDisabled);
  const [initializing, setInitializing] = useState(
    !initialFirebaseUser && !initialLocalUser
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setFirebaseUser(nextUser || null);
        if (nextUser) {
          setLocalUser(null);
          writeLocalUser(null);
          anonymousDisabledRef.current = false;
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ANON_DISABLED_KEY);
          }
        }
        setInitializing(false);
      },
      (err) => {
        console.error("Auth listener error", err);
        setError(err);
        setInitializing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser) return;
    if (localUser) {
      writeLocalUser(localUser);
    }
  }, [firebaseUser, localUser]);

  const user = useMemo(
    () => firebaseUser || localUser || null,
    [firebaseUser, localUser]
  );

  const ensureUser = useCallback(async () => {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    // if we previously disabled anonymous auth, clear the cache and retry
    if (anonymousDisabledRef.current) {
      anonymousDisabledRef.current = false;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ANON_DISABLED_KEY);
      }
    }

    try {
      const credential = await signInAnonymously(auth);
      const signedInUser = credential?.user || auth.currentUser || null;
      setInitializing(false);
      return signedInUser || localUser || createLocalUser();
    } catch (err) {
      if (err?.code === 'auth/admin-restricted-operation') {
        console.warn('Anonymous auth disabled. Falling back to local identity.');
        anonymousDisabledRef.current = true;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(ANON_DISABLED_KEY, 'true');
        }
        const fallback = localUser || createLocalUser();
        setLocalUser(fallback);
        writeLocalUser(fallback);
        setInitializing(false);
        return fallback;
      }
      setError(err);
      setInitializing(false);
      throw err;
    }
  }, [localUser]);

  const applyProfile = useCallback(async (displayName, photoURL) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: displayName ?? auth.currentUser.displayName ?? "Guest",
        photoURL: photoURL ?? auth.currentUser.photoURL ?? null,
      });
      setFirebaseUser({ ...auth.currentUser });
      return;
    }

    setLocalUser((prev) => {
      const next = createLocalUser({
        ...prev,
        displayName: displayName ?? prev?.displayName,
        photoURL: photoURL ?? prev?.photoURL,
      });
      writeLocalUser(next);
      return next;
    });
  }, []);

  return {
    user,
    initializing,
    error,
    ensureUser,
    applyProfile,
  };
}
