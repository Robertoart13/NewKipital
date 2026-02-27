import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca endpoint/controlador como publico (sin JWT global).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
