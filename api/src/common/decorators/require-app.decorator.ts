import { SetMetadata } from '@nestjs/common';
import { PlatformApp } from '../constants/apps.js';

export const REQUIRE_APP_KEY = 'requireApp';

/**
 * Decorador para marcar un controller o endpoint como exclusivo de una app.
 * Uso: @RequireApp(PlatformApp.KPITAL)
 */
export const RequireApp = (app: PlatformApp) => SetMetadata(REQUIRE_APP_KEY, app);
