import { useCallback, useMemo, useState } from "react";

import { ImportOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Avatar, Button, Empty, Input, Modal, Select, message } from "antd";

import type {
  FdeTeamMemberDraft,
  FdeTeamMemberItem,
  FdeWorkbenchRole,
} from "@/feature/fde/types";
import { getFdeAvatarUrl } from "@/feature/fde/utils";

import styles from "./FdeTeamManagementView.module.less";

interface FdeTeamManagementViewProps {
  activeMember: FdeTeamMemberItem;
  items: FdeTeamMemberItem[];
  canManageMembers: boolean;
  addTeamMember: (payload: FdeTeamMemberDraft) => void;
  importTeamMembers: (payloads: FdeTeamMemberDraft[]) => void;
  removeTeamMember: (memberId: string) => void;
  toggleTeamMemberStatus: (memberId: string) => void;
  updateTeamMember: (memberId: string, payload: FdeTeamMemberDraft) => void;
}

interface MemberFormState {
  name: string;
  phone: string;
  role: FdeWorkbenchRole;
}

const ROLE_OPTIONS: Array<{ label: string; value: FdeWorkbenchRole }> = [
  { label: "团队负责人", value: "leader" },
  { label: "团队管理员", value: "admin" },
  { label: "普通成员", value: "member" },
];

const getRoleLabel = (role: FdeWorkbenchRole): string => {
  if (role === "leader") {
    return "团队负责人";
  }

  if (role === "admin") {
    return "团队管理员";
  }

  return "普通成员";
};

const getRoleClassName = (role: FdeWorkbenchRole): string => {
  if (role === "leader") {
    return styles.roleLeader;
  }

  if (role === "admin") {
    return styles.roleAdmin;
  }

  return styles.roleMember;
};

const getAccountStatusLabel = (member: FdeTeamMemberItem): string =>
  member.accountStatus === "disabled" ? "已禁用" : "正常";

const getAccountStatusClassName = (member: FdeTeamMemberItem): string =>
  member.accountStatus === "disabled" ? styles.accountDisabled : styles.accountEnabled;

const getDefaultPermissionKeys = (role: FdeWorkbenchRole): FdeTeamMemberDraft["permissionKeys"] => {
  if (role === "leader" || role === "admin") {
    return [
      "delivery",
      "operations",
      "teamManagement",
      "versionManagement",
      "agentDev",
      "skillMarket",
      "agentStore",
    ];
  }

  return ["delivery", "operations", "versionManagement"];
};

const createMemberDraft = (formState: MemberFormState): FdeTeamMemberDraft => ({
  name: formState.name.trim(),
  title: "",
  phone: formState.phone.trim(),
  role: formState.role,
  permissionKeys: getDefaultPermissionKeys(formState.role),
  focusScenes: [],
});

const createMemberFormState = (member?: FdeTeamMemberItem): MemberFormState => ({
  name: member?.name ?? "",
  phone: member?.phone ?? "",
  role: member?.role ?? "member",
});

const parseImportedMembers = (value: string): FdeTeamMemberDraft[] =>
  value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name = "", phone = "", roleLabel = ""] = line.split(/[，,]/).map(item => item.trim());

      let role: FdeWorkbenchRole = "member";
      if (roleLabel.includes("负责人")) {
        role = "leader";
      } else if (roleLabel.includes("管理")) {
        role = "admin";
      }

      return createMemberDraft({
        name,
        phone,
        role,
      });
    })
    .filter(item => item.name && item.phone);

/**
 * FDE 成员管理页面。
 */
