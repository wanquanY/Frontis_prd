import { useCallback, useState } from "react";

import { CheckCircleOutlined, LinkOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { Button, Input, Modal, QRCode, Tag, Upload, message } from "antd";
import classNames from "classnames";

import {
  DEFAULT_FEISHU_QR_CODE,
  FEISHU_QR_CODE_STORAGE_KEY,
  FEISHU_QR_CONFIGURED_STORAGE_KEY,
  FEISHU_QR_UPDATED_EVENT,
} from "@/constants/feishuChannel";
import adminStyles from "./FrontisAdminViews.module.less";

interface FeishuChannelState {
  appId: string;
  appSecret: string;
  connected: boolean;
  qrCode: string;
}

const getInitialQrCode = (): string =>
  localStorage.getItem(FEISHU_QR_CODE_STORAGE_KEY) ??
  (localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true" ? DEFAULT_FEISHU_QR_CODE : "");

const getInitialConnected = (): boolean =>
  localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true" || Boolean(getInitialQrCode());

export const ChannelManagementView = (): JSX.Element => {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [feishuChannel, setFeishuChannel] = useState<FeishuChannelState>({
    appId: "cli_a97b15d512391cbd",
    appSecret: "frontis-feishu-demo-secret",
    connected: getInitialConnected(),
    qrCode: getInitialQrCode(),
  });

  const normalizedQrCode = feishuChannel.qrCode.trim();
  const isFeishuEntryEnabled = feishuChannel.connected && Boolean(normalizedQrCode);

  const notifyFeishuQrUpdated = useCallback((configured: boolean, qrCode: string): void => {
    window.dispatchEvent(
      new CustomEvent(FEISHU_QR_UPDATED_EVENT, {
        detail: {
          configured,
          qrCode,
        },
      }),
    );
  }, []);

  const handleConnectFeishu = useCallback((): void => {
    if (!feishuChannel.appId.trim() || !feishuChannel.appSecret.trim()) {
      message.warning("请填写 App ID 和 App Secret。");
      return;
    }

    if (!normalizedQrCode) {
      message.warning("请配置飞书应用二维码。");
      return;
    }

    localStorage.setItem(FEISHU_QR_CONFIGURED_STORAGE_KEY, "true");
    localStorage.setItem(FEISHU_QR_CODE_STORAGE_KEY, normalizedQrCode);
    notifyFeishuQrUpdated(true, normalizedQrCode);
    setFeishuChannel(currentChannel => ({
      ...currentChannel,
      qrCode: normalizedQrCode,
      connected: true,
    }));
    setIsConnectModalOpen(false);
    message.success("飞书应用已连接，租户成员可在工作台首页连接飞书。");
  }, [feishuChannel.appId, feishuChannel.appSecret, normalizedQrCode, notifyFeishuQrUpdated]);

  const handleVerifyFeishuConfig = useCallback((): void => {
    if (!feishuChannel.appId.trim() || !feishuChannel.appSecret.trim()) {
      message.warning("请填写 App ID 和 App Secret。");
      return;
    }

    message.success("配置验证通过。");
  }, [feishuChannel.appId, feishuChannel.appSecret]);

  const handleBeforeUploadQrCode: NonNullable<UploadProps["beforeUpload"]> = useCallback(file => {
    setFeishuChannel(currentChannel => ({
      ...currentChannel,
      qrCode: `已上传：${file.name}`,
    }));
    return false;
  }, []);

  const handleDisableFeishu = useCallback((): void => {
    localStorage.removeItem(FEISHU_QR_CONFIGURED_STORAGE_KEY);
    localStorage.removeItem(FEISHU_QR_CODE_STORAGE_KEY);
    notifyFeishuQrUpdated(false, "");
    setFeishuChannel(currentChannel => ({
      ...currentChannel,
      connected: false,
      qrCode: "",
    }));
    message.success("飞书应用已断开，成员工作台不再展示连接入口。");
  }, [notifyFeishuQrUpdated]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>Channel 管理</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.channelGrid}>
          <button
            type="button"
            className={classNames(adminStyles.channelCard, {
              [adminStyles.channelCardActive]: feishuChannel.connected,
            })}
            onClick={() => setIsConnectModalOpen(true)}
          >
            <span className={classNames(adminStyles.channelIcon, adminStyles.channelIconFeishu)}>
              <LinkOutlined />
            </span>
            <span className={adminStyles.channelCardBody}>
              <span className={adminStyles.channelCardHeader}>
                <span className={adminStyles.channelCardTitle}>飞书 / Lark</span>
                <Tag color={feishuChannel.connected ? "success" : "default"}>
                  {feishuChannel.connected ? "已连接" : "未连接"}
                </Tag>
              </span>
              <span className={adminStyles.channelCardMeta}>
                <span>{feishuChannel.appId.trim() ? "已填写 App ID" : "未填写 App ID"}</span>
                <span>{normalizedQrCode ? "已配置应用二维码" : "未配置应用二维码"}</span>
              </span>
              <span className={adminStyles.channelCardMeta}>
                配置完成后，成员工作台首页右上角展示连接飞书入口。
              </span>
            </span>
          </button>
        </div>
      </section>

      <Modal
        className={adminStyles.channelConnectModal}
        width={720}
        centered
        title="配置飞书应用"
        open={isConnectModalOpen}
        onCancel={() => setIsConnectModalOpen(false)}
        footer={
          <div className={adminStyles.channelModalFooter}>
            {feishuChannel.connected ? <Button onClick={handleDisableFeishu}>断开连接</Button> : null}
            <Button onClick={handleVerifyFeishuConfig}>验证配置</Button>
            <Button type="primary" onClick={handleConnectFeishu}>
              保存并连接
            </Button>
          </div>
        }
      >
        <div className={adminStyles.channelModalBody}>
          <label className={adminStyles.channelModalField}>
            <span>App ID</span>
            <Input
              size="large"
              value={feishuChannel.appId}
              onChange={event =>
                setFeishuChannel(currentChannel => ({
                  ...currentChannel,
                  appId: event.target.value,
                }))
              }
            />
          </label>
          <label className={adminStyles.channelModalField}>
            <span>App Secret</span>
            <Input.Password
              size="large"
              value={feishuChannel.appSecret}
              onChange={event =>
                setFeishuChannel(currentChannel => ({
                  ...currentChannel,
                  appSecret: event.target.value,
                }))
              }
            />
          </label>
          <label className={adminStyles.channelModalField}>
            <span>飞书应用二维码</span>
            <div className={adminStyles.channelQrUploadRow}>
              <Input
                size="large"
                value={feishuChannel.qrCode}
                placeholder="输入二维码链接，或上传二维码图片"
                onChange={event =>
                  setFeishuChannel(currentChannel => ({
                    ...currentChannel,
                    qrCode: event.target.value,
                  }))
                }
              />
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={handleBeforeUploadQrCode}
              >
                <Button size="large" icon={<UploadOutlined />}>
                  上传图片
                </Button>
              </Upload>
            </div>
          </label>

          {normalizedQrCode ? (
            <div className={adminStyles.channelQrPanel}>
              <div className={adminStyles.channelCardHeader}>
                <span className={adminStyles.channelCardTitle}>成员绑定二维码</span>
                <Tag color={isFeishuEntryEnabled ? "success" : "default"}>
                  {isFeishuEntryEnabled ? "工作台入口已启用" : "保存后启用"}
                </Tag>
              </div>
              <QRCode value={normalizedQrCode} size={164} bordered={false} />
              <span className={adminStyles.channelCardMeta}>
                保存并连接后，租户成员可在工作台首页右上角 hover 飞书入口查看该二维码。
              </span>
            </div>
          ) : null}

          {feishuChannel.connected ? (
            <div className={adminStyles.channelCardMeta}>
              <CheckCircleOutlined />
              <span>飞书应用已连接。</span>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
