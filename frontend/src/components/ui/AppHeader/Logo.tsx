/* =============================================================================
   COMPONENT: Logo
   =============================================================================

   Logo corporativo KPITAL 360 para el header.

   ========================================================================== */

import styles from './AppHeader.module.css';

/**
 * ============================================================================
 * Logo
 * ============================================================================
 *
 * Logo corporativo en la esquina superior izquierda del header.
 *
 * ============================================================================
 */
export function Logo() {
  return (
    <div className={styles.brand}>
      <img src="/assets/images/global/LogoLarge.png" alt="Kpital360° Human Resources" className={styles.logoImg} />
    </div>
  );
}

