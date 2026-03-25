import type {
  CoworkerAgentSkillInstallStatusResponse,
  CoworkerAgentSkillItem,
  CoworkerSkillItem,
  CoworkerSkillVisibility,
  SkillCategoryInfo,
  SkillPublisherType,
} from "@/apis/SkillApi";
import type { AdminAiEmployeeListItem } from "@/apis/AdminAiEmployeeApi";

export type SkillCategoryFilter = number | "all" | "my_skills";
export type SkillSummaryMap = Record<number, { name: string }>;

export interface UseSkillMarketplaceResult {
  skills: CoworkerSkillItem[];
  skillSummaryMap: SkillSummaryMap;
  categories: SkillCategoryInfo[];
  activeCategory: SkillCategoryFilter;
  total: number;
  loading: boolean;
  categoriesLoading: boolean;
  errorMessage: string;
  categoriesErrorMessage: string;
  keyword: string;
  publisherType: SkillPublisherType;
  isUploadModalOpen: boolean;
  uploadSubmitting: boolean;
  currentIdentityId?: number;
  editingSkill: CoworkerSkillItem | null;
  updatingSkill: CoworkerSkillItem | null;
  installingSkill: CoworkerSkillItem | null;
  editSubmitting: boolean;
  versionSubmitting: boolean;
  installSubmitting: boolean;
  installAgents: AdminAiEmployeeListItem[];
  installAgentsLoading: boolean;
  installAgentsErrorMessage: string;
  selectedInstallAgentId?: string;
  agentSkillsLoading: boolean;
  agentSkillsErrorMessage: string;
  agentSkillBindingsByAgentId: Record<string, CoworkerAgentSkillItem[]>;
  agentSkillInstallStatusByAgentId: Record<
    string,
    Record<number, CoworkerAgentSkillInstallStatusResponse>
  >;
  selectedAgentSkills: CoworkerAgentSkillItem[];
  selectedAgentSkillBinding: CoworkerAgentSkillItem | null;
  selectedAgentSkillInstallStatusMap: Record<number, CoworkerAgentSkillInstallStatusResponse>;
  selectedSkillInstallStatus: CoworkerAgentSkillInstallStatusResponse | null;
  setActiveCategory: (value: SkillCategoryFilter) => void;
  setKeyword: (value: string) => void;
  setPublisherType: (value: SkillPublisherType) => void;
  handleSearch: (value?: string) => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  openEditModal: (skill: CoworkerSkillItem) => void;
  closeEditModal: () => void;
  openVersionModal: (skill: CoworkerSkillItem) => void;
  closeVersionModal: () => void;
  openInstallModal: (skill: CoworkerSkillItem) => void;
  closeInstallModal: () => void;
  setSelectedInstallAgentId: (value?: string) => void;
  installSkillToAgent: () => Promise<void>;
  forceReinstallSkillToAgent: () => Promise<void>;
  uninstallSkillFromAgent: () => Promise<void>;
  installSkillToSelectedAgent: (skill: CoworkerSkillItem) => Promise<void>;
  uninstallSkillFromSelectedAgent: (skill: CoworkerSkillItem) => Promise<void>;
  reloadInstallAgents: () => void;
  reloadSelectedAgentSkills: () => void;
  submitUpload: (payload: SkillUploadSubmitPayload) => Promise<void>;
  submitEdit: (payload: SkillEditSubmitPayload) => Promise<void>;
  submitVersion: (payload: SkillVersionSubmitPayload) => Promise<void>;
  removeSkill: (skill: CoworkerSkillItem) => void;
  reloadCategories: () => void;
  reloadSkills: () => void;
  reload: () => void;
}

export interface SkillUploadSubmitPayload {
  name: string;
  description: string;
  version: string;
  categoryId: number;
  visibility: CoworkerSkillVisibility;
  packageFile: File;
  coverFile?: File | null;
}

export interface SkillEditSubmitPayload {
  skillId: number;
  name: string;
  description: string;
  categoryId: number;
  visibility: CoworkerSkillVisibility;
  coverFile?: File | null;
  clearCover: boolean;
}

export interface SkillVersionSubmitPayload {
  skillId: number;
  version: string;
  packageFile: File;
}

export interface SkillUploadModalProps {
  open: boolean;
  categories: SkillCategoryInfo[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SkillUploadSubmitPayload) => Promise<void>;
}

export interface SkillEditModalProps {
  open: boolean;
  skill: CoworkerSkillItem | null;
  categories: SkillCategoryInfo[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SkillEditSubmitPayload) => Promise<void>;
}

export interface SkillVersionModalProps {
  open: boolean;
  skill: CoworkerSkillItem | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SkillVersionSubmitPayload) => Promise<void>;
}

export interface SkillInstallModalProps {
  open: boolean;
  skill: CoworkerSkillItem | null;
  agents: AdminAiEmployeeListItem[];
  agentsLoading: boolean;
  agentsErrorMessage: string;
  selectedAgentId?: string;
  binding: CoworkerAgentSkillItem | null;
  installStatus: CoworkerAgentSkillInstallStatusResponse | null;
  agentSkillsLoading: boolean;
  agentSkillsErrorMessage: string;
  submitting: boolean;
  onCancel: () => void;
  onAgentChange: (value?: string) => void;
  onInstall: () => Promise<void>;
  onForceReinstall: () => Promise<void>;
  onUninstall: () => Promise<void>;
  onRetryAgents: () => void;
  onRetryAgentSkills: () => void;
}
