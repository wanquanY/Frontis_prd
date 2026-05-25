import { ExpertPlazaView } from "./ExpertPlazaView";
import styles from "./SkillCenterView.module.less";

type AssetCatalogMode = "store" | "team";

interface AssetCatalogViewProps {
  mode: AssetCatalogMode;
  onUseAgent?: (agentId: string) => void;
}

/**
 * 统一承载平台商店与我的专区，避免 AI 专家和 Skill 分属不同信息架构。
 */
export const AssetCatalogView = ({ mode, onUseAgent }: AssetCatalogViewProps): JSX.Element => {
  return (
    <div className={styles.assetCatalogRoot}>
      <ExpertPlazaView mode={mode} onUseAgent={onUseAgent} />
    </div>
  );
};
