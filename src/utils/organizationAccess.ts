import type {
  AccessScopeSubject,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  OrganizationTreeNode,
  OrganizationSubjectType,
} from "@/pages/types";

/**
 * 企业根节点 ID。
 */
export const COMPANY_SCOPE_SUBJECT_ID = "company-root";

/**
 * 企业根节点名称。
 */
export const COMPANY_SCOPE_SUBJECT_NAME = "全公司";

const createSubjectKey = (subjectType: OrganizationSubjectType, subjectId: string): string =>
  `${subjectType}:${subjectId}`;

const collectDescendantDepartmentIds = (
  departmentId: string,
  departments: OrganizationDepartmentItem[],
): Set<string> => {
  const collectedIds = new Set<string>([departmentId]);
  const queue: string[] = [departmentId];

  while (queue.length) {
    const currentDepartmentId = queue.shift();

    if (!currentDepartmentId) {
      continue;
    }

    departments
      .filter(department => department.parentId === currentDepartmentId)
      .forEach(department => {
        if (!collectedIds.has(department.id)) {
          collectedIds.add(department.id);
          queue.push(department.id);
        }
      });
  }

  return collectedIds;
};

const hasDepartmentAncestor = (
  subject: AccessScopeSubject,
  normalizedSubjects: AccessScopeSubject[],
  departments: OrganizationDepartmentItem[],
): boolean => {
  if (subject.subjectType !== "department") {
    return false;
  }

  let currentParentId = departments.find(department => department.id === subject.subjectId)?.parentId;

  while (currentParentId) {
    if (
      normalizedSubjects.some(
        item => item.subjectType === "department" && item.subjectId === currentParentId,
      )
    ) {
      return true;
    }

    currentParentId =
      departments.find(department => department.id === currentParentId)?.parentId ?? null;
  }

  return false;
};

/**
 * 规范化组织范围授权主体。
 * 若已经选择企业根节点，则只保留“全公司”这一项；若已选择父部门，则移除其下级部门。
 */
export const normalizeAccessScopeSubjects = (
  subjects: AccessScopeSubject[],
  departments: OrganizationDepartmentItem[],
): AccessScopeSubject[] => {
  const deduplicatedSubjects = subjects.filter((subject, index) => {
    const currentKey = createSubjectKey(subject.subjectType, subject.subjectId);

    return (
      subjects.findIndex(
        item => createSubjectKey(item.subjectType, item.subjectId) === currentKey,
      ) === index
    );
  });

  if (deduplicatedSubjects.some(subject => subject.subjectType === "company")) {
    return [
      {
        subjectId: COMPANY_SCOPE_SUBJECT_ID,
        subjectName: COMPANY_SCOPE_SUBJECT_NAME,
        subjectType: "company",
      },
    ];
  }

  return deduplicatedSubjects.filter(
    subject => !hasDepartmentAncestor(subject, deduplicatedSubjects, departments),
  );
};

/**
 * 将部门与用户组织成树结构。
 */
export const buildOrganizationTree = (
  departments: OrganizationDepartmentItem[],
  users: FrontisWebUserItem[],
): OrganizationTreeNode[] => {
  const buildDepartmentNode = (department: OrganizationDepartmentItem): OrganizationTreeNode => ({
    children: [
      ...departments
        .filter(item => item.parentId === department.id)
        .map(item => buildDepartmentNode(item)),
      ...users
        .filter(user => user.departmentId === department.id)
        .map<OrganizationTreeNode>(user => ({
          id: user.id,
          name: user.name,
          type: "user",
        })),
    ],
    id: department.id,
    name: department.name,
    type: "department",
  });

  return [
    {
      children: departments
        .filter(department => department.parentId === null)
        .map(department => buildDepartmentNode(department)),
      id: COMPANY_SCOPE_SUBJECT_ID,
      name: COMPANY_SCOPE_SUBJECT_NAME,
      type: "company",
    },
  ];
};

/**
 * 将组织树主体映射为可快速检索的字典。
 */
export const buildAccessScopeSubjectLookup = (
  departments: OrganizationDepartmentItem[],
  users: FrontisWebUserItem[],
): Record<string, AccessScopeSubject> => {
  const companySubject: AccessScopeSubject = {
    subjectId: COMPANY_SCOPE_SUBJECT_ID,
    subjectName: COMPANY_SCOPE_SUBJECT_NAME,
    subjectType: "company",
  };

  return {
    [createSubjectKey(companySubject.subjectType, companySubject.subjectId)]: companySubject,
    ...Object.fromEntries(
      departments.map(department => [
        createSubjectKey("department", department.id),
        {
          subjectId: department.id,
          subjectName: department.name,
          subjectType: "department" as const,
        },
      ]),
    ),
    ...Object.fromEntries(
      users.map(user => [
        createSubjectKey("user", user.id),
        {
          subjectId: user.id,
          subjectName: user.name,
          subjectType: "user" as const,
        },
      ]),
    ),
  };
};

/**
 * 根据组织范围授权主体，展开得到实际命中的用户 ID。
 */
export const resolveUserIdsFromAccessScope = (
  subjects: AccessScopeSubject[],
  users: FrontisWebUserItem[],
  departments: OrganizationDepartmentItem[],
): string[] => {
  const normalizedSubjects = normalizeAccessScopeSubjects(subjects, departments);

  if (normalizedSubjects.some(subject => subject.subjectType === "company")) {
    return users.map(user => user.id);
  }

  const matchedUserIds = new Set<string>();

  normalizedSubjects.forEach(subject => {
    if (subject.subjectType === "user") {
      matchedUserIds.add(subject.subjectId);
      return;
    }

    if (subject.subjectType === "department") {
      const departmentIds = collectDescendantDepartmentIds(subject.subjectId, departments);
      users
        .filter(user => departmentIds.has(user.departmentId))
        .forEach(user => matchedUserIds.add(user.id));
    }
  });

  return Array.from(matchedUserIds);
};

/**
 * 判断指定用户是否命中组织范围授权。
 */
export const hasUserInAccessScope = (
  user: FrontisWebUserItem,
  subjects: AccessScopeSubject[],
  users: FrontisWebUserItem[],
  departments: OrganizationDepartmentItem[],
): boolean => resolveUserIdsFromAccessScope(subjects, users, departments).includes(user.id);

/**
 * 生成组织范围摘要，用于页面卡片与详情展示。
 */
export const buildAccessScopeSummary = (subjects: AccessScopeSubject[]): string => {
  if (!subjects.length) {
    return "未配置组织范围";
  }

  if (subjects.some(subject => subject.subjectType === "company")) {
    return "全公司";
  }

  const subjectNames = subjects.map(subject => subject.subjectName);

  if (subjectNames.length <= 2) {
    return subjectNames.join("、");
  }

  return `${subjectNames.slice(0, 2).join("、")}等 ${subjectNames.length} 个主体`;
};
