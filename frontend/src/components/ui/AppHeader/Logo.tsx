import styles from './AppHeader.module.css';

/**
 * Logo corporativo KPITAL 360 — Human Resources.
 */
export function Logo() {
  return (
    <div className={styles.brand}>
      <img
        src="/assets/images/global/LogoLarge.png"
        alt="Kpital360° Human Resources"
        className={styles.logoImg}
      />
    </div>
  );
}
