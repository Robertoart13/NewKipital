import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * Omite validacion CSRF en endpoints especificos.
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

