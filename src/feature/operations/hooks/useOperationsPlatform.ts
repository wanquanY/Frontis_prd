import { useCallback, useEffect, useMemo, useState } from "react";

import {
  OPERATIONS_AGENT_STATUS_LABELS,
  OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
  OPERATIONS_INITIAL_TENANTS,
  OPERATIONS_TENANT_STATUS_LABELS,
  createEmptyOperationsTenantForm,
} from "@/feature/operations/mockData";
import {
  loadStoredOperationsTenants,
  saveStoredOperationsTenants,
} from "@/feature/operations/tenantStorage";
import type {
  OperationsAgentSubmission,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMember,
} from "@/feature/operations/types";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";

interface UseOperationsPlatformResult {
  tenants: OperationsTenant[];
  agentSubmissions: OperationsAgentSubmission[];
  approvedAgentSubmissions: OperationsAgentSubmission[];
  emptyTenantForm: OperationsTenantForm;
  tenantStatusLabels: typeof OPERATIONS_TENANT_STATUS_LABELS;
  agentStatusLabels: typeof OPERATIONS_AGENT_STATUS_LABELS;
  createTenant: (form: OperationsTenantForm) => void;
  updateTenant: (tenantId: string, form: OperationsTenantForm) => void;
  updateTenantStatus: (tenantId: string, status: OperationsTenant["status"]) => void;
  approveAgent: (submissionId: string) => void;
  rejectAgent: (submissionId: string, reason: string) => void;
  updateAgentPlazaSettings: (
    submissionId: string,
    patch: Pick<
      OperationsAgentSubmission,
      "plazaCategory" | "plazaVisibility" | "visibleTenantIds" | "visibleTenantNames" | "plazaStatus"
    >,
  ) => void;
}

const formatTimestamp = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const buildTenantMemberId = (): string => `ops-tenant-member-${Date.now()}`;

const buildAdminTenantMember = (
  adminName: string,
  adminPhone: string,
  addedAt: string,
): OperationsTenantMember => ({
  id: buildTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleLabel: "管理员",
  addedAt,
});

const syncAdminTenantMember = (
  members: OperationsTenantMember[],
  adminName: string,
  adminPhone: string,
  fallbackAddedAt: string,
): OperationsTenantMember[] => {
  const adminMemberIndex = members.findIndex(item => item.roleLabel === "管理员");

  if (adminMemberIndex < 0) {
    return [buildAdminTenantMember(adminName, adminPhone, fallbackAddedAt), ...members];
  }

  return members.map((item, index) =>
    index === adminMemberIndex
      ? {
          ...item,
          name: adminName.trim(),
          phone: adminPhone.trim(),
        }
      : item,
  );
};

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatTimestamp();

  return {
    id: `ops-tenant-${Date.now()}`,
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: "enterprise",
    industry: form.industry.trim(),
    adminName: form.adminName.trim(),
    adminPhone: form.adminPhone.trim(),
    hasFdeAccess: form.hasFdeAccess,
    seatCount: form.seatCount,
    effectiveAt: form.effectiveAt.trim(),
    expiresAt: form.expiresAt.trim(),
    moduleLabels: form.moduleLabels,
    members: [buildAdminTenantMember(form.adminName, form.adminPhone, createdAt)],
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };
};

const buildInitialAgentSubmissions = (): OperationsAgentSubmission[] => {
  const mergedSubmissions = new Map<string, OperationsAgentSubmission>();

  OPERATIONS_INITIAL_AGENT_SUBMISSIONS.forEach(item => {
    mergedSubmissions.set(item.id, item);
  });

  loadEnterpriseCommodityApplications().forEach(item => {
    const currentItem = mergedSubmissions.get(item.id);
    mergedSubmissions.set(item.id, currentItem ? { ...currentItem, ...item } : item);
  });

  return Array.from(mergedSubmissions.values()).sort((leftItem, rightItem) =>
    rightItem.submittedAt.localeCompare(leftItem.submittedAt),
  );
};

/**
 * 提供运营后台原型所需的本地 mock 状态和交互动作。
 */
