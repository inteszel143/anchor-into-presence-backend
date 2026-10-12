import shared from "../users/users.module.css";
import styles from "./offers.module.css";

export function OfferNoticeSkeleton() {
  return <div className={styles.notice} aria-hidden="true">
    <div className={styles.skeletonNotice}>
      <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
      <span className={`${styles.skeleton} ${styles.skeletonLineShort}`} />
    </div>
  </div>;
}

export function OfferMetricSkeleton() {
  return <span className={`${styles.skeleton} ${styles.skeletonValue}`} aria-hidden="true" />;
}

export function OfferTableSkeleton({ columns = 6 }: { columns?: number }) {
  return <div role="status">
    <span className={styles.srOnly}>Loading promotional offers…</span>
    <div aria-hidden="true">
      <div className={`${shared.filters} ${styles.skeletonFilters}`}>
        {Array.from({ length: 4 }, (_, index) => <div key={index}>
          <span className={`${styles.skeleton} ${styles.skeletonLabel}`} />
          <span className={`${styles.skeleton} ${styles.skeletonInput}`} />
        </div>)}
      </div>
      <div className={shared.tableScroll}>
        <table className={`${shared.table} ${styles.skeletonTable}`}>
          <thead><tr>{Array.from({ length: columns }, (_, index) => <th key={index}>
            <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
          </th>)}</tr></thead>
          <tbody>{Array.from({ length: 5 }, (_, row) => <tr key={row}>
            {Array.from({ length: columns }, (_, column) => <td key={column}>
              <span className={`${styles.skeleton} ${column === columns - 1 ? styles.skeletonBadge : styles.skeletonLine}`} />
              {column < 2 && <span className={`${styles.skeleton} ${styles.skeletonSecondary}`} />}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className={shared.footer}>
        <span className={`${styles.skeleton} ${styles.skeletonFooter}`} />
        <span className={`${styles.skeleton} ${styles.skeletonFooter}`} />
      </div>
    </div>
  </div>;
}
