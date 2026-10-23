import styles from "@/components/AdminNavigationLoading.module.css";

export default function AdminLoading() {
  return <div className={styles.progress} role="status" aria-label="Loading page"><span /></div>;
}