export const useOperationsPlatform = (): UseOperationsPlatformResult => {
  const [tenants, setTenants] = useState<OperationsTenant[]>(
    () => loadStoredOperationsTenants() ?? OPERATIONS_INITIAL_TENANTS,
  );
  const [agentSubmissions, setAgentSubmissions] = useState<OperationsAgentSubmission[]>(
    buildInitialAgentSubmissions,
  );

  useEffect(() => {
    saveStoredOperationsTenants(tenants);
  }, [tenants]);

  useEffect(() => {
    saveEnterpriseCommodityApplications(agentSubmissions);
  }, [agentSubmissions]);

  const approvedAgentSubmissions = useMemo<OperationsAgentSubmission[]>(
    () => agentSubmissions.filter(item => item.status === "approved"),
    [agentSubmissions],
  );

  const createTenant = useCallback((form: OperationsTenantForm): void => {
    const nextTenant = buildTenantFromForm(form);

    setTenants(currentTenants => [nextTenant, ...currentTenants]);
  }, []);

  const updateTenant = useCallback((tenantId: string, form: OperationsTenantForm): void => {
    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? {
              ...item,
              name: form.name.trim(),
              code: form.code.trim().toUpperCase(),
              industry: form.industry.trim(),
              adminName: form.adminName.trim(),
              adminPhone: form.adminPhone.trim(),
              hasFdeAccess: form.hasFdeAccess,
              seatCount: form.seatCount,
              effectiveAt: form.effectiveAt.trim(),
              expiresAt: form.expiresAt.trim(),
              moduleLabels: form.moduleLabels,
              members: syncAdminTenantMember(
                item.members,
                form.adminName,
                form.adminPhone,
                item.createdAt,
              ),
              updatedAt: formatTimestamp(),
            }
          : item,
      ),
    );
  }, []);

  const updateTenantStatus = useCallback(
    (tenantId: string, status: OperationsTenant["status"]): void => {
      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                status,
                updatedAt: formatTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const approveAgent = useCallback((submissionId: string): void => {
    const reviewedAt = formatTimestamp();

    setAgentSubmissions(currentSubmissions =>
      currentSubmissions.map(item =>
        item.id === submissionId
          ? {
              ...item,
              status: "approved",
              rejectReason: undefined,
              lastReviewedAt: reviewedAt,
              plazaCategory: item.plazaCategory ?? "通用",
              plazaVisibility: item.plazaVisibility ?? "public",
              visibleTenantIds: item.visibleTenantIds ?? [],
              visibleTenantNames: item.visibleTenantNames ?? [],
              plazaStatus: item.plazaStatus ?? "offline",
              plazaUpdatedAt: item.plazaUpdatedAt ?? reviewedAt,
            }
          : item,
      ),
    );
  }, []);

  const rejectAgent = useCallback((submissionId: string, reason: string): void => {
    const reviewedAt = formatTimestamp();

    setAgentSubmissions(currentSubmissions =>
      currentSubmissions.map(item =>
        item.id === submissionId
          ? {
              ...item,
              status: "rejected",
              rejectReason: reason.trim(),
              lastReviewedAt: reviewedAt,
            }
          : item,
      ),
    );
  }, []);

  const updateAgentPlazaSettings = useCallback(
    (
      submissionId: string,
      patch: Pick<
        OperationsAgentSubmission,
        "plazaCategory" | "plazaVisibility" | "visibleTenantIds" | "visibleTenantNames" | "plazaStatus"
      >,
    ): void => {
      setAgentSubmissions(currentSubmissions =>
        currentSubmissions.map(item =>
          item.id === submissionId
            ? {
                ...item,
                ...patch,
                plazaUpdatedAt: formatTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  return {
    tenants,
    agentSubmissions,
    approvedAgentSubmissions,
    emptyTenantForm: createEmptyOperationsTenantForm(),
    tenantStatusLabels: OPERATIONS_TENANT_STATUS_LABELS,
    agentStatusLabels: OPERATIONS_AGENT_STATUS_LABELS,
    createTenant,
    updateTenant,
    updateTenantStatus,
    approveAgent,
    rejectAgent,
    updateAgentPlazaSettings,
  };
};
