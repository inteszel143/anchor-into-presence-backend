import styles from "@/components/AdminNavigationLoading.module.css";

export default function AdminLoading() {
  return <div className={styles.loading} role="status">
    <div className={styles.progress} aria-hidden="true"><span /></div>
    <span className={styles.spinner} aria-hidden="true" />
    <p>Loading page…</p>
  </div>;
}
