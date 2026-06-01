import { useCallback, useMemo, useState } from "react";

import {
  AppstoreOutlined,
  CopyOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { Select } from "antd";
import { Navigate, useNavigate } from "react-router-dom";

import { PRODUCT_LOGO_URL } from "@/constants/brand";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import {
  getLoginPath,
  getSystemEntries,
  getSystemEntryMenuLabel,
} from "@/feature/auth/mockAccounts";
import type { MockAuthSystemEntry } from "@/feature/auth/types";
import {
  generateSalesLeadCode,
  getSalesLeadCodesForUser,
  getSalesMemberCodeForUser,
} from "@/feature/sales/salesService";
import type { SalesLeadCode } from "@/feature/sales/types";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";

import salesStyles from "@/feature/sales/components/SalesViews.module.less";
import styles from "./DaGuanSalesPage.module.less";

type SalesLeadCodeStatusFilter = SalesLeadCode["status"] | "all";

const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: SalesLeadCodeStatusFilter;
}> = [
  { label: "全部状态", value: "all" },
  { label: "未使用", value: "unused" },
  { label: "已使用", value: "used" },
  { label: "已失效", value: "invalid" },
];

const getStatusLabel = (status: SalesLeadCode["status"]): string => {
  if (status === "used") {
    return "已使用";
  }

  if (status === "invalid") {
    return "已失效";
  }

  return "未使用";
};

/**
 * 大观销售应用，面向租户内销售成员生成客户渠道码并维护本人渠道码记录。
 */
const DaGuanSalesPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { activateIdentity, activeIdentity, logout, session } = useMockAuth();
  const { loginByAccountId: loginOperationsByAccountId } = useOperationsAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const memberCode = useMemo(
    () => getSalesMemberCodeForUser(activeIdentity?.tenantId, activeIdentity?.subjectId),
    [activeIdentity?.subjectId, activeIdentity?.tenantId],
  );
  const [records, setRecords] = useState<SalesLeadCode[]>(() =>
    getSalesLeadCodesForUser(activeIdentity?.tenantId, activeIdentity?.subjectId),
  );
  const [statusFilter, setStatusFilter] = useState<SalesLeadCodeStatusFilter>("all");
  const usedRecordCount = records.filter(item => item.status === "used").length;
  const unusedRecordCount = records.filter(item => item.status === "unused").length;
  const invalidRecordCount = records.filter(item => item.status === "invalid").length;
  const filteredRecords = useMemo(
    () => records.filter(item => statusFilter === "all" || item.status === statusFilter),
    [records, statusFilter],
  );

  const systemEntries = useMemo(
    () =>
      getSystemEntries(
        session?.identities ?? [],
        activeIdentity?.tenantId,
        session?.activeIdentityId,
      ),
    [activeIdentity?.tenantId, session?.activeIdentityId, session?.identities],
  );

  const handleOpenSystemEntry = useCallback(
    (entry: MockAuthSystemEntry): void => {
      setDrawerOpen(false);
      const identityResult = activateIdentity(entry.identityId, entry.entryPath);

      if (!identityResult.success) {
        message.error(identityResult.message);
        return;
      }

      if (entry.platform === "operationsAdmin" && entry.operationsAccountId) {
        const result = loginOperationsByAccountId(entry.operationsAccountId, entry.entryPath);

        if (!result.success) {
          message.error(result.message);
          return;
        }

        navigate(result.redirectPath ?? entry.entryPath, { replace: true });
        return;
      }

      navigate(identityResult.redirectPath ?? entry.entryPath, { replace: true });
    },
    [activateIdentity, loginOperationsByAccountId, navigate],
  );

  const handleLogout = useCallback((): void => {
    setDrawerOpen(false);
    logout();
    message.success("已退出模拟登录。");
    navigate(getLoginPath("/web/sales"), { replace: true });
  }, [logout, navigate]);

  const accountMenuItems: MenuProps["items"] = [
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: getSystemEntryMenuLabel(entry),
      onClick: () => handleOpenSystemEntry(entry),
    })),
    ...(systemEntries.length ? [{ type: "divider" as const }] : []),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const handleGenerateCode = (): void => {
    if (!memberCode || memberCode.status !== "active") {
      message.warning("当前账号暂无可用渠道码权限。");
      return;
    }

    const result = generateSalesLeadCode(memberCode);

    setRecords(getSalesLeadCodesForUser(memberCode.tenantId, memberCode.memberId));

    if (!result.success) {
      message.warning(result.message ?? "渠道码生成失败。");
      return;
    }

    message.success("渠道码已生成，10 分钟内有效。");
  };

  const handleCopyCode = (code: string): void => {
    void navigator.clipboard?.writeText(code);
    message.success("渠道码已复制。");
  };

  if (!activeIdentity) {
    return <Navigate replace to={getLoginPath("/web/sales")} />;
  }

  const renderNavigation = (variant: "sidebar" | "drawer"): JSX.Element => (
    <>
      <div className={styles.brand}>
        <img className={styles.logo} src={PRODUCT_LOGO_URL} alt="大观销售" />
        <div className={styles.brandCopy}>
          <div className={styles.brandTitle}>大观销售</div>
          <div className={styles.brandSubTitle}>{activeIdentity.tenantName}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonActive}`}
          onClick={() => setDrawerOpen(false)}
        >
          <span className={styles.navIcon}>
            <QrcodeOutlined />
          </span>
          <span>生成渠道码</span>
        </button>
      </nav>

      <Dropdown
        menu={{ items: accountMenuItems }}
        placement={variant === "drawer" ? "top" : "topLeft"}
        trigger={["click"]}
      >
        <button type="button" className={styles.accountButton}>
          <Avatar size={30}>{activeIdentity.subjectName.slice(0, 1)}</Avatar>
          <span>{activeIdentity.subjectName}</span>
        </button>
      </Dropdown>
    </>
  );

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>{renderNavigation("sidebar")}</aside>

      <Drawer
        className={styles.mobileDrawer}
        closeIcon={false}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        placement="left"
        title={null}
        width={288}
      >
        {renderNavigation("drawer")}
      </Drawer>

      <header className={styles.mobileTopbar}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label="打开菜单"
          onClick={() => setDrawerOpen(true)}
        >
          <MenuOutlined />
        </button>
        <div className={styles.mobileBrand}>
          <img className={styles.logo} src={PRODUCT_LOGO_URL} alt="大观销售" />
          <div className={styles.brandCopy}>
            <div className={styles.brandTitle}>大观销售</div>
            <div className={styles.brandSubTitle}>{activeIdentity.tenantName}</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={salesStyles.view}>
          <section className={salesStyles.generateBar}>
            <div className={salesStyles.generateInfo}>
              <h1 className={salesStyles.title}>生成渠道码</h1>
              <div className={salesStyles.compactStats}>
                <span>累计 {records.length}</span>
                <span>已使用 {usedRecordCount}</span>
                <span>未使用 {unusedRecordCount}</span>
                <span>已失效 {invalidRecordCount}</span>
              </div>
            </div>
            <Button
              disabled={!memberCode || memberCode.status !== "active"}
              icon={<PlusOutlined />}
              type="primary"
              onClick={handleGenerateCode}
            >
              生成渠道码
            </Button>
          </section>

          <section className={salesStyles.recordsPanel}>
            <div className={salesStyles.sectionHeader}>
              <h2 className={salesStyles.sectionTitle}>渠道码记录</h2>
              <Select<SalesLeadCodeStatusFilter>
                className={salesStyles.statusSelect}
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                onChange={setStatusFilter}
              />
            </div>

            {filteredRecords.length ? (
              <div className={salesStyles.codeList}>
                {filteredRecords.map(record => (
                  <div key={record.id} className={salesStyles.codePanel}>
                    <div className={salesStyles.codePanelMain}>
                      <div className={salesStyles.codeText}>{record.fullCode}</div>
                      <div className={salesStyles.metaGrid}>
                        <span>状态：{getStatusLabel(record.status)}</span>
                        <span>创建时间：{record.createdAt}</span>
                      </div>
                    </div>
                    <Button
                      className={salesStyles.copyButton}
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyCode(record.fullCode)}
                    >
                      复制
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={salesStyles.emptyPanel}>
                {memberCode ? "当前状态下暂无渠道码" : "当前账号暂无可用渠道码权限"}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default DaGuanSalesPage;
