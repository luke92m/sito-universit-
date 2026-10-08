'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LOCAL_KEYS, removeLocal, useLocalValue, writeLocal } from '@/lib/client/local-store';
import type {
  CoursePreferences,
  GuidanceProfile,
  ProfileRow,
  SiteUser,
  UniversitySummary
} from '@/lib/client/types';
import { STUDENT_TOOL_SITUATIONS } from '@/lib/site-config';

type AuthView = 'login' | 'register' | 'reset';

interface SiteContextValue {
  /** Supabase configurato: senza chiavi le funzioni con account sono disattivate. */
  authAvailable: boolean;
  /** true finché la sessione iniziale non è stata letta. */
  loading: boolean;
  user: SiteUser | null;
  universities: UniversitySummary[];
  getUniversity: (id: string | null | undefined) => UniversitySummary | null;
  isStudentToolUser: boolean;

  authModal: AuthView | null;
  openAuth: (view?: AuthView) => void;
  closeAuth: () => void;
  journeyModalOpen: boolean;
  openJourneyEditor: () => void;
  closeJourneyEditor: () => void;

  toast: string;
  showToast: (message: string) => void;

  refreshUser: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<ProfileRow, 'id' | 'role'>>) => Promise<boolean>;
  signOut: () => Promise<void>;

  guidance: GuidanceProfile;
  updateGuidance: (patch: GuidanceProfile) => Promise<void>;

  coursePreferences: CoursePreferences | null;
  saveCoursePreferences: (preferences: CoursePreferences) => Promise<boolean>;
  forgetCoursePreferences: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

// Riferimenti stabili per i valori locali assenti (richiesto da useSyncExternalStore).
const EMPTY_GUIDANCE: GuidanceProfile = {};
const NO_PREFERENCES: CoursePreferences | null = null;

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error('useSite deve essere usato dentro <SiteProvider>.');
  return value;
}

async function loadSiteUser(authUser: User): Promise<SiteUser | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, situation, journey_phase, university_id, course_name, study_year, guidance, role')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: authUser.id, email: authUser.email || '', profile: data as ProfileRow };
}

async function loadCoursePreferences(userId: string): Promise<CoursePreferences | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('course_preferences')
    .select('answers, vector, recommendations, saved_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    answers: data.answers,
    vector: data.vector,
    recommendations: data.recommendations,
    savedAt: data.saved_at
  };
}

export function SiteProvider({ universities, children }: { universities: UniversitySummary[]; children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(Boolean(supabase));
  const [user, setUser] = useState<SiteUser | null>(null);
  const [authModal, setAuthModal] = useState<AuthView | null>(null);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const guestGuidance = useLocalValue<GuidanceProfile>(LOCAL_KEYS.guidance, EMPTY_GUIDANCE);
  const guestPreferences = useLocalValue<CoursePreferences | null>(LOCAL_KEYS.coursePreferences, NO_PREFERENCES);
  const [userPreferences, setUserPreferences] = useState<CoursePreferences | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const byId = useMemo(() => new Map(universities.map((university) => [university.id, university])), [universities]);
  const getUniversity = useCallback((id: string | null | undefined) => (id ? byId.get(id) || null : null), [byId]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  }, []);

  const applyAuthUser = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      setUserPreferences(null);
      setLoading(false);
      return;
    }
    const [siteUser, preferences] = await Promise.all([loadSiteUser(authUser), loadCoursePreferences(authUser.id)]);
    setUser(siteUser);
    setUserPreferences(preferences);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) applyAuthUser(data.user);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Rimandato per non chiamare Supabase dentro il callback (evita deadlock del client).
        window.setTimeout(() => applyAuthUser(session?.user ?? null), 0);
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase, applyAuthUser]);

  const refreshUser = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    await applyAuthUser(data.user);
  }, [supabase, applyAuthUser]);

  const updateProfile = useCallback<SiteContextValue['updateProfile']>(
    async (patch) => {
      if (!supabase || !user) return false;
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select('id, display_name, situation, journey_phase, university_id, course_name, study_year, guidance, role')
        .single();
      if (error || !data) return false;
      setUser({ ...user, profile: data as ProfileRow });
      return true;
    },
    [supabase, user]
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setUser(null);
    setUserPreferences(null);
  }, [supabase]);

  const guidance = useMemo<GuidanceProfile>(
    () => (user ? { ...guestGuidance, ...(user.profile.guidance || {}) } : guestGuidance),
    [user, guestGuidance]
  );

  const updateGuidance = useCallback(
    async (patch: GuidanceProfile) => {
      const next = { ...guidance, ...patch, updatedAt: new Date().toISOString() };
      if (user) {
        await updateProfile({ guidance: next });
      } else {
        writeLocal(LOCAL_KEYS.guidance, next);
      }
    },
    [guidance, user, updateProfile]
  );

  const coursePreferences = user ? userPreferences || guestPreferences : guestPreferences;

  const saveCoursePreferences = useCallback(
    async (preferences: CoursePreferences) => {
      const savedAt = new Date().toISOString();
      if (user && supabase) {
        const { error } = await supabase.from('course_preferences').upsert({
          user_id: user.id,
          answers: preferences.answers,
          vector: preferences.vector,
          recommendations: preferences.recommendations,
          saved_at: savedAt
        });
        if (error) return false;
        setUserPreferences({ ...preferences, savedAt });
        return true;
      }
      const next = { ...preferences, savedAt };
      return writeLocal(LOCAL_KEYS.coursePreferences, next);
    },
    [user, supabase]
  );

  const forgetCoursePreferences = useCallback(async () => {
    if (user && supabase) {
      await supabase.from('course_preferences').delete().eq('user_id', user.id);
      setUserPreferences(null);
    }
    removeLocal(LOCAL_KEYS.coursePreferences);
  }, [user, supabase]);

  const value: SiteContextValue = {
    authAvailable: Boolean(supabase),
    loading,
    user,
    universities,
    getUniversity,
    isStudentToolUser: Boolean(user && STUDENT_TOOL_SITUATIONS.has(user.profile.situation)),
    authModal,
    openAuth: (view = 'login') => setAuthModal(view),
    closeAuth: () => setAuthModal(null),
    journeyModalOpen,
    openJourneyEditor: () => {
      if (user?.profile.situation === 'university') setJourneyModalOpen(true);
    },
    closeJourneyEditor: () => setJourneyModalOpen(false),
    toast,
    showToast,
    refreshUser,
    updateProfile,
    signOut,
    guidance,
    updateGuidance,
    coursePreferences,
    saveCoursePreferences,
    forgetCoursePreferences
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
