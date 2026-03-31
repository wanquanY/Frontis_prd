import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { message } from "antd";

import type { EmployeeItem } from "@/pages/types";

import type {
  OpenClawV2ChannelAccountItem,
  OpenClawV2ChannelField,
  OpenClawV2ChannelFormValue,
  OpenClawV2ChannelItem,
  OpenClawV2ChannelPairingItem,
} from "../openClawV2Mock";
import styles from "./OpenClawChannelsV2View.module.less";

interface OpenClawChannelsV2ViewProps {
  employees: EmployeeItem[];
  initialChannels: OpenClawV2ChannelItem[];
}

const cloneChannelFormValue = (value: OpenClawV2ChannelFormValue): OpenClawV2ChannelFormValue => {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
};

const cloneChannel = (item: OpenClawV2ChannelItem): OpenClawV2ChannelItem => ({
  ...item,
  ownerAgentIds: [...item.ownerAgentIds],
  formDraft: Object.fromEntries(
    Object.entries(item.formDraft).map(([key, value]) => [key, cloneChannelFormValue(value)]),
  ),
  fields: item.fields.map(field => ({
    ...field,
    options: field.options?.map(option => ({ ...option })),
  })),
  accounts: item.accounts.map(account => ({
    ...account,
    formDraft: Object.fromEntries(
      Object.entries(account.formDraft).map(([key, value]) => [key, cloneChannelFormValue(value)]),
    ),
    pairings: account.pairings.map(pairing => ({ ...pairing })),
  })),
  pairings: item.pairings.map(pairing => ({ ...pairing })),
  bindings: item.bindings.map(binding => ({ ...binding })),
});

const isArrayField = (
  value: OpenClawV2ChannelFormValue | undefined,
): value is string[] => Array.isArray(value);

const isBooleanField = (
  value: OpenClawV2ChannelFormValue | undefined,
): value is boolean => typeof value === "boolean";

const buildChannelStateFromAccounts = (
  item: OpenClawV2ChannelItem,
): Pick<
  OpenClawV2ChannelItem,
  "configured" | "statusText" | "tone" | "connectionText" | "ownerAgentIds"
> => {
  if (!item.accounts.length) {
    return {
      configured: item.configured,
      statusText: item.statusText,
      tone: item.tone,
      connectionText: item.connectionText,
      ownerAgentIds: item.ownerAgentIds,
    };
  }

  const connectedCount = item.accounts.filter(account => account.connected).length;
  const configuredCount = item.accounts.filter(
    account => account.connected || account.running || account.configured,
  ).length;
  const ownerAgentIds = Array.from(
    new Set(item.accounts.map(account => account.ownerAgentId).filter(Boolean)),
  );

  return {
    configured: configuredCount > 0,
    statusText: connectedCount > 0 ? "已配置" : configuredCount > 0 ? "待配置" : "未配置",
    tone: connectedCount > 0 ? "success" : configuredCount > 0 ? "warning" : "neutral",
    connectionText:
      connectedCount > 0
        ? `${connectedCount} 个机器人在线`
        : configuredCount > 0
          ? `${configuredCount} 个机器人已配置`
          : "没有连接",
    ownerAgentIds,
  };
};

interface ChannelFieldRendererProps {
  field: OpenClawV2ChannelField;
  value: OpenClawV2ChannelFormValue | undefined;
  onChange: (fieldKey: string, value: OpenClawV2ChannelFormValue) => void;
}

