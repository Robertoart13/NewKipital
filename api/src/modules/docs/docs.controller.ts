import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { DocsService } from './docs.service';

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  /**
   * GET /api/docs/tree/full?root=
   * Árbol completo. Por defecto root=13-manual-usuario (solo Manual del Usuario).
   */
  @Get('tree/full')
  async getFullTree(@Query('root') root?: string) {
    const tree = await this.docsService.getFullTree(root ?? undefined);
    return { success: true, data: tree };
  }

  /**
   * GET /api/docs/search?q=&root=
   * Busca en el contenido. Por defecto solo en 13-manual-usuario.
   */
  @Get('search')
  async search(@Query('q') q: string, @Query('root') root?: string) {
    const results = await this.docsService.search(q ?? '', root ?? undefined);
    return { success: true, data: results };
  }

  /**
   * GET /api/docs/tree?path=
   * Lista archivos y carpetas bajo la ruta indicada (vacía = raíz docs).
   */
  @Get('tree')
  async getTree(@Query('path') path?: string) {
    const tree = await this.docsService.getTree(path ?? '');
    return { success: true, data: tree };
  }

  /**
   * GET /api/docs/file?path=08-planilla/ANALISIS.md
   * Devuelve el contenido del archivo.
   */
  @Get('file')
  async getFile(@Query('path') path: string, @Res() res: Response) {
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ success: false, message: 'Se requiere query path' });
    }
    const content = await this.docsService.getFileContent(path);
    return res.json({ success: true, data: { content, path } });
  }
}
