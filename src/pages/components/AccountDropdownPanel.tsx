import type { ReactNode } from "react";

import { GiftOutlined } from "@ant-design/icons";

import styles from "./AccountDropdownPanel.module.less";

interface AccountDropdownPanelProps {
  accountName: string;
  menu: ReactNode;
  pointsBalance?: number;
  tenantName?: string;
  onOpenInvite?: () => void;
  onOpenRecharge?: () => void;
}

/**
 * 统一账户下拉面板，承接账户信息、积分入口和系统菜单。
 */
export const AccountDropdownPanel = ({
  accountName,
  menu,
  pointsBalance,
  tenantName,
  onOpenInvite,
  onOpenRecharge,
}: AccountDropdownPanelProps): JSX.Element => (
  <div className={styles.panel}>
    <div className={styles.header}>
      <span className={styles.name}>{accountName}</span>
      {tenantName ? <span className={styles.meta}>{tenantName}</span> : null}
    </div>

    {typeof pointsBalance === "number" && onOpenRecharge ? (
      <>
        <button type="button" className={styles.pointsButton} onClick={onOpenRecharge}>
          <span className={styles.pointsMain}>
            <span className={styles.pointsLabel}>积分余额</span>
            <span className={styles.pointsValue}>{pointsBalance.toLocaleString("zh-CN")}</span>
          </span>
          <span className={styles.pointsAction}>购买</span>
        </button>
        {onOpenInvite ? (
          <button type="button" className={styles.inviteButton} onClick={onOpenInvite}>
            <GiftOutlined />
            <span>邀请好友得积分</span>
          </button>
        ) : null}
        <div className={styles.divider} />
      </>
    ) : null}

    <div className={styles.menuWrap}>{menu}</div>
  </div>
);
