/* =============================================================================
   COMPONENT: KpButton
   =============================================================================

   Wrapper del boton Ant Design con clase corporativa KPITAL.

   Responsabilidades:
   - Aplicar clase kp-button para estilos corporativos
   - Reexportar todas las props de Button de antd

   ========================================================================== */

import { Button } from 'antd';

import type { ButtonProps } from 'antd';

/**
 * ============================================================================
 * KpButton
 * ============================================================================
 *
 * Boton envuelto con clase KPITAL. Extender variantes o estilos aqui si se necesitan.
 *
 * @param props - Props del Button de antd (type, danger, disabled, onClick, etc.).
 *
 * ============================================================================
 */
export function KpButton(props: ButtonProps) {
  return <Button className="kp-button" {...props} />;
}

