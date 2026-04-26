import styles from "./UserManualPage.module.less";

const USER_MANUAL_STATIC_PATH = "/frontis-user-manual/index.html";

/**
 * 产品使用指南独立路由页。
 */
const UserManualPage = (): JSX.Element => (
  <main className={styles.page}>
    <iframe
      className={styles.manualFrame}
      src={USER_MANUAL_STATIC_PATH}
      title="Frontis AI 产品使用指南"
    />
  </main>
);

export default UserManualPage;