const ChannelFieldRenderer = ({
  field,
  value,
  onChange,
}: ChannelFieldRendererProps): JSX.Element => {
  if (field.kind === "array") {
    const lines = isArrayField(value) ? value.join("\n") : "";

    return (
      <label className={classNames(styles.bindField, styles.bindFieldWide)}>
        <span className={styles.bindFieldLabel}>
          {field.label}
          {field.required ? <em>*</em> : null}
        </span>
        <textarea
          className={classNames(styles.bindFieldControl, styles.bindFieldTextarea)}
          value={lines}
          placeholder={field.placeholder ?? "每行一个值"}
          onChange={event =>
            onChange(
              field.key,
              event.target.value
                .split("\n")
                .map(item => item.trim())
                .filter(Boolean),
            )
          }
        />
        {field.help ? <span className={styles.bindFieldHelp}>{field.help}</span> : null}
      </label>
    );
  }

  if (field.kind === "enum") {
    return (
      <label className={styles.bindField}>
        <span className={styles.bindFieldLabel}>
          {field.label}
          {field.required ? <em>*</em> : null}
        </span>
        <select
          className={styles.bindFieldControl}
          value={typeof value === "string" ? value : ""}
          onChange={event => onChange(field.key, event.target.value)}
        >
          <option value="">请选择</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.help ? <span className={styles.bindFieldHelp}>{field.help}</span> : null}
      </label>
    );
  }

  if (field.kind === "boolean") {
    return (
      <label className={styles.bindField}>
        <span className={styles.bindFieldLabel}>{field.label}</span>
        <label className={styles.boolField}>
          <input
            type="checkbox"
            checked={isBooleanField(value) ? value : false}
            onChange={event => onChange(field.key, event.target.checked)}
          />
          <span>启用</span>
        </label>
        {field.help ? <span className={styles.bindFieldHelp}>{field.help}</span> : null}
      </label>
    );
  }

  return (
    <label className={styles.bindField}>
      <span className={styles.bindFieldLabel}>
        {field.label}
        {field.required ? <em>*</em> : null}
      </span>
      <input
        className={styles.bindFieldControl}
        type={field.kind === "password" ? "password" : "text"}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder ?? ""}
        onChange={event => onChange(field.key, event.target.value)}
      />
      {field.help ? <span className={styles.bindFieldHelp}>{field.help}</span> : null}
    </label>
  );
};

/**
 * OpenClaw V2 远程连接页。
 */
