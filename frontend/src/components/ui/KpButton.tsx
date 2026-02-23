import { Button } from 'antd';
import type { ButtonProps } from 'antd';

/**
 * Botón envuelto con clase KPITAL.
 * Extender aquí variantes o estilos corporativos si se necesitan.
 */
export function KpButton(props: ButtonProps) {
  return <Button className="kp-button" {...props} />;
}
