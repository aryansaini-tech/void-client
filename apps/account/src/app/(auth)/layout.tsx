import { VoidScene } from '@void/ui/scene';
import styles from './auth-layout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className={styles.main}>
      <div className={styles.shell}>
        <aside className={styles.art} aria-labelledby="account-intro">
          <div className={styles.artCopy}>
            <h2 id="account-intro">Your place<br />in Void.</h2>
          </div>
          <VoidScene className={styles.scene} />
          <p className={styles.caption}>
            Your profile, purchases, and connected accounts.
            <br />One account for all of it.
          </p>
        </aside>
        <div className={styles.formSide}>{children}</div>
      </div>
    </main>
  );
}
