import { useMemo } from "react";
import type { ReactNode } from "react";

import { QrcodeOutlined } from "@ant-design/icons";
import { QRCode } from "antd";

import { loadOperationsCommunityGroupConfig } from "@/feature/operations/platformConfigStorage";

import styles from "./AccountDropdownPanel.module.less";

interface AccountDropdownPanelProps {
  accountName: string;
  menu: ReactNode;
}

/**
 * 统一账户下拉面板，承接账户信息和系统菜单。
 */
export const AccountDropdownPanel = ({
  accountName,
  menu,
}: AccountDropdownPanelProps): JSX.Element => {
  const communityGroupConfig = useMemo(() => loadOperationsCommunityGroupConfig(), []);
  const shouldShowCommunityEntry =
    communityGroupConfig.enabled && Boolean(communityGroupConfig.qrCodeValue.trim());

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.name}>{accountName}</span>
      </div>

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
