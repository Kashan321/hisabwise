import multer from 'multer';
import { FileTooLargeError } from '../../../files/domain/errors/file.errors';

const MAX_CSV_SIZE_MB = 2;

const ALLOWED_CSV_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
]);

export const uploadMenuCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsvMime = ALLOWED_CSV_TYPES.has(file.mimetype);
    const isCsvName = file.originalname.toLowerCase().endsWith('.csv');
    if (isCsvMime || isCsvName) {
      cb(null, true);
      return;
    }
    cb(new Error('Only CSV files are allowed'));
  },
}).single('file');

export { MAX_CSV_SIZE_MB, FileTooLargeError };
