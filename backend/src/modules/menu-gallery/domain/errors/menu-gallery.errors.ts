import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class MenuGalleryCsvImportError extends AppError {
  constructor(errors: Array<{ lineNumber: number; message: string }>) {
    super(ErrorCodes.MENU_GALLERY_CSV_IMPORT_ERROR, 'Menu gallery CSV import failed', 400, {
      errors,
    });
  }
}
