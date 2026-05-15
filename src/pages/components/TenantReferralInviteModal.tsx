import { useCallback, useMemo, useRef } from "react";

import { CopyOutlined, DownloadOutlined, LinkOutlined } from "@ant-design/icons";
import { App, Button, Modal, QRCode } from "antd";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";

import { PRODUCT_NAME } from "@/constants/brand";
import type { MockTenantReferralInviteRecord } from "@/feature/auth/types";

import styles from "./TenantReferralInviteModal.module.less";

interface TenantReferralInviteModalProps {
  accountName: string;
  inviteeRewardPoints: number;
  inviterRewardPoints: number;
  open: boolean;
  referralRecords: MockTenantReferralInviteRecord[];
  tenantCode: string;
  onClose: () => void;
}

interface ReferralRewardSummary {
  latestRewardedRecord: MockTenantReferralInviteRecord | null;
  pendingCount: number;
  rewardedPoints: number;
}

const getInviteLink = (tenantCode: string): string => {
  const encodedTenantCode = encodeURIComponent(tenantCode);

  if (typeof window === "undefined") {
    return `https://frontis.ai/login?ref=${encodedTenantCode}`;
  }

  return `${window.location.origin}/login?ref=${encodedTenantCode}`;
};

const getReferralRewardSummary = (
  records: MockTenantReferralInviteRecord[],
): ReferralRewardSummary => {
  const rewardedRecords = records.filter(record => record.status === "rewarded");
  const latestRewardedRecord =
    [...rewardedRecords].sort((leftRecord, rightRecord) =>
      (rightRecord.rewardedAt ?? rightRecord.registeredAt).localeCompare(
        leftRecord.rewardedAt ?? leftRecord.registeredAt,
      ),
    )[0] ?? null;

  return {
    latestRewardedRecord,
    pendingCount: records.filter(record => record.status !== "rewarded").length,
    rewardedPoints: rewardedRecords.reduce((sum, record) => sum + record.rewardPoints, 0),
  };
};

/**
 * 用户侧邀请好友弹窗，提供邀请海报、二维码和邀请链接复制能力。
 */
export const TenantReferralInviteModal = ({
  accountName,
  inviteeRewardPoints,
  inviterRewardPoints,
  open,
  referralRecords,
  tenantCode,
  onClose,
}: TenantReferralInviteModalProps): JSX.Element => {
  const { message: messageApi } = App.useApp();
  const posterRef = useRef<HTMLDivElement>(null);
  const inviteLink = useMemo(() => getInviteLink(tenantCode), [tenantCode]);
  const rewardSummary = useMemo(() => getReferralRewardSummary(referralRecords), [referralRecords]);

  const copyTextToClipboard = useCallback(
    async (text: string, successMessage: string): Promise<void> => {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        messageApi.warning("当前浏览器不支持一键复制，请手动复制邀请链接。");
        return;
      }

      await navigator.clipboard.writeText(text);
      messageApi.success(successMessage);
    },
    [messageApi],
  );

  const handleCopyLink = async (): Promise<void> => {
    await copyTextToClipboard(inviteLink, "邀请链接已复制。");
  };

  const handleCopyInviteText = async (): Promise<void> => {
    await copyTextToClipboard(
      `我正在用 ${PRODUCT_NAME} 搭建和使用 AI Agent，送你一个体验入口：${inviteLink}`,
      "邀请文案已复制。",
    );
  };

  const handleSavePoster = async (): Promise<void> => {
    if (!posterRef.current) {
      return;
    }

    const posterDataUrl = await toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 2,
    });

    saveAs(posterDataUrl, `${PRODUCT_NAME}-邀请海报-${tenantCode}.png`);
    messageApi.success("邀请海报已生成。");
  };

  return (
    <Modal
      open={open}
      title="邀请好友"
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      className={styles.inviteModal}
    >
      <div className={styles.inviteLayout}>
        <section className={styles.posterPanel}>
          <div className={styles.poster} ref={posterRef}>
            <div className={styles.posterBrand}>
              <span className={styles.posterLogo}>{PRODUCT_NAME.slice(0, 1)}</span>
              <span>{PRODUCT_NAME}</span>
            </div>
            <div className={styles.posterMain}>
              <span className={styles.posterEyebrow}>AI Agent 工作台</span>
              <h3 className={styles.posterTitle}>体验你的专属 AI Agent</h3>
              <p className={styles.posterSubtitle}>
                从任务拆解、专家调用到结果沉淀，一站式完成智能协作。
              </p>
            </div>
            <div className={styles.qrCard}>
              <QRCode value={inviteLink} size={156} bordered={false} />
            </div>
            <div className={styles.posterFooter}>
              <strong>扫码免费体验</strong>
              <span>
                {accountName} 邀请你加入 {PRODUCT_NAME}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.inviteInfoPanel}>
          <div className={styles.inviteIntro}>
            <span className={styles.inviteTag}>邀请奖励</span>
            <h3 className={styles.inviteTitle}>邀请好友体验 {PRODUCT_NAME}</h3>
            <p className={styles.inviteDescription}>
              保存海报或复制链接发给好友，好友通过二维码或链接完成注册后，你可以获得积分奖励。
            </p>
          </div>

          <div className={styles.rewardGrid}>
            <div className={styles.rewardItem}>
              <span>你可获得</span>
              <strong>{inviterRewardPoints.toLocaleString("zh-CN")} 积分</strong>
            </div>
            <div className={styles.rewardItem}>
              <span>好友权益</span>
              <strong>
                {inviteeRewardPoints > 0
                  ? `${inviteeRewardPoints.toLocaleString("zh-CN")} 积分`
                  : "注册赠送"}
              </strong>
            </div>
          </div>

          <div className={styles.linkBox}>
            <span>{inviteLink}</span>
            <Button type="text" icon={<LinkOutlined />} onClick={handleCopyLink}>
              复制链接
            </Button>
          </div>

          <div className={styles.actionRow}>
            <Button
              type="primary"
              size="large"
              icon={<CopyOutlined />}
              onClick={handleCopyInviteText}
            >
              复制邀请卡
            </Button>
            <Button size="large" icon={<DownloadOutlined />} onClick={handleSavePoster}>
              保存海报
            </Button>
          </div>

          <div className={styles.rewardRecordPanel}>
            <div className={styles.rewardRecordHeader}>
              <span className={styles.rewardRecordTitle}>奖励记录</span>
              <span className={styles.rewardRecordMeta}>
                已到账 {rewardSummary.rewardedPoints.toLocaleString("zh-CN")} 积分
                {rewardSummary.pendingCount > 0 ? ` · ${rewardSummary.pendingCount} 人待生效` : ""}
              </span>
            </div>
            {rewardSummary.latestRewardedRecord ? (
              <div className={styles.rewardRecordLatest}>
                <div className={styles.rewardRecordLatestMain}>
                  <strong>{rewardSummary.latestRewardedRecord.inviteeName}</strong>
                  <span>
                    最近到账 ·{" "}
                    {rewardSummary.latestRewardedRecord.rewardedAt ??
                      rewardSummary.latestRewardedRecord.registeredAt}
                  </span>
                </div>
                <em>
                  +{rewardSummary.latestRewardedRecord.rewardPoints.toLocaleString("zh-CN")} 积分
                </em>
              </div>
            ) : (
              <div className={styles.rewardRecordEmpty}>暂无到账记录，邀请成功后会在这里提示。</div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
};
