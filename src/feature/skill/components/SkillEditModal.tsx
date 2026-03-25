import { CloseOutlined, PictureOutlined } from "@ant-design/icons";
import { App as AntdApp, Form, Input, Modal, Select } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import type { SkillEditModalProps, SkillEditSubmitPayload } from "@/feature/skill/types";
import { isImageFile } from "@/utils/file";

import styles from "./SkillEditModal.module.less";

interface SkillEditFormValues {
  name: string;
  description: string;
  categoryId: number;
  visibility: SkillEditSubmitPayload["visibility"];
}

const MAX_COVER_SIZE = 5 * 1024 * 1024;

/**
 * SkillEditModal
 *
 * 编辑自己上传的 Skill 元数据，并确保本地预览文件在生命周期内正确释放。
 */
export const SkillEditModal = ({
  open,
  skill,
  categories,
  submitting,
  onCancel,
  onSubmit,
}: SkillEditModalProps): JSX.Element => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<SkillEditFormValues>();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [clearCover, setClearCover] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories.map(category => ({
        label: category.name,
        value: category.category_id,
      })),
    [categories],
  );

  const resetLocalPreview = useCallback((): void => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || !skill) {
      form.resetFields();
      setCoverFile(null);
      setClearCover(false);
      resetLocalPreview();
      setCoverPreview(null);
      return;
    }

    form.setFieldsValue({
      name: skill.name,
      description: skill.description ?? "",
      categoryId: skill.category.category_id,
      visibility: skill.visibility === "identity_only" ? "identity_only" : "tenant_only",
    });
    setCoverFile(null);
    setClearCover(false);
    resetLocalPreview();
    setCoverPreview(skill.cover?.storage_path ?? null);
  }, [form, open, resetLocalPreview, skill]);

  useEffect(() => resetLocalPreview, [resetLocalPreview]);

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

    resetLocalPreview();
    localPreviewRef.current = URL.createObjectURL(nextFile);
    setCoverFile(nextFile);
    setClearCover(false);
    setCoverPreview(localPreviewRef.current);
  };

  const handleRemoveCover = (): void => {
    resetLocalPreview();
    setCoverFile(null);
    setCoverPreview(null);
    setClearCover(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!skill) {
      return;
    }

    const values = await form.validateFields();
    await onSubmit({
      skillId: skill.skill_id,
      name: values.name.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      visibility: values.visibility,
      coverFile,
      clearCover,
    });
  };

  return (
    <Modal
      open={open}
      centered
      destroyOnHidden
      forceRender
      width={640}
      title="编辑 Skill"
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
    >
      <div className={styles.modalBody}>
        <Form<SkillEditFormValues> form={form} layout="vertical" requiredMark>
          <div className={styles.coverSection}>
            <div className={styles.coverBlock}>
              <div className={styles.coverHeader}>封面图</div>
              <div className={styles.coverHint}>可选，建议优先上传 1:1 封面图</div>
              <input
                ref={coverInputRef}
                hidden
                accept="image/*"
                type="file"
                onChange={handleCoverSelect}
              />
              <div
                role="button"
                tabIndex={0}
                className={coverPreview ? styles.coverCardFilled : styles.coverCard}
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    coverInputRef.current?.click();
                  }
                }}
              >
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
                    <div className={styles.coverIcon}>
                      <PictureOutlined />
                    </div>
                    <div className={styles.coverPrimary}>点击上传封面图</div>
                    <div className={styles.coverSecondary}>上传后将替换当前封面</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            <Form.Item
              label="展示名称"
              name="name"
              rules={[{ required: true, whitespace: true, message: "请输入 Skill 名称" }]}
            >
              <Input maxLength={200} placeholder="例如：电商商品文案助手" />
            </Form.Item>

            <Form.Item
              label="场景分类"
              name="categoryId"
              rules={[{ required: true, message: "请选择场景分类" }]}
            >
              <Select options={categoryOptions} placeholder="请选择场景分类" />
            </Form.Item>
          </div>

          <Form.Item
            className={styles.visibilityItem}
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

          <Form.Item label="描述" name="description">
            <Input.TextArea
              maxLength={4000}
              placeholder="简要说明这个 Skill 适合解决什么问题"
              rows={5}
              showCount
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
