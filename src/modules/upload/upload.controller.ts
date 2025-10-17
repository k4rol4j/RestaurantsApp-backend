import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/images/logo_restaurants',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype))
          cb(null, true);
        else cb(new Error('INVALID_FILE_TYPE') as any, false);
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'No file' };
    }
    // ZWRACAMY WZGLĘDNĄ ŚCIEŻKĘ — to jest to, co trafia do bazy:
    return { url: `/images/logo_restaurants/${file.filename}` };
  }
}
