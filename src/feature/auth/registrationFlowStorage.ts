export interface RegistrationOnboardingDraft {
  nickname: string;
  companyName: string;
  workspaceName: string;
  phone: string;
  giftPoints: number;
}

const REGISTRATION_ONBOARDING_DRAFT_STORAGE_KEY = "frontis.auth.registration-onboarding-draft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeDraft = (value: unknown): RegistrationOnboardingDraft | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    nickname: typeof value.nickname === "string" ? value.nickname.trim() : "",
    companyName: typeof value.companyName === "string" ? value.companyName.trim() : "",
    workspaceName: typeof value.workspaceName === "string" ? value.workspaceName.trim() : "",
    phone: typeof value.phone === "string" ? value.phone.trim() : "",
    giftPoints: typeof value.giftPoints === "number" ? value.giftPoints : 0,
  };
};

export const saveRegistrationOnboardingDraft = (draft: RegistrationOnboardingDraft): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    REGISTRATION_ONBOARDING_DRAFT_STORAGE_KEY,
    JSON.stringify({
      nickname: draft.nickname.trim(),
      companyName: draft.companyName.trim(),
      workspaceName: draft.workspaceName.trim(),
      phone: draft.phone.trim(),
      giftPoints: draft.giftPoints,
    }),
  );
};

export const loadRegistrationOnboardingDraft = (): RegistrationOnboardingDraft | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(REGISTRATION_ONBOARDING_DRAFT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return normalizeDraft(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const clearRegistrationOnboardingDraft = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(REGISTRATION_ONBOARDING_DRAFT_STORAGE_KEY);
};
