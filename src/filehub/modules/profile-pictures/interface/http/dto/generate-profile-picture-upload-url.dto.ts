import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class GenerateProfilePictureUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['avif', 'webp', 'png', 'jpeg', 'jpg'], {
    message: 'fileExtension must be one of: avif, webp, png, jpeg, jpg',
  })
  fileExtension: string;
}
