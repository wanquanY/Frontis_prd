import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, message } from "antd";

import type {
  FdeOrgNodeItem,
  FdeTeamMemberDraft,
  FdeTeamMemberItem,
} from "@/feature/fde/types";

import styles from "./FdeOrgManagementView.module.less";

interface FdeOrgManagementViewProps {
  orgNodes: FdeOrgNodeItem[];
  teamMembers: FdeTeamMemberItem[];
  canManage: boolean;
  addOrgNode: (node: FdeOrgNodeItem) => void;
  updateOrgNode: (nodeId: string, updates: Partial<Pick<FdeOrgNodeItem, "name">>) => void;
  removeOrgNode: (nodeId: string) => void;
  setOrgNodeLeader: (nodeId: string, memberId: string | null) => void;
  addTeamMember: (payload: FdeTeamMemberDraft) => void;
  importTeamMembers: (payloads: FdeTeamMemberDraft[]) => void;
  removeTeamMember: (memberId: string) => void;
  toggleTeamMemberStatus: (memberId: string) => void;
  updateTeamMember: (memberId: string, payload: FdeTeamMemberDraft) => void;
}

/* ─── 树工具函数 ─── */

const getChildNodes = (nodes: FdeOrgNodeItem[], parentId: string): FdeOrgNodeItem[] =>
  nodes.filter(n => n.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

const getNodeDepth = (nodes: FdeOrgNodeItem[], nodeId: string): number => {
  let depth = 0;
  let cur = nodes.find(n => n.id === nodeId);
  while (cur?.parentId) {
    depth += 1;
    cur = nodes.find(n => n.id === cur!.parentId);
  }
  return depth;
};

const getNodePath = (nodes: FdeOrgNodeItem[], nodeId: string): string => {
  const parts: string[] = [];
  let cur = nodes.find(n => n.id === nodeId);
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parentId ? nodes.find(n => n.id === cur!.parentId) : undefined;
  }
  return parts.join(" / ");
};

const getTreeDepth = (nodes: FdeOrgNodeItem[], rootId: string): number => {
  const children = getChildNodes(nodes, rootId);
  if (!children.length) return 1;
  return 1 + Math.max(...children.map(c => getTreeDepth(nodes, c.id)));
};

const getDescendantIds = (nodes: FdeOrgNodeItem[], rootId: string): Set<string> => {
  const result = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next: string[] = [];
    for (const n of nodes) {
      if (n.parentId && frontier.includes(n.parentId) && !result.has(n.id)) {
        result.add(n.id);
        next.push(n.id);
      }
    }
    frontier = next;
  }
  return result;
};

const getMembersForNode = (
  members: FdeTeamMemberItem[],
  nodeId: string,
): FdeTeamMemberItem[] => members.filter(m => m.orgNodeId === nodeId);

const getRootOrgName = (
  nodes: FdeOrgNodeItem[],
  member: FdeTeamMemberItem,
): string => {
  if (!member.orgNodeId) return "-";
  let cur = nodes.find(n => n.id === member.orgNodeId);
  while (cur?.parentId) {
    cur = nodes.find(n => n.id === cur!.parentId);
  }
  return cur?.name ?? "-";
};

/**
 * FDE 组织管理视图（人员管理）。
 */
