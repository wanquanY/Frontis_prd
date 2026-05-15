import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Input, QRCode, Select, Switch, message } from "antd";
import classNames from "classnames";

import { TENANT_ROLE_PERMISSION_GROUPS } from "@/constants/tenantRolePermissions";
import type {
  OperationsCommunityGroupConfig,
  OperationsRegistrationStrategy,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

interface OperationsPlatformConfigConsoleProps {
  communityGroupConfig: OperationsCommunityGroupConfig;
  registrationStrategy: OperationsRegistrationStrategy;
  onUpdateCommunityGroupConfig: (
    config: Pick<
      OperationsCommunityGroupConfig,
      "enabled" | "groupName" | "qrCodeValue" | "description"
    >,
  ) => void;
  onUpdateRegistrationStrategy: (
    config: Pick<OperationsRegistrationStrategy, "enabled" | "initialPermissionIds">,
  ) => void;
}

type PlatformConfigTabKey = "communityGroup" | "registration";

const COMMUNITY_GROUP_FIELD_IDS = {
  enabled: "operations-community-group-enabled",
  groupName: "operations-community-group-name",
  qrCodeValue: "operations-community-group-qrcode",
  description: "operations-community-group-description",
} as const;

const REGISTRATION_FIELD_IDS = {
  enabled: "operations-registration-enabled",
  template: "operations-registration-template",
} as const;

const PLATFORM_CONFIG_TABS: Array<{ key: PlatformConfigTabKey; label: string }> = [
  { key: "communityGroup", label: "用户交流群" },
  { key: "registration", label: "新用户注册" },
];

const PERMISSION_LABEL_MAP = new Map<string, string>(
  TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
    group.menus.flatMap(menu => menu.items.map(item => [item.id, item.label] as const)),
  ),
);

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getPermissionLabel = (permissionId: string): string =>
  PERMISSION_LABEL_MAP.get(permissionId) ?? permissionId;

