import { NotFoundException } from '@nestjs/common';

export class RestaurantNotfoundException extends NotFoundException {
  constructor() {
    super('No restaurant found');
  }
}
