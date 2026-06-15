import { useMemo } from "react";
import type { ReactNode } from "react";

import { CreditCardOutlined, MobileOutlined, QrcodeOutlined } from "@ant-design/icons";
import { QRCode } from "antd";

import { loadOperationsCommunityGroupConfig } from "@/feature/operations/platformConfigStorage";

import styles from "./AccountDropdownPanel.module.less";

interface AccountDropdownPanelProps {
  accountName: string;
  menu: ReactNode;
  mobileDownload?: {
    description: string;
    enabled: boolean;
    qrCodeValue: string;
    title: string;
  };
  onOpenRecharge?: () => void;
  onOpenSubscription?: () => void;
  pointsBalance?: number;
}

/**
 * 统一账户下拉面板，承接账户信息和系统菜单。
 */
export const AccountDropdownPanel = ({
  accountName,
  menu,
  mobileDownload,
  onOpenRecharge,
  onOpenSubscription,
  pointsBalance,
}: AccountDropdownPanelProps): JSX.Element => {
  const communityGroupConfig = useMemo(() => loadOperationsCommunityGroupConfig(), []);
  const shouldShowCommunityEntry =
    communityGroupConfig.enabled && Boolean(communityGroupConfig.qrCodeValue.trim());
  const shouldShowMobileDownload =
    Boolean(mobileDownload?.enabled) && Boolean(mobileDownload?.qrCodeValue.trim());

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.name}>{accountName}</span>
      </div>

      {typeof pointsBalance === "number" ? (
        <div className={styles.pointsCard}>
          <span className={styles.pointsMain}>
            <span className={styles.pointsLabel}>积分余额</span>
            <span className={styles.pointsValue}>{pointsBalance.toLocaleString("zh-CN")}</span>
          </span>
          {onOpenRecharge ? (
            <button type="button" className={styles.pointsActionButton} onClick={onOpenRecharge}>
              购买
            </button>
          ) : null}
        </div>
      ) : null}

      {onOpenSubscription ? (
        <button type="button" className={styles.subscriptionButton} onClick={onOpenSubscription}>
          <CreditCardOutlined className={styles.subscriptionButtonIcon} />
          <span>团队扩充</span>
        </button>
      ) : null}

      {shouldShowMobileDownload && mobileDownload ? (
        <div className={styles.qrEntry}>
          <button type="button" className={styles.qrButton} aria-haspopup="dialog">
            <MobileOutlined className={styles.qrButtonIcon} />
            <span>下载移动端</span>
          </button>
          <div className={styles.qrPopover} role="dialog" aria-label="Leadeep 移动端下载二维码">
            <div className={styles.qrPopoverHeader}>
              <span className={styles.qrPopoverEyebrow}>Leadeep 移动端</span>
              <strong className={styles.qrPopoverTitle}>{mobileDownload.title}</strong>
              <span className={styles.qrPopoverDescription}>{mobileDownload.description}</span>
            </div>
            <div className={styles.qrBox}>
              <QRCode value={mobileDownload.qrCodeValue.trim()} size={164} bordered={false} />
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowCommunityEntry ? (
        <div className={styles.communityEntry}>
          <button type="button" className={styles.communityButton} aria-haspopup="dialog">
            <QrcodeOutlined className={styles.communityButtonIcon} />
            <span>扫码进交流群</span>
          </button>
          <div className={styles.communityPopover} role="dialog" aria-label="交流群二维码">
            <div className={styles.communityPopoverHeader}>
              <span className={styles.communityPopoverEyebrow}>用户交流群</span>
              <strong className={styles.communityPopoverTitle}>
                {communityGroupConfig.groupName}
              </strong>
              <span className={styles.communityPopoverDescription}>
                {communityGroupConfig.description}
              </span>
            </div>
            <div className={styles.communityQrBox}>
              <QRCode value={communityGroupConfig.qrCodeValue.trim()} size={164} bordered={false} />
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.menuWrap}>{menu}</div>
    </div>
  );
};
