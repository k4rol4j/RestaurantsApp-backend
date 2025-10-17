import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = join(
            process.cwd(),
            'public',
            'images',
            'logo_restaurants',
          );
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype))
          cb(null, true);
        else cb(new BadRequestException('INVALID_FILE_TYPE'), false);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    // adres absolutny do wyświetlania w frontendzie
    const host =
      process.env.FRONTEND_PUBLIC_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      'http://localhost:9000';
    const relativePath = `/images/logo_restaurants/${file.filename}`;

    return {
      url: relativePath, // zapisujesz to do bazy
      fullUrl: `${host}${relativePath}`, // podgląd w frontendzie
    };
  }
}
