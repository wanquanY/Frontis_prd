import { ExpertPlazaView } from "./ExpertPlazaView";
import styles from "./SkillCenterView.module.less";

type AssetCatalogMode = "store" | "team";

interface AssetCatalogViewProps {
  mode: AssetCatalogMode;
}

/**
 * 统一承载专家广场与企业专区，避免 AI 专家和 Skill 分属不同信息架构。
 */
export const AssetCatalogView = ({ mode }: AssetCatalogViewProps): JSX.Element => {
  return (
    <div className={styles.assetCatalogRoot}>
      <ExpertPlazaView mode={mode} />
    </div>
  );
};
