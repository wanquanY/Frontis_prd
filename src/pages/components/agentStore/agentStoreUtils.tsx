import {
  AppstoreOutlined,
  BgColorsOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  LineChartOutlined,
} from "@ant-design/icons";

/**
 * 根据技能分类返回图标。
 */
export const renderSkillCategoryIcon = (category: string): JSX.Element => {
  if (category === "产品") {
    return <FileSearchOutlined />;
  }
  if (category === "设计") {
    return <BgColorsOutlined />;
  }
  if (category === "运营") {
    return <LineChartOutlined />;
  }
  if (category === "文件") {
    return <FolderOpenOutlined />;
  }
  return <AppstoreOutlined />;
};