export const FdeTeamManagementView = ({
  activeMember,
  items,
  canManageMembers,
  addTeamMember,
  importTeamMembers,
  removeTeamMember,
  toggleTeamMemberStatus,
  updateTeamMember,
}: FdeTeamManagementViewProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<FdeTeamMemberItem | null>(null);
  const [createForm, setCreateForm] = useState<MemberFormState>(createMemberFormState());
  const [editForm, setEditForm] = useState<MemberFormState>(createMemberFormState());
  const [importText, setImportText] = useState<string>("");

  const filteredMembers = useMemo<FdeTeamMemberItem[]>(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return items;
    }

    return items.filter(item => {
      const roleLabel = getRoleLabel(item.role).toLowerCase();
      const statusLabel = getAccountStatusLabel(item).toLowerCase();

      return (
        item.name.toLowerCase().includes(normalizedKeyword) ||
        item.phone.toLowerCase().includes(normalizedKeyword) ||
        roleLabel.includes(normalizedKeyword) ||
        statusLabel.includes(normalizedKeyword)
      );
    });
  }, [items, keyword]);

  const handleOpenEdit = useCallback((member: FdeTeamMemberItem): void => {
    setEditingMember(member);
    setEditForm(createMemberFormState(member));
  }, []);

  const handleCreateMember = useCallback((): void => {
    const payload = createMemberDraft(createForm);

    if (!payload.name || !payload.phone) {
      message.warning("请先补齐成员姓名和手机号。");
      return;
    }

    addTeamMember(payload);
    setIsCreateModalOpen(false);
    setCreateForm(createMemberFormState());
    message.success("成员已添加。");
  }, [addTeamMember, createForm]);

  const handleSaveEdit = useCallback((): void => {
    if (!editingMember) {
      return;
    }

    const payload = createMemberDraft(editForm);

    if (!payload.name || !payload.phone) {
      message.warning("请先补齐成员姓名和手机号。");
      return;
    }

    updateTeamMember(editingMember.id, payload);
    setEditingMember(null);
    message.success("成员已更新。");
  }, [editForm, editingMember, updateTeamMember]);

  const handleImportMembers = useCallback((): void => {
    const payloads = parseImportedMembers(importText);

    if (!payloads.length) {
      message.warning("请按示例格式填写导入内容。");
      return;
    }

    importTeamMembers(payloads);
    setImportText("");
    setIsImportModalOpen(false);
    message.success(`已导入 ${payloads.length} 位成员。`);
  }, [importTeamMembers, importText]);

  const handleRemoveMember = useCallback(
    (member: FdeTeamMemberItem): void => {
      if (items.length <= 1) {
        message.warning("至少保留一位团队成员。");
        return;
      }

      Modal.confirm({
        title: "移除成员",
        content: `确认移除成员 ${member.name} 吗？`,
        okText: "确认移除",
        cancelText: "取消",
        onOk: () => {
          removeTeamMember(member.id);
          message.success("成员已移除。");
        },
      });
    },
    [items.length, removeTeamMember],
  );

  const handleToggleStatus = useCallback(
    (member: FdeTeamMemberItem): void => {
      toggleTeamMemberStatus(member.id);
      message.success(member.accountStatus === "disabled" ? "成员已启用。" : "成员已禁用。");
    },
    [toggleTeamMemberStatus],
  );

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          allowClear
          value={keyword}
          placeholder="搜索成员姓名、手机号或角色"
          prefix={<SearchOutlined />}
          onChange={event => setKeyword(event.target.value)}
        />
        <div className={styles.toolbarActions}>
          <Button
            icon={<ImportOutlined />}
            disabled={!canManageMembers}
            onClick={() => setIsImportModalOpen(true)}
          >
            导入成员
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageMembers}
            onClick={() => setIsCreateModalOpen(true)}
          >
            添加成员
          </Button>
        </div>
      </div>

      {!canManageMembers ? (
        <div className={styles.noticeBar}>
          当前为普通成员视角，只能查看成员列表，不能添加、导入、编辑、禁用或移除成员。
        </div>
      ) : null}

      <div className={styles.tableHeader}>
        <span>成员</span>
        <span>角色</span>
        <span>手机号</span>
        <span>状态</span>
        <span>添加方式</span>
        <span>加入时间</span>
        <span>操作</span>
      </div>

      {filteredMembers.length ? (
        filteredMembers.map(item => (
          <div key={item.id} className={styles.tableRow}>
            <div className={styles.memberCell}>
              <Avatar
                className={styles.memberAvatar}
                size={40}
                src={getFdeAvatarUrl(item.avatarSeed)}
              />
              <div className={styles.memberInfo}>
                <div className={styles.memberNameRow}>
                  <span className={styles.memberName}>{item.name}</span>
                  {item.id === activeMember.id ? (
                    <span className={styles.currentTag}>当前视角</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <span className={classNames(styles.roleTag, getRoleClassName(item.role))}>
                {getRoleLabel(item.role)}
              </span>
            </div>
            <span className={styles.cellText}>{item.phone}</span>
            <div>
              <span
                className={classNames(
                  styles.accountTag,
                  getAccountStatusClassName(item),
                )}
              >
                {getAccountStatusLabel(item)}
              </span>
            </div>
            <span className={styles.cellText}>{item.sourceLabel}</span>
            <span className={styles.cellText}>{item.joinedAt}</span>
            <div className={styles.rowActions}>
              <Button disabled={!canManageMembers} onClick={() => handleOpenEdit(item)}>
                编辑
              </Button>
              <Button
                disabled={!canManageMembers || item.id === activeMember.id}
                onClick={() => handleToggleStatus(item)}
              >
                {item.accountStatus === "disabled" ? "启用" : "禁用"}
              </Button>
              <Button
                danger
                disabled={!canManageMembers || item.id === activeMember.id}
                onClick={() => handleRemoveMember(item)}
              >
                移除
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.emptyState}>
          <Empty description="未找到匹配的团队成员" />
        </div>
      )}

      <Modal
        open={isCreateModalOpen}
        title="添加成员"
        okText="确认添加"
        cancelText="取消"
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateMember}
      >
        <div className={styles.modalForm}>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>成员姓名</span>
            <Input
              value={createForm.name}
              onChange={event =>
                setCreateForm(previous => ({ ...previous, name: event.target.value }))
              }
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>手机号</span>
            <Input
              value={createForm.phone}
              onChange={event =>
                setCreateForm(previous => ({ ...previous, phone: event.target.value }))
              }
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>成员角色</span>
            <Select<FdeWorkbenchRole>
              value={createForm.role}
              options={ROLE_OPTIONS}
              onChange={value => setCreateForm(previous => ({ ...previous, role: value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingMember)}
        title="编辑成员"
        okText="保存"
        cancelText="取消"
        onCancel={() => setEditingMember(null)}
        onOk={handleSaveEdit}
      >
        <div className={styles.modalForm}>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>成员姓名</span>
            <Input
              value={editForm.name}
              onChange={event =>
                setEditForm(previous => ({ ...previous, name: event.target.value }))
              }
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>手机号</span>
            <Input
              value={editForm.phone}
              onChange={event =>
                setEditForm(previous => ({ ...previous, phone: event.target.value }))
              }
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.fieldLabel}>成员角色</span>
            <Select<FdeWorkbenchRole>
              value={editForm.role}
              options={ROLE_OPTIONS}
              onChange={value => setEditForm(previous => ({ ...previous, role: value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={isImportModalOpen}
        title="导入成员"
        okText="确认导入"
        cancelText="取消"
        onCancel={() => setIsImportModalOpen(false)}
        onOk={handleImportMembers}
      >
        <div className={styles.importIntro}>按行填写：姓名，手机号，角色</div>
        <Input.TextArea
          className={styles.importTextArea}
          value={importText}
          rows={8}
          placeholder={`示例：\n李青，13800000001，普通成员\n周宁，13800000002，团队管理员`}
          onChange={event => setImportText(event.target.value)}
        />
      </Modal>
    </div>
  );
};