const buildStatusClassName = (tone?: "primary" | "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "primary" && adminStyles.consoleStatusTagPrimary,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

/**
 * 运营配置控制台，承载用户交流群与新用户注册配置。
 */
export const OperationsPlatformConfigConsole = ({
  communityGroupConfig,
  registrationStrategy,
  onUpdateCommunityGroupConfig,
  onUpdateRegistrationStrategy,
}: OperationsPlatformConfigConsoleProps): JSX.Element => {
  const [communityDraft, setCommunityDraft] =
    useState<OperationsCommunityGroupConfig>(communityGroupConfig);
  const [registrationDraft, setRegistrationDraft] =
    useState<OperationsRegistrationStrategy>(registrationStrategy);
  const [activeConfigTab, setActiveConfigTab] = useState<PlatformConfigTabKey>("communityGroup");

  useEffect(() => {
    setCommunityDraft(communityGroupConfig);
  }, [communityGroupConfig]);

  useEffect(() => {
    setRegistrationDraft(registrationStrategy);
  }, [registrationStrategy]);

  const registrationPermissionOptions = useMemo(
    () =>
      TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
        group.menus.flatMap(menu =>
          menu.items.map(item => ({
            label: `${group.title} / ${menu.title} / ${item.label}`,
            value: item.id,
          })),
        ),
      ),
    [],
  );
  const selectedInitialPermissionIds = useMemo(
    () =>
      registrationDraft.initialPermissionIds.filter(permissionId =>
        registrationPermissionOptions.some(option => option.value === permissionId),
      ),
    [registrationDraft.initialPermissionIds, registrationPermissionOptions],
  );
  const addableRegistrationPermissionOptions = useMemo(
    () =>
      registrationPermissionOptions.filter(
        option => !selectedInitialPermissionIds.includes(option.value),
      ),
    [registrationPermissionOptions, selectedInitialPermissionIds],
  );
  const selectedInitialPermissions = useMemo(
    () =>
      selectedInitialPermissionIds.map(permissionId => ({
        id: permissionId,
        label: getPermissionLabel(permissionId),
      })),
    [selectedInitialPermissionIds],
  );
  const communityLinkStatus =
    communityDraft.qrCodeValue.trim() && !isValidHttpUrl(communityDraft.qrCodeValue.trim())
      ? "error"
      : undefined;

  const handleSaveCommunityGroup = useCallback((): void => {
    if (!communityDraft.groupName.trim()) {
      message.warning("请填写交流群名称。");
      return;
    }

    if (communityDraft.enabled && !communityDraft.qrCodeValue.trim()) {
      message.warning("启用交流群入口前，请先填写入群链接。");
      return;
    }

    if (communityDraft.enabled && !isValidHttpUrl(communityDraft.qrCodeValue.trim())) {
      message.warning("请填写以 http:// 或 https:// 开头的入群链接。");
      return;
    }

    onUpdateCommunityGroupConfig({
      enabled: communityDraft.enabled,
      groupName: communityDraft.groupName,
      qrCodeValue: communityDraft.qrCodeValue,
      description: communityDraft.description,
    });
    message.success("用户交流群配置已保存。");
  }, [communityDraft, onUpdateCommunityGroupConfig]);

  const handleSaveRegistrationStrategy = useCallback((): void => {
    if (registrationDraft.enabled && !selectedInitialPermissionIds.length) {
      message.warning("请至少保留一个新用户初始化能力。");
      return;
    }

    onUpdateRegistrationStrategy({
      enabled: registrationDraft.enabled,
      initialPermissionIds: selectedInitialPermissionIds,
    });
    message.success("新用户注册配置已保存。");
  }, [onUpdateRegistrationStrategy, registrationDraft.enabled, selectedInitialPermissionIds]);

  const handleAddInitialPermission = useCallback((permissionId: string): void => {
    setRegistrationDraft(currentDraft => {
      if (currentDraft.initialPermissionIds.includes(permissionId)) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        initialPermissionIds: [...currentDraft.initialPermissionIds, permissionId],
      };
    });
  }, []);

  const handleRemoveInitialPermission = useCallback((permissionId: string): void => {
    setRegistrationDraft(currentDraft => {
      return {
        ...currentDraft,
        initialPermissionIds: currentDraft.initialPermissionIds.filter(
          item => item !== permissionId,
        ),
      };
    });
  }, []);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>运营配置</h1>
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {PLATFORM_CONFIG_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(
              styles.detailTabButton,
              activeConfigTab === tab.key && styles.detailTabButtonActive,
            )}
            onClick={() => setActiveConfigTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeConfigTab === "communityGroup" ? (
        <section className={adminStyles.consoleSection}>
          <div className={styles.platformConfigStack}>
            <div className={styles.platformConfigForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={COMMUNITY_GROUP_FIELD_IDS.enabled}>
                  启用状态
                </label>
                <div className={styles.statusSwitchRow}>
                  <Switch
                    id={COMMUNITY_GROUP_FIELD_IDS.enabled}
                    checked={communityDraft.enabled}
                    onChange={nextValue =>
                      setCommunityDraft(currentDraft => ({
                        ...currentDraft,
                        enabled: nextValue,
                      }))
                    }
                  />
                  <span className={styles.statusSwitchText}>
                    {communityDraft.enabled ? "用户账户弹窗展示入口" : "用户账户弹窗隐藏入口"}
                  </span>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={COMMUNITY_GROUP_FIELD_IDS.groupName}>
                  群名称
                </label>
                <Input
                  id={COMMUNITY_GROUP_FIELD_IDS.groupName}
                  value={communityDraft.groupName}
                  placeholder="如 FrontisAI 用户交流群"
                  onChange={event =>
                    setCommunityDraft(currentDraft => ({
                      ...currentDraft,
                      groupName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label
                  className={styles.modalLabel}
                  htmlFor={COMMUNITY_GROUP_FIELD_IDS.qrCodeValue}
                >
                  入群链接
                </label>
                <Input
                  id={COMMUNITY_GROUP_FIELD_IDS.qrCodeValue}
                  type="url"
                  value={communityDraft.qrCodeValue}
                  status={communityLinkStatus}
                  placeholder="https://example.com/community/invite"
                  onChange={event =>
                    setCommunityDraft(currentDraft => ({
                      ...currentDraft,
                      qrCodeValue: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={classNames(styles.modalField, styles.modalFieldWide)}>
                <label
                  className={styles.modalLabel}
                  htmlFor={COMMUNITY_GROUP_FIELD_IDS.description}
                >
                  弹窗说明
                </label>
                <Input.TextArea
                  id={COMMUNITY_GROUP_FIELD_IDS.description}
                  rows={4}
                  value={communityDraft.description}
                  placeholder="说明用户扫码后能获得什么帮助"
                  onChange={event =>
                    setCommunityDraft(currentDraft => ({
                      ...currentDraft,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <aside
              className={classNames(styles.serviceContactPreview, styles.platformConfigPreview)}
            >
              <div className={styles.serviceContactPreviewHeader}>
                <span className={styles.serviceContactPreviewTitle}>
                  {communityDraft.groupName}
                </span>
                <span
                  className={buildStatusClassName(communityDraft.enabled ? "success" : "danger")}
                >
                  {communityDraft.enabled ? "已启用" : "已停用"}
                </span>
              </div>
              <div className={styles.serviceContactQrBox}>
                {communityDraft.qrCodeValue.trim() && isValidHttpUrl(communityDraft.qrCodeValue) ? (
                  <QRCode value={communityDraft.qrCodeValue.trim()} size={168} bordered={false} />
                ) : (
                  <Empty description="暂无入群链接" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
              <p className={styles.serviceContactRemark}>
                {communityDraft.description.trim() || "保存后将在用户侧账户弹窗中展示。"}
              </p>
            </aside>

            <div className={styles.configFooterRow}>
              <Button type="primary" onClick={handleSaveCommunityGroup}>
                保存配置
              </Button>
              <span className={adminStyles.consoleInfoLabel}>
                上次更新：{communityGroupConfig.updatedAt}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {activeConfigTab === "registration" ? (
        <section className={adminStyles.consoleSection}>
          <div className={styles.platformConfigStack}>
            <div className={styles.platformConfigForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={REGISTRATION_FIELD_IDS.enabled}>
                  注册入口
                </label>
                <div className={styles.statusSwitchRow}>
                  <Switch
                    id={REGISTRATION_FIELD_IDS.enabled}
                    checked={registrationDraft.enabled}
                    onChange={nextValue =>
                      setRegistrationDraft(currentDraft => ({
                        ...currentDraft,
                        enabled: nextValue,
                      }))
                    }
                  />
                  <span className={styles.statusSwitchText}>
                    {registrationDraft.enabled ? "允许新用户自注册" : "关闭新用户自注册"}
                  </span>
                </div>
              </div>

              <div className={styles.modalField}>
                <span className={styles.modalLabel}>新用户初始模板</span>
                <div
                  id={REGISTRATION_FIELD_IDS.template}
                  className={styles.registrationTemplateCard}
                >
                  <div className={styles.registrationTemplateHeader}>
                    <span className={styles.registrationTemplateTitle}>新用户</span>
                    <span className={buildStatusClassName("success")}>初始化阶段</span>
                  </div>
                  <p className={styles.registrationTemplateDescription}>
                    注册完成时按下方能力生成初始权限；后续由租户内角色重新决定权限。
                  </p>
                  <div className={styles.registrationAbilityList}>
                    {selectedInitialPermissions.map(permission => (
                      <span key={permission.id} className={styles.registrationAbilityItem}>
                        <span className={styles.registrationAbilityLabel}>{permission.label}</span>
                        <button
                          type="button"
                          className={styles.registrationAbilityRemove}
                          aria-label={`移除${permission.label}`}
                          onClick={() => handleRemoveInitialPermission(permission.id)}
                        >
                          删除
                        </button>
                      </span>
                    ))}
                  </div>
                  <Select
                    className={styles.registrationAbilitySelect}
                    placeholder="添加初始化能力"
                    options={addableRegistrationPermissionOptions}
                    value={undefined}
                    showSearch={true}
                    optionFilterProp="label"
                    onChange={handleAddInitialPermission}
                  />
                </div>
              </div>
            </div>

            <div className={styles.configFooterRow}>
              <Button type="primary" onClick={handleSaveRegistrationStrategy}>
                保存配置
              </Button>
              <span className={adminStyles.consoleInfoLabel}>
                上次更新：{registrationStrategy.updatedAt}
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