export const FdeOrgManagementView = ({
  orgNodes,
  teamMembers,
  canManage,
  addOrgNode,
  updateOrgNode,
  removeOrgNode,
  setOrgNodeLeader,
  addTeamMember,
  importTeamMembers,
  removeTeamMember,
  toggleTeamMemberStatus,
  updateTeamMember,
}: FdeOrgManagementViewProps): JSX.Element => {
  const rootNodes = useMemo(
    () => orgNodes.filter(n => !n.parentId).sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [orgNodes],
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    () => rootNodes[0]?.id ?? "",
  );
  const selectedNode = useMemo(
    () => orgNodes.find(n => n.id === selectedNodeId) ?? rootNodes[0] ?? null,
    [orgNodes, rootNodes, selectedNodeId],
  );

  /* ─── Modal state ─── */
  const [isNodeCreateOpen, setIsNodeCreateOpen] = useState(false);
  const [isNodeEditOpen, setIsNodeEditOpen] = useState(false);
  const [isMemberAddOpen, setIsMemberAddOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isMemberEditOpen, setIsMemberEditOpen] = useState(false);

  const [draftNodeName, setDraftNodeName] = useState("");
  const [draftMemberName, setDraftMemberName] = useState("");
  const [draftMemberPhone, setDraftMemberPhone] = useState("");
  const [editingMember, setEditingMember] = useState<FdeTeamMemberItem | null>(null);
  const [importText, setImportText] = useState("");

  /* ─── 派生数据 ─── */
  const isRootNode = selectedNode ? !selectedNode.parentId : false;
  const directChildren = useMemo(
    () => (selectedNode ? getChildNodes(orgNodes, selectedNode.id) : []),
    [orgNodes, selectedNode],
  );
  const directMembers = useMemo(
    () => (selectedNode ? getMembersForNode(teamMembers, selectedNode.id) : []),
    [selectedNode, teamMembers],
  );
  const leaderMember = useMemo(
    () =>
      selectedNode?.leaderMemberId
        ? teamMembers.find(m => m.id === selectedNode.leaderMemberId) ?? null
        : null,
    [selectedNode, teamMembers],
  );
  const treeDepth = useMemo(
    () => (selectedNode ? getTreeDepth(orgNodes, selectedNode.id) : 0),
    [orgNodes, selectedNode],
  );

  /* ─── 部门操作 ─── */
  const handleOpenNodeCreate = useCallback((): void => {
    setDraftNodeName("");
    setIsNodeCreateOpen(true);
  }, []);

  const handleSubmitNodeCreate = useCallback((): void => {
    const name = draftNodeName.trim();
    if (!name) {
      message.warning("请输入组织名称。");
      return;
    }
    const siblings = selectedNode
      ? getChildNodes(orgNodes, selectedNode.id)
      : rootNodes;
    if (siblings.some(n => n.name === name)) {
      message.warning("同级组织名称已存在。");
      return;
    }
    addOrgNode({
      id: `fde-org-${Date.now()}`,
      name,
      parentId: selectedNode?.id ?? null,
      leaderMemberId: null,
    });
    setIsNodeCreateOpen(false);
    message.success(`已创建组织：${name}`);
  }, [addOrgNode, draftNodeName, orgNodes, rootNodes, selectedNode]);

  const handleOpenNodeEdit = useCallback((): void => {
    if (!selectedNode) return;
    setDraftNodeName(selectedNode.name);
    setIsNodeEditOpen(true);
  }, [selectedNode]);

  const handleSubmitNodeEdit = useCallback((): void => {
    if (!selectedNode) return;
    const name = draftNodeName.trim();
    if (!name) {
      message.warning("请输入组织名称。");
      return;
    }
    updateOrgNode(selectedNode.id, { name });
    setIsNodeEditOpen(false);
    message.success(`已更新组织：${name}`);
  }, [draftNodeName, selectedNode, updateOrgNode]);

  const handleDeleteNode = useCallback((): void => {
    if (!selectedNode) return;
    if (!selectedNode.parentId) {
      message.warning("根组织仅支持在 CMS 维护。");
      return;
    }
    const children = getChildNodes(orgNodes, selectedNode.id);
    if (children.length) {
      message.warning("请先删除下级组织。");
      return;
    }
    const members = getMembersForNode(teamMembers, selectedNode.id);
    if (members.length) {
      message.warning("请先移除该组织下的成员。");
      return;
    }
    const parent = selectedNode.parentId;
    removeOrgNode(selectedNode.id);
    setSelectedNodeId(parent);
    message.success(`已删除组织：${selectedNode.name}`);
  }, [orgNodes, removeOrgNode, selectedNode, teamMembers]);

  /* ─── 成员操作 ─── */
  const handleOpenMemberAdd = useCallback((): void => {
    setDraftMemberName("");
    setDraftMemberPhone("");
    setIsMemberAddOpen(true);
  }, []);

  const handleSubmitMemberAdd = useCallback((): void => {
    const name = draftMemberName.trim();
    const phone = draftMemberPhone.trim();
    if (!name || !phone) {
      message.warning("请填写姓名和手机号。");
      return;
    }
    addTeamMember({
      name,
      phone,
      title: "FDE 员工",
      role: "member",
      permissionKeys: [],
      focusScenes: [],
    });
    setIsMemberAddOpen(false);
    message.success(`已添加成员：${name}`);
  }, [addTeamMember, draftMemberName, draftMemberPhone]);

  const handleOpenMemberEdit = useCallback((member: FdeTeamMemberItem): void => {
    setEditingMember(member);
    setDraftMemberName(member.name);
    setDraftMemberPhone(member.phone);
    setIsMemberEditOpen(true);
  }, []);

  const handleSubmitMemberEdit = useCallback((): void => {
    if (!editingMember) return;
    const name = draftMemberName.trim();
    if (!name) {
      message.warning("请填写姓名。");
      return;
    }
    updateTeamMember(editingMember.id, {
      name,
      phone: editingMember.phone,
      title: editingMember.title,
      role: editingMember.role,
      permissionKeys: editingMember.permissionKeys,
      focusScenes: editingMember.focusScenes,
    });
    setIsMemberEditOpen(false);
    setEditingMember(null);
    message.success(`已更新账号：${name}`);
  }, [draftMemberName, editingMember, updateTeamMember]);

  const handleSetLeader = useCallback(
    (memberId: string): void => {
      if (!selectedNode) return;
      if (!selectedNode.parentId) {
        message.warning("总负责人由 CMS 配置。");
        return;
      }
      const member = teamMembers.find(m => m.id === memberId);
      setOrgNodeLeader(selectedNode.id, memberId);
      message.success(`已设置 ${member?.name ?? ""} 为组负责人`);
    },
    [selectedNode, setOrgNodeLeader, teamMembers],
  );

  const handleToggleStatus = useCallback(
    (memberId: string): void => {
      const member = teamMembers.find(m => m.id === memberId);
      toggleTeamMemberStatus(memberId);
      const nextStatus = member?.accountStatus === "enabled" ? "停用" : "启用";
      message.success(`${member?.name ?? ""} 已${nextStatus}`);
    },
    [teamMembers, toggleTeamMemberStatus],
  );

  const handleRemoveMember = useCallback(
    (memberId: string): void => {
      if (!selectedNode) return;
      if (selectedNode.leaderMemberId === memberId) {
        message.warning("请先更换负责人后再移除。");
        return;
      }
      const member = teamMembers.find(m => m.id === memberId);
      removeTeamMember(memberId);
      message.success(`${member?.name ?? ""} 已移出当前部门。`);
    },
    [removeTeamMember, selectedNode, teamMembers],
  );

  const handleBatchImport = useCallback((): void => {
    const rows = importText
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);
    if (!rows.length) {
      message.warning("请输入导入内容。");
      return;
    }
    const drafts: FdeTeamMemberDraft[] = rows.map(row => {
      const [name = "", phone = ""] = row.split(",").map(s => s.trim());
      return {
        name: name || `导入成员`,
        phone: phone || "",
        title: "FDE 员工",
        role: "member" as const,
        permissionKeys: [],
        focusScenes: [],
      };
    });
    importTeamMembers(drafts);
    setImportText("");
    setIsBatchImportOpen(false);
    message.success(`已导入 ${drafts.length} 名成员`);
  }, [importTeamMembers, importText]);

  /* ─── 递归渲染组织树 ─── */
  const renderTree = (parentId: string | null, isRoot: boolean): JSX.Element | null => {
    const children = parentId === null
      ? rootNodes
      : getChildNodes(orgNodes, parentId);
    if (!children.length) return null;

    return (
      <ul className={classNames(styles.orgTree, isRoot && styles.orgTreeRoot)}>
        {children.map(node => {
          const depth = getNodeDepth(orgNodes, node.id);
          const levelLabel = depth === 0 ? "一级组织" : `第 ${depth + 1} 级`;
          const leader = node.leaderMemberId
            ? teamMembers.find(m => m.id === node.leaderMemberId)
            : null;
          const leaderLabel = !node.parentId
            ? leader
              ? `总负责人 ${leader.name}`
              : "待设置负责人"
            : leader
              ? `组负责人 ${leader.name}`
              : "待设置负责人";
          const directCount = getMembersForNode(teamMembers, node.id).length;
          const childCount = getChildNodes(orgNodes, node.id).length;

          return (
            <li key={node.id} className={styles.orgTreeItem}>
              <button
                type="button"
                className={classNames(
                  styles.orgTreeNode,
                  selectedNodeId === node.id && styles.orgTreeNodeActive,
                )}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className={styles.orgTreeNodeTitle}>
                  <span className={styles.pill}>{levelLabel}</span>
                  <span className={styles.orgTreeNodeName}>{node.name}</span>
                </div>
                <div className={styles.orgTreeNodePath}>
                  {getNodePath(orgNodes, node.id)}
                </div>
                <div className={styles.orgTreeNodeMeta}>
                  <span className={classNames(styles.pill, styles.pillPrimary)}>
                    {leaderLabel}
                  </span>
                  <span className={styles.pill}>直属成员 {directCount}</span>
                  <span className={styles.pill}>下级 {childCount}</span>
                </div>
              </button>
              {renderTree(node.id, false)}
            </li>
          );
        })}
      </ul>
    );
  };

  /* ─── 右栏：成员表行排序（负责人在前） ─── */
  const sortedMembers = useMemo(() => {
    const list = [...directMembers];
    list.sort((a, b) => {
      if (selectedNode?.leaderMemberId === a.id) return -1;
      if (selectedNode?.leaderMemberId === b.id) return 1;
      return a.name.localeCompare(b.name, "zh-CN");
    });
    return list;
  }, [directMembers, selectedNode]);

  return (
    <div className={styles.root}>
      <div className={styles.splitLayout}>
        {/* ─── 左栏：组织树 ─── */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>组织管理</h2>
          {canManage && (
            <div className={styles.toolbar}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenNodeCreate}>
                新增部门
              </Button>
            </div>
          )}
          {!canManage && (
            <div className={styles.toolbar}>
              <span className={styles.pill}>仅总负责人可配置组织结构</span>
            </div>
          )}
          {renderTree(null, true)}
          {!rootNodes.length && (
            <div className={styles.emptyRow}>暂无组织节点。</div>
          )}
        </div>

        {/* ─── 右栏：节点详情 ─── */}
        <div className={styles.sectionCard}>
          {selectedNode ? (
            <>
              <h2 className={styles.sectionTitle}>{selectedNode.name}</h2>

              {/* 指标卡片 */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>
                    {isRootNode ? "总负责人" : "组负责人"}
                  </span>
                  <span className={styles.metricValue}>
                    {leaderMember?.name ?? "待配置"}
                  </span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>层级数</span>
                  <span className={styles.metricValue}>{treeDepth}</span>
                  <span className={styles.metricHint}>以当前节点为根，含当前层</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>直属成员</span>
                  <span className={styles.metricValue}>{directMembers.length}</span>
                  <span className={styles.metricHint}>同一 FDE 组织内不可跨部门</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>下级部门</span>
                  <span className={styles.metricValue}>{directChildren.length}</span>
                  <span className={styles.metricHint}>
                    {canManage ? "支持无限层级" : "只读"}
                  </span>
                </div>
              </div>

              {/* 路径 */}
              <div className={styles.pathText}>
                {getNodePath(orgNodes, selectedNode.id)}
              </div>

              {/* 操作栏 */}
              {canManage && (
                <div className={styles.toolbar}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenMemberAdd}>
                    添加成员
                  </Button>
                  <Button icon={<ImportOutlined />} onClick={() => setIsBatchImportOpen(true)}>
                    批量导入
                  </Button>
                  <Button icon={<EditOutlined />} onClick={handleOpenNodeEdit}>
                    编辑部门
                  </Button>
                  {selectedNode.parentId ? (
                    <Popconfirm
                      title="确认删除此组织？"
                      description="有子组织或成员时无法删除"
                      onConfirm={handleDeleteNode}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        删除部门
                      </Button>
                    </Popconfirm>
                  ) : (
                    <span className={classNames(styles.pill, styles.pillPrimary)}>
                      顶层组织与总负责人由 CMS 维护
                    </span>
                  )}
                </div>
              )}
              {!canManage && (
                <div className={styles.toolbar}>
                  <span className={styles.pill}>当前为只读视图</span>
                </div>
              )}

              {/* 成员表 */}
              <table className={styles.memberTable}>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>工号</th>
                    <th>手机号</th>
                    <th>角色</th>
                    <th>所属 FDE 组织</th>
                    <th>状态</th>
                    {canManage && <th>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.length ? (
                    sortedMembers.map(member => {
                      const isLeader = selectedNode.leaderMemberId === member.id;
                      const roleLabel = isLeader
                        ? (isRootNode ? "FDE 团队负责人" : "FDE 小组负责人")
                        : "FDE 员工";
                      const roleClass = isLeader ? styles.roleFdeLeader : styles.roleFdeEmployee;

                      return (
                        <tr key={member.id}>
                          <td className={styles.nameCell}>{member.name}</td>
                          <td>{member.employeeNo ?? "-"}</td>
                          <td>{member.phone}</td>
                          <td>
                            <span className={classNames(styles.pill, roleClass)}>
                              {roleLabel}
                            </span>
                          </td>
                          <td>{getRootOrgName(orgNodes, member)}</td>
                          <td>
                            <span
                              className={classNames(
                                styles.pill,
                                member.accountStatus === "enabled"
                                  ? styles.statusEnabled
                                  : styles.statusDisabled,
                              )}
                            >
                              {member.accountStatus === "enabled" ? "启用" : "停用"}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              <div className={styles.actionsCell}>
                                <Button size="small" onClick={() => handleOpenMemberEdit(member)}>
                                  编辑
                                </Button>
                                {!isRootNode &&
                                  !isLeader &&
                                  member.accountStatus === "enabled" && (
                                    <Button
                                      size="small"
                                      onClick={() => handleSetLeader(member.id)}
                                    >
                                      设负责人
                                    </Button>
                                  )}
                                <Button
                                  size="small"
                                  danger={member.accountStatus === "enabled"}
                                  onClick={() => handleToggleStatus(member.id)}
                                >
                                  {member.accountStatus === "enabled" ? "停用" : "启用"}
                                </Button>
                                {isLeader ? (
                                  <span className={styles.pill}>
                                    {isRootNode ? "当前总负责人" : "当前组负责人"}
                                  </span>
                                ) : (
                                  <Popconfirm
                                    title={`确认移除 ${member.name}？`}
                                    onConfirm={() => handleRemoveMember(member.id)}
                                    okText="确认"
                                    cancelText="取消"
                                  >
                                    <Button size="small" danger>
                                      移除
                                    </Button>
                                  </Popconfirm>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={canManage ? 7 : 6}>
                        <div className={styles.emptyRow}>当前部门暂无直属成员</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <div className={styles.emptyRow}>请在左侧选择一个组织节点</div>
          )}
        </div>
      </div>

      {/* ─── Modal: 新增组织 ─── */}
      <Modal
        title="新增组织"
        open={isNodeCreateOpen}
        okText="创建"
        cancelText="取消"
        onCancel={() => setIsNodeCreateOpen(false)}
        onOk={handleSubmitNodeCreate}
      >
        <div className={styles.formRows}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>上级组织</span>
            <span className={styles.formValue}>
              {selectedNode ? getNodePath(orgNodes, selectedNode.id) : "顶级"}
            </span>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>组织名称</span>
            <Input
              placeholder="请输入组织名称"
              value={draftNodeName}
              onChange={e => setDraftNodeName(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Modal: 编辑组织 ─── */}
      <Modal
        title="编辑组织"
        open={isNodeEditOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => setIsNodeEditOpen(false)}
        onOk={handleSubmitNodeEdit}
      >
        <div className={styles.formRows}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>组织名称</span>
            <Input
              placeholder="请输入组织名称"
              value={draftNodeName}
              onChange={e => setDraftNodeName(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Modal: 添加 FDE 成员 ─── */}
      <Modal
        title="添加 FDE 成员"
        open={isMemberAddOpen}
        okText="添加成员"
        cancelText="取消"
        onCancel={() => setIsMemberAddOpen(false)}
        onOk={handleSubmitMemberAdd}
      >
        <div className={styles.formRows}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>当前部门</span>
            <Input disabled value={selectedNode?.name ?? ""} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>姓名</span>
            <Input
              placeholder="请输入姓名"
              value={draftMemberName}
              onChange={e => setDraftMemberName(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>手机号</span>
            <Input
              placeholder="请输入手机号"
              value={draftMemberPhone}
              onChange={e => setDraftMemberPhone(e.target.value)}
            />
          </div>
          <div className={styles.formHint}>
            FDE 成员需手动创建或通过批量导入生成；同一 FDE 组织内，一个成员只能在一个部门。
          </div>
        </div>
      </Modal>

      {/* ─── Modal: 批量导入 ─── */}
      <Modal
        title="批量导入 FDE 成员"
        open={isBatchImportOpen}
        okText="开始导入"
        cancelText="取消"
        onCancel={() => setIsBatchImportOpen(false)}
        onOk={handleBatchImport}
      >
        <div className={styles.formRows}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>目标部门</span>
            <Input disabled value={selectedNode?.name ?? ""} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>粘贴内容</span>
            <Input.TextArea
              rows={8}
              placeholder={"每行一条：姓名,手机号"}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
          </div>
          <div className={styles.formHint}>
            本期 demo 支持直接粘贴数据导入，也支持选择 Excel/CSV 文件模拟导入。
          </div>
        </div>
      </Modal>

      {/* ─── Modal: 编辑 FDE 账号 ─── */}
      <Modal
        title="编辑 FDE 账号"
        open={isMemberEditOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => {
          setIsMemberEditOpen(false);
          setEditingMember(null);
        }}
        onOk={handleSubmitMemberEdit}
      >
        {editingMember && (
          <div className={styles.formRows}>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>姓名</span>
              <Input
                placeholder="请输入姓名"
                value={draftMemberName}
                onChange={e => setDraftMemberName(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>手机号</span>
              <Input
                placeholder="请输入手机号"
                value={draftMemberPhone}
                onChange={e => setDraftMemberPhone(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>工号</span>
              <Input disabled value={editingMember.employeeNo ?? "-"} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
