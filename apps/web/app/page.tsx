import { CatalogView } from "@ttrpg-cards/feature-catalog";

import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>TTRPG Cards</h1>
      <CatalogView />
    </main>
  );
}
