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
        const formattedErrors: Record<string, any> = {};

        const buildErrorTree = (
          errors: ValidationError[],
          target: Record<string, any>,
        ) => {
          errors.forEach((error) => {
            if (error.constraints) {
              // Take only the last constraint (first decoratorâ€™s message)
              target[error.property] = Object.values(error.constraints).pop();
            } else if (error.children?.length) {
              // Initialize nested object if it does not exist
              if (!target[error.property]) {
                target[error.property] = {}; // Simplified: always an object
              }
              // Recurse on error.children
              buildErrorTree(error.children, target[error.property]);
            }
          });
        };

        buildErrorTree(errors, formattedErrors);

        return new BadRequestException(formattedErrors || {});
      },
    });
  }
}