export const OpenClawChannelsV2View = ({
  employees,
  initialChannels,
}: OpenClawChannelsV2ViewProps): JSX.Element => {
  const [channels, setChannels] = useState<OpenClawV2ChannelItem[]>(() =>
    initialChannels.map(cloneChannel),
  );
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    initialChannels[0]?.id ?? "",
  );
  const [advancedJsonEnabled, setAdvancedJsonEnabled] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  useEffect(() => {
    setChannels(initialChannels.map(cloneChannel));
  }, [initialChannels]);

  useEffect(() => {
    if (!channels.length) {
      setSelectedChannelId("");
      return;
    }

    if (channels.some(item => item.id === selectedChannelId)) {
      return;
    }

    setSelectedChannelId(channels[0].id);
  }, [channels, selectedChannelId]);

  const selectedChannel = useMemo(
    () => channels.find(item => item.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  useEffect(() => {
    if (!selectedChannel?.accounts.length) {
      setSelectedAccountId("");
      return;
    }

    if (selectedChannel.accounts.some(account => account.accountId === selectedAccountId)) {
      return;
    }

    setSelectedAccountId(selectedChannel.defaultAccountId ?? selectedChannel.accounts[0].accountId);
  }, [selectedAccountId, selectedChannel]);

  const selectedAccount = useMemo(() => {
    if (!selectedChannel?.accounts.length) {
      return null;
    }

    return (
      selectedChannel.accounts.find(account => account.accountId === selectedAccountId) ??
      selectedChannel.accounts[0] ??
      null
    );
  }, [selectedAccountId, selectedChannel]);

  const updateSelectedChannel = useCallback(
    (updater: (item: OpenClawV2ChannelItem) => OpenClawV2ChannelItem): void => {
      if (!selectedChannelId) {
        return;
      }

      setChannels(prev =>
        prev.map(item => (item.id === selectedChannelId ? updater(cloneChannel(item)) : item)),
      );
    },
    [selectedChannelId],
  );

  const handleFieldChange = useCallback(
    (fieldKey: string, value: OpenClawV2ChannelFormValue): void => {
      updateSelectedChannel(item => {
        if (selectedAccountId) {
          const nextItem: OpenClawV2ChannelItem = {
            ...item,
            accounts: item.accounts.map(account =>
              account.accountId === selectedAccountId
                ? {
                    ...account,
                    formDraft: {
                      ...account.formDraft,
                      [fieldKey]: cloneChannelFormValue(value),
                    },
                  }
                : account,
            ),
          };

          return {
            ...nextItem,
            ...buildChannelStateFromAccounts(nextItem),
          };
        }

        return {
          ...item,
          formDraft: {
            ...item.formDraft,
            [fieldKey]: cloneChannelFormValue(value),
          },
        };
      });
    },
    [selectedAccountId, updateSelectedChannel],
  );

  const handleSaveChannel = useCallback((): void => {
    if (!selectedChannel) {
      return;
    }

    updateSelectedChannel(item => {
      if (selectedAccountId) {
        const nextItem: OpenClawV2ChannelItem = {
          ...item,
          accounts: item.accounts.map(account =>
            account.accountId === selectedAccountId
              ? {
                  ...account,
                  configured: true,
                  connected: true,
                  running: true,
                  lastError: undefined,
                }
              : account,
          ),
        };

        return {
          ...nextItem,
          ...buildChannelStateFromAccounts(nextItem),
        };
      }

      return {
        ...item,
        configured: true,
        statusText: "已连接",
        tone: "success",
      };
    });
    message.success(
      `${selectedAccount?.label ?? selectedChannel.label} 配置已保存并连接。`,
    );
  }, [selectedAccount?.label, selectedAccountId, selectedChannel, updateSelectedChannel]);

  const handleReloadChannel = useCallback((): void => {
    if (!selectedChannel) {
      return;
    }

    message.success(`已重载 ${selectedAccount?.label ?? selectedChannel.label} 的配置草稿。`);
  }, [selectedAccount?.label, selectedChannel]);

  const handleRejectPairing = useCallback(
    (pairing: OpenClawV2ChannelPairingItem): void => {
      updateSelectedChannel(item => {
        if (selectedAccountId) {
          return {
            ...item,
            accounts: item.accounts.map(account =>
              account.accountId === selectedAccountId
                ? {
                    ...account,
                    pairings: account.pairings.filter(current => current.id !== pairing.id),
                  }
                : account,
            ),
          };
        }

        return {
          ...item,
          pairings: item.pairings.filter(current => current.id !== pairing.id),
        };
      });
      message.info(`已拒绝 ${pairing.name} 的接入请求。`);
    },
    [selectedAccountId, updateSelectedChannel],
  );

  const handleApprovePairing = useCallback(
    (pairing: OpenClawV2ChannelPairingItem): void => {
      updateSelectedChannel(item => {
        if (selectedAccountId) {
          return {
            ...item,
            accounts: item.accounts.map(account =>
              account.accountId === selectedAccountId
                ? {
                    ...account,
                    pairings: account.pairings.filter(current => current.id !== pairing.id),
                  }
                : account,
            ),
          };
        }

        return {
          ...item,
          pairings: item.pairings.filter(current => current.id !== pairing.id),
        };
      });
      message.success(`已批准 ${pairing.name} 接入 ${selectedChannel?.label ?? "当前渠道"}。`);
    },
    [selectedAccountId, selectedChannel?.label, updateSelectedChannel],
  );

  const handleRefreshPairings = useCallback((): void => {
    if (!selectedChannel) {
      return;
    }

    message.success(`已刷新 ${selectedAccount?.label ?? selectedChannel.label} 的待授权用户列表。`);
  }, [selectedAccount?.label, selectedChannel]);

  const handleCreateChannelAccount = useCallback((): void => {
    if (!selectedChannel) {
      return;
    }

    const nextIndex = selectedChannel.accounts.length + 1;
    const nextAccountId = `bot-${nextIndex}`;

    updateSelectedChannel(item => {
      const nextAccount: OpenClawV2ChannelAccountItem = {
        accountId: nextAccountId,
        label: `机器人 ${nextIndex}`,
        configured: false,
        connected: false,
        running: false,
        ownerAgentId: employees[0]?.id ?? "",
        formDraft: Object.fromEntries(
          Object.entries(item.formDraft).map(([key, value]) => [key, cloneChannelFormValue(value)]),
        ),
        pairings: [],
      };
      const nextItem: OpenClawV2ChannelItem = {
        ...item,
        accounts: [...item.accounts, nextAccount],
      };

      return {
        ...nextItem,
        ...buildChannelStateFromAccounts(nextItem),
      };
    });
    setSelectedAccountId(nextAccountId);
    message.success(`${selectedChannel.label} 已新增一个机器人。`);
  }, [employees, selectedChannel, updateSelectedChannel]);

  const handleAccountOwnerChange = useCallback(
    (accountId: string, ownerAgentId: string): void => {
      updateSelectedChannel(item => {
        const nextItem: OpenClawV2ChannelItem = {
          ...item,
          accounts: item.accounts.map(account =>
            account.accountId === accountId
              ? {
                  ...account,
                  ownerAgentId,
                }
              : account,
          ),
        };

        return {
          ...nextItem,
          ...buildChannelStateFromAccounts(nextItem),
        };
      });
    },
    [updateSelectedChannel],
  );

  const handleSaveAccountBinding = useCallback(
    (accountId: string): void => {
      const account = selectedChannel?.accounts.find(item => item.accountId === accountId) ?? null;
      if (!account) {
        return;
      }

      const owner = employees.find(employee => employee.id === account.ownerAgentId);
      message.success(
        `${account.label} 已绑定到 ${owner?.name ?? "未绑定 AI 伙伴"}。`,
      );
    },
    [employees, selectedChannel?.accounts],
  );

  if (!channels.length) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>还没有可用的 AI 伙伴</div>
            <div className={styles.emptyDescription}>
              请先在 AI 伙伴页面创建至少一个 AI 伙伴，然后再回来配置远程连接。
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPairings = selectedAccount?.pairings ?? selectedChannel?.pairings ?? [];
  const currentFormDraft = selectedAccount?.formDraft ?? selectedChannel?.formDraft ?? {};

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.panel}>
          <section className={styles.connectSection}>
            <div className={styles.connectLayout}>
              <aside className={styles.catalog}>
                <div className={styles.catalogHeader}>
                  <h1 className={styles.catalogTitle}>远程连接</h1>
                </div>

                <div className={styles.catalogList}>
                  {channels.map(item => {
                    const ownerAvatars = item.ownerAgentIds
                      .map(agentId => employees.find(employee => employee.id === agentId)?.avatarUrl)
                      .filter((avatarUrl): avatarUrl is string => Boolean(avatarUrl));

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={classNames(styles.channelCard, {
                          [styles.channelCardActive]: item.id === selectedChannelId,
                          [styles.channelCardConfigured]: item.configured,
                        })}
                        onClick={() => setSelectedChannelId(item.id)}
                      >
                        <div className={styles.channelCardTop}>
                          <div className={styles.channelCardName}>{item.label}</div>
                          <span
                            className={classNames(styles.channelCardStatus, {
                              [styles.channelCardStatusSuccess]: item.tone === "success",
                              [styles.channelCardStatusWarning]: item.tone === "warning",
                              [styles.channelCardStatusNeutral]: item.tone === "neutral",
                            })}
                          >
                            {item.statusText}
                          </span>
                        </div>

                        <div className={styles.channelCardBottom}>
                          {ownerAvatars.length > 0 ? (
                            <div className={styles.channelAvatarGroup}>
                              {ownerAvatars.slice(0, 4).map((avatarUrl, index) => (
                                <div
                                  key={`${item.id}-${index}`}
                                  className={styles.channelAvatar}
                                >
                                  <img src={avatarUrl} alt={item.label} />
                                </div>
                              ))}
                              {ownerAvatars.length > 4 ? (
                                <span className={styles.channelAvatarMore}>
                                  +{ownerAvatars.length - 4}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className={styles.channelCardEmpty}>{item.connectionText}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {selectedChannel ? (
                <div className={styles.workspace}>
                  <div className={styles.workspaceNotice}>
                    <div className={styles.workspaceNoticeMain}>
                      <div className={styles.workspaceTitle}>{selectedChannel.guide.title}</div>
                      <div className={styles.workspaceSubtitle}>
                        {selectedChannel.guide.subtitle}
                      </div>
                    </div>
                    <div className={styles.workspaceHighlightGroup}>
                      {selectedChannel.guide.highlights.map(item => (
                        <span key={item} className={styles.workspaceHighlight}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <section className={styles.workspaceSection}>
                    <div className={styles.workspaceSectionHeader}>
                      <div>
                        <div className={styles.workspaceSectionTitle}>
                          {selectedChannel.configTitle}
                        </div>
                        <div className={styles.workspaceSectionSubtitle}>
                          {selectedChannel.configSubtitle}
                        </div>
                      </div>
                      <label className={styles.jsonToggle}>
                        <input
                          type="checkbox"
                          checked={advancedJsonEnabled}
                          onChange={event => setAdvancedJsonEnabled(event.target.checked)}
                        />
                        <span>高级 JSON</span>
                      </label>
                    </div>

                    {selectedChannel.supportsMultipleAccounts && selectedChannel.accounts.length > 0 ? (
                      <div className={styles.accountTabs}>
                        {selectedChannel.accounts.map(account => (
                          <button
                            key={account.accountId}
                            type="button"
                            className={classNames(styles.accountTab, {
                              [styles.accountTabActive]:
                                (selectedAccount?.accountId ?? "") === account.accountId,
                            })}
                            onClick={() => setSelectedAccountId(account.accountId)}
                          >
                            {account.label}
                          </button>
                        ))}

                        <button
                          type="button"
                          className={styles.accountAddButton}
                          onClick={handleCreateChannelAccount}
                        >
                          <span className={styles.accountAddButtonIcon}>+</span>
                          <span>{selectedChannel.addAccountLabel ?? "新增机器人"}</span>
                        </button>
                      </div>
                    ) : null}

                    {!advancedJsonEnabled ? (
                      <div className={styles.configGrid}>
                        {selectedChannel.fields.map(field => (
                          <ChannelFieldRenderer
                            key={field.key}
                            field={field}
                            value={currentFormDraft[field.key]}
                            onChange={handleFieldChange}
                          />
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className={styles.jsonEditor}
                        spellCheck={false}
                        value={JSON.stringify(currentFormDraft, null, 2)}
                        onChange={event => {
                          try {
                            const nextDraft = JSON.parse(event.target.value) as Record<
                              string,
                              OpenClawV2ChannelFormValue
                            >;
                            updateSelectedChannel(item => {
                              if (selectedAccountId) {
                                const nextItem: OpenClawV2ChannelItem = {
                                  ...item,
                                  accounts: item.accounts.map(account =>
                                    account.accountId === selectedAccountId
                                      ? {
                                          ...account,
                                          formDraft: nextDraft,
                                        }
                                      : account,
                                  ),
                                };

                                return {
                                  ...nextItem,
                                  ...buildChannelStateFromAccounts(nextItem),
                                };
                              }

                              return {
                                ...item,
                                formDraft: nextDraft,
                              };
                            });
                          } catch {
                            // 保持草稿静默编辑，不在输入阶段打断。
                          }
                        }}
                      />
                    )}

                    <div className={styles.channelActions}>
                      <button
                        type="button"
                        className={styles.bindButton}
                        onClick={handleSaveChannel}
                      >
                        保存并连接
                      </button>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={handleReloadChannel}
                      >
                        重载配置
                      </button>
                      {selectedChannel.dangerActionLabel ? (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() =>
                            message.info(
                              `${selectedChannel.dangerActionLabel} 会在真实客户端中触发安全确认。`,
                            )
                          }
                        >
                          {selectedChannel.dangerActionLabel}
                        </button>
                      ) : null}
                    </div>
                  </section>

                  <section className={styles.workspaceSection}>
                    <div className={styles.workspaceSectionHeader}>
                      <div>
                        <div className={styles.workspaceSectionTitle}>待授权用户</div>
                        <div className={styles.workspaceSectionSubtitle}>
                          首次私聊当前渠道的用户会先进入这里，批准后才能正常开始对话。
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={handleRefreshPairings}
                      >
                        刷新列表
                      </button>
                    </div>

                    {currentPairings.length > 0 ? (
                      <div className={styles.pairingList}>
                        {currentPairings.map(pairing => (
                          <article key={pairing.id} className={styles.pairingItem}>
                            <div className={styles.pairingMeta}>
                              <div className={styles.pairingName}>{pairing.name}</div>
                              <div className={styles.pairingSub}>
                                {pairing.sourceLabel} · {pairing.createdAt}
                              </div>
                              <div className={styles.pairingNote}>{pairing.note}</div>
                            </div>
                            <div className={styles.pairingActions}>
                              <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => handleRejectPairing(pairing)}
                              >
                                拒绝
                              </button>
                              <button
                                type="button"
                                className={styles.bindButton}
                                onClick={() => handleApprovePairing(pairing)}
                              >
                                批准
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.inlineEmpty}>当前没有待授权用户。</div>
                    )}
                  </section>

                  <section className={styles.workspaceSection}>
                    <div className={styles.workspaceSectionHeader}>
                      <div>
                        <div className={styles.workspaceSectionTitle}>已连接账户</div>
                        <div className={styles.workspaceSectionSubtitle}>
                          先完成渠道连接，再在每个账户里绑定或切换 AI 伙伴。
                        </div>
                      </div>
                    </div>

                    {selectedChannel.accounts.length > 0 ? (
                      <div className={styles.accountList}>
                        {selectedChannel.accounts.map(account => {
                          const owner =
                            employees.find(employee => employee.id === account.ownerAgentId) ?? null;
                          const accountStatus = account.connected
                            ? "已连接"
                            : account.running
                              ? "运行中"
                              : account.configured
                                ? "已配置"
                                : "未连接";

                          return (
                            <article key={account.accountId} className={styles.accountItem}>
                              <div className={styles.accountMain}>
                                <div className={styles.accountTitle}>{account.label}</div>
                                <div className={styles.accountMeta}>
                                  accountId: {account.accountId} · {accountStatus}
                                  {owner ? ` · 归属 ${owner.name}` : ""}
                                </div>
                                {account.lastError ? (
                                  <div className={styles.accountError}>{account.lastError}</div>
                                ) : null}
                              </div>

                              <div className={styles.accountActions}>
                                <select
                                  className={styles.accountOwnerSelect}
                                  value={account.ownerAgentId}
                                  onChange={event =>
                                    handleAccountOwnerChange(account.accountId, event.target.value)
                                  }
                                >
                                  <option value="">未绑定 AI 伙伴</option>
                                  {employees.map(employee => (
                                    <option key={employee.id} value={employee.id}>
                                      {employee.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className={styles.ghostButton}
                                  onClick={() => handleSaveAccountBinding(account.accountId)}
                                >
                                  保存绑定
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.inlineEmpty}>当前还没有发现在线账户。</div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
