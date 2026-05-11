import { useCallback, useEffect, useMemo, useState } from "react";

import type { MeOnboardingProfileValues } from "@/feature/workspace/types";

export interface UseMeOnboardingProfileModalParams {
  enabled: boolean;
  accountId?: string;
  tenantId?: string;
  defaultNickname?: string;
  defaultCompanyName?: string;
  showOnEveryEntry?: boolean;
}

export interface UseMeOnboardingProfileModalResult {
  isOpen: boolean;
  profile: MeOnboardingProfileValues;
  handleChangeProfile: (nextValue: MeOnboardingProfileValues) => void;
  handleSkipProfile: () => void;
  handleSubmitProfile: () => MeOnboardingProfileValues;
}

export const DEFAULT_ME_ONBOARDING_PROFILE_VALUES: MeOnboardingProfileValues = {
  nickname: "",
  companyName: "",
  industry: "",
  role: "",
  companyDescription: "",
};

const ME_ONBOARDING_PROFILE_MODAL_STORAGE_PREFIX = "frontis:me-onboarding-profile-modal:";

const buildStorageKey = (accountId?: string, tenantId?: string): string | null => {
  if (!accountId || !tenantId) {
    return null;
  }

  return `${ME_ONBOARDING_PROFILE_MODAL_STORAGE_PREFIX}${accountId}:${tenantId}`;
};

const readProfileResolvedStatus = (storageKey: string | null): boolean => {
  if (!storageKey || typeof window === "undefined") {
    return true;
  }

  try {
    return Boolean(window.sessionStorage.getItem(storageKey));
  } catch {
    return true;
  }
};

const markProfileResolved = (
  storageKey: string | null,
  status: "submitted" | "skipped",
  profile?: MeOnboardingProfileValues,
): void => {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        status,
        profile,
      }),
    );
  } catch {
    // sessionStorage 不可用时只影响本次弹窗记忆，不阻断主流程。
  }
};

const normalizeProfileValues = (profile: MeOnboardingProfileValues): MeOnboardingProfileValues => ({
  nickname: profile.nickname.trim(),
  companyName: profile.companyName.trim(),
  industry: profile.industry.trim(),
  role: profile.role.trim(),
  companyDescription: profile.companyDescription.trim(),
});

/**
 * 管理 ME 新用户轻量资料弹窗的首次展示、跳过和提交状态。
 */
export const useMeOnboardingProfileModal = ({
  enabled,
  accountId,
  tenantId,
  defaultNickname,
  defaultCompanyName,
  showOnEveryEntry = false,
}: UseMeOnboardingProfileModalParams): UseMeOnboardingProfileModalResult => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<MeOnboardingProfileValues>(
    DEFAULT_ME_ONBOARDING_PROFILE_VALUES,
  );

  const storageKey = useMemo(() => buildStorageKey(accountId, tenantId), [accountId, tenantId]);

  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
      return;
    }

    if (!showOnEveryEntry && readProfileResolvedStatus(storageKey)) {
      return;
    }

    setProfile({
      ...DEFAULT_ME_ONBOARDING_PROFILE_VALUES,
      nickname: defaultNickname ?? "",
      companyName: defaultCompanyName ?? "",
    });
    setIsOpen(true);
  }, [defaultCompanyName, defaultNickname, enabled, showOnEveryEntry, storageKey]);

  const handleChangeProfile = useCallback((nextValue: MeOnboardingProfileValues): void => {
    setProfile(nextValue);
  }, []);

  const handleSkipProfile = useCallback((): void => {
    markProfileResolved(storageKey, "skipped");
    setIsOpen(false);
  }, [storageKey]);

  const handleSubmitProfile = useCallback((): MeOnboardingProfileValues => {
    const normalizedProfile = normalizeProfileValues(profile);
    markProfileResolved(storageKey, "submitted", normalizedProfile);
    setProfile(normalizedProfile);
    setIsOpen(false);
    return normalizedProfile;
  }, [profile, storageKey]);

  return {
    isOpen,
    profile,
    handleChangeProfile,
    handleSkipProfile,
    handleSubmitProfile,
  };
};
