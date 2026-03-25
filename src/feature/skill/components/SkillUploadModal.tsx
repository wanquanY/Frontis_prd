import { CloseOutlined, InboxOutlined, PictureOutlined } from "@ant-design/icons";
import { App as AntdApp, Form, Input, Modal, Select } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import type { SkillUploadModalProps, SkillUploadSubmitPayload } from "@/feature/skill/types";
import {
  formatFileSize,
  isImageFile,
  isSkillPackageFile,
  SKILL_PACKAGE_ACCEPT_ATTR,
} from "@/utils/file";

import styles from "./SkillUploadModal.module.less";

interface SkillUploadFormValues {
  name: string;
  description: string;
  version: string;
  categoryId: number;
  visibility: SkillUploadSubmitPayload["visibility"];
}

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const SKILL_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * SkillUploadModal
 *
 * 用户侧 Skill 上传弹窗：
 * - 负责表单校验、本地文件选择与预览
 * - 保证弹窗关闭或文件替换时及时释放本地对象 URL
 */
export const SkillUploadModal = ({
  open,
  categories,
  submitting,
  onCancel,
  onSubmit,
}: SkillUploadModalProps): JSX.Element => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<SkillUploadFormValues>();
  const packageInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverPreviewRef = useRef<string | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPackageDragActive, setIsPackageDragActive] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories.map(category => ({
        label: category.name,
        value: category.category_id,
      })),
    [categories],
  );

  const resetCoverPreview = useCallback((): void => {
    if (coverPreviewRef.current) {
      URL.revokeObjectURL(coverPreviewRef.current);
      coverPreviewRef.current = null;
    }
    setCoverPreview(null);
  }, []);

  const replaceCoverPreview = useCallback(
    (file: File): void => {
      resetCoverPreview();
      coverPreviewRef.current = URL.createObjectURL(file);
      setCoverPreview(coverPreviewRef.current);
    },
    [resetCoverPreview],
  );

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setPackageFile(null);
      setCoverFile(null);
      resetCoverPreview();
      return;
    }

    form.setFieldsValue({
      name: "",
      description: "",
      version: "1.0.0",
      categoryId: categoryOptions[0]?.value,
      visibility: "tenant_only",
    });
  }, [categoryOptions, form, open, resetCoverPreview]);

  useEffect(() => resetCoverPreview, [resetCoverPreview]);

  const handlePackageFile = useCallback(
    (nextFile: File | null): void => {
      if (!nextFile) {
        return;
      }

      if (!isSkillPackageFile(nextFile)) {
        message.error("当前仅支持上传 .zip 或 .skill 技能包");
        return;
      }

      setPackageFile(nextFile);
    },
    [message],
  );

  const handlePackageSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    handlePackageFile(nextFile);
  };

  const handlePackageDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!isPackageDragActive) {
      setIsPackageDragActive(true);
    }
  };

  const handlePackageDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsPackageDragActive(false);
  };

  const handlePackageDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsPackageDragActive(false);
    handlePackageFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleCoverSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) {
      return;
    }

    if (!isImageFile(nextFile)) {
      message.error("封面图必须为图片文件");
      return;
    }

    if (nextFile.size > MAX_COVER_SIZE) {
      message.error("封面图大小不能超过 5MB");
      return;
    }

    setCoverFile(nextFile);
    replaceCoverPreview(nextFile);
  };

  const handleRemoveCover = (): void => {
    setCoverFile(null);
    resetCoverPreview();
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    if (!packageFile) {
      message.error("请先选择 Skill 包文件");
      return;
    }

    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      version: values.version.trim(),
      categoryId: values.categoryId,
      visibility: values.visibility,
      packageFile,
      coverFile,
    });
  };

  return (
    <Modal
      open={open}
      centered
      destroyOnHidden
      forceRender
      width={720}
      title="上传 Skill"
      okText="开始上传"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
    >
      <div className={styles.modalBody}>
        <Form<SkillUploadFormValues> form={form} layout="vertical" requiredMark>
          <div className={styles.grid}>
            <Form.Item
              label="展示名称"
              name="name"
              rules={[{ required: true, whitespace: true, message: "请输入 Skill 名称" }]}
            >
              <Input maxLength={200} placeholder="例如：电商商品文案助手" />
            </Form.Item>

            <Form.Item
              label="版本号"
              name="version"
              rules={[
                { required: true, whitespace: true, message: "请输入版本号" },
                {
                  pattern: SKILL_VERSION_PATTERN,
                  message: "版本号需符合 semver，例如 1.0.0",
                },
              ]}
            >
              <Input maxLength={64} placeholder="1.0.0" />
            </Form.Item>
          </div>

          <div className={styles.grid}>
            <Form.Item
              label="场景分类"
              name="categoryId"
              rules={[{ required: true, message: "请选择场景分类" }]}
            >
              <Select options={categoryOptions} placeholder="请选择场景分类" />
            </Form.Item>

            <Form.Item
              label="企业可见性"
              name="visibility"
              rules={[{ required: true, message: "请选择可见性" }]}
            >
              <Select
                placeholder="请选择可见性"
                options={[
                  { label: "企业公开", value: "tenant_only" },
                  { label: "不公开，仅自己可见", value: "identity_only" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              maxLength={4000}
              placeholder="简要说明这个 Skill 适合解决什么问题"
              rows={4}
              showCount
            />
          </Form.Item>

          <div className={styles.assetSection}>
            <div
              role="button"
              tabIndex={0}
              className={styles.assetCardButton}
              onClick={() => packageInputRef.current?.click()}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  packageInputRef.current?.click();
                }
              }}
            >
              <div className={styles.assetCard}>
                <div className={styles.assetHeader}>技能包</div>
                <div className={styles.assetHint}>上传 .zip 或 .skill 格式的 Skill 包文件</div>
                <input
                  ref={packageInputRef}
                  hidden
                  accept={SKILL_PACKAGE_ACCEPT_ATTR}
                  type="file"
                  onChange={handlePackageSelect}
                />
                <div
                  className={`${styles.assetDropzone} ${isPackageDragActive ? styles.assetDropzoneActive : ""}`}
                  onDragOver={handlePackageDragOver}
                  onDragLeave={handlePackageDragLeave}
                  onDrop={handlePackageDrop}
                >
                  <div className={styles.assetIcon}>
                    <InboxOutlined />
                  </div>
                  <div className={styles.assetPrimary}>
                    {packageFile
                      ? packageFile.name
                      : isPackageDragActive
                        ? "释放以上传 Skill 包"
                        : "点击或拖拽上传 Skill 包"}
                  </div>
                  <div className={styles.assetSecondary}>
                    {packageFile
                      ? formatFileSize(packageFile.size)
                      : "支持 .zip/.skill 压缩包，可直接拖拽到这里或点击后从本地选择"}
                  </div>
                </div>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={styles.assetCardButton}
              onClick={() => coverInputRef.current?.click()}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  coverInputRef.current?.click();
                }
              }}
            >
              <div className={styles.assetCard}>
                <div className={styles.assetHeader}>封面图</div>
                <div className={styles.assetHint}>可选，建议上传清晰的方形图片</div>
                <input
                  ref={coverInputRef}
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleCoverSelect}
                />
                <div className={coverPreview ? styles.coverCardFilled : styles.coverCard}>
                  {coverPreview ? (
                    <>
                      <img className={styles.coverImage} src={coverPreview} alt="Skill 封面预览" />
                      <button
                        type="button"
                        className={styles.coverRemove}
                        aria-label="移除封面图"
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRemoveCover();
                        }}
                      >
                        <CloseOutlined />
                      </button>
                    </>
                  ) : (
                    <div className={styles.coverEmpty}>
                      <div className={styles.assetIcon}>
                        <PictureOutlined />
                      </div>
                      <div className={styles.assetPrimary}>点击上传封面图</div>
                      <div className={styles.assetSecondary}>支持常见图片格式，大小不超过 5MB</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};
