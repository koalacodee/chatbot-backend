import {
  BadRequestException,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory(errors: ValidationError[]) {
        const details: Array<{ field: string; message: string }> = [];

        const buildErrorTree = (
          errors: ValidationError[],
          parentPath: string = '',
        ) => {
          errors.forEach((error) => {
            const fieldPath = parentPath
              ? `${parentPath}.${error.property}`
              : error.property;

            if (error.constraints) {
              // Take only the last constraint (first decorator's message)
              const message = Object.values(error.constraints).pop() as string;
              details.push({ field: fieldPath, message });
            } else if (error.children?.length) {
              // Recurse on error.children with the current path
              buildErrorTree(error.children, fieldPath);
            }
          });
        };

        buildErrorTree(errors);

        return new BadRequestException({ details });
      },
    });
  }
}
