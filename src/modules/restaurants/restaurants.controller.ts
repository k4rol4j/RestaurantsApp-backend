import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { SearchRestaurantsDto } from './dto/search-restaurants.dto';
import { FilterRestaurantsDto } from './dto/filter-restaurants.dto';
import { ReviewRestaurantDto } from './dto/review-restaurant.dto';
import { TokenGuard } from '../auth/token-guard';
import { UserID } from '../auth/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantService: RestaurantsService) {}

  @Get()
  @UseGuards(TokenGuard)
  listRestaurants() {
    return this.restaurantService.restaurantsList();
  }

  @Get('search')
  searchRestaurants(@Query() searchDto: SearchRestaurantsDto) {
    console.log('searchDto', searchDto);
    return this.restaurantService.searchRestaurants(searchDto);
  }

  @Post('filter')
  filterRestaurants(@Body() filterDto: FilterRestaurantsDto) {
    return this.restaurantService.filterRestaurants(filterDto);
  }

  @Get('reviews/:restaurantId')
  getReviews(@Param('restaurantId') restaurantId: number) {
    return this.restaurantService.reviewRestaurants(restaurantId);
  }

  @UseGuards(TokenGuard)
  @Get('reviews/check/:restaurantId')
  async canAddReview(
    @Param('restaurantId') restaurantId: number,
    @UserID() userId: number,
  ) {
    return this.restaurantService.canUserReviewRestaurant(userId, restaurantId);
  }

  // 🔹 Teraz korzysta z tabeli Cuisine
  @Get('cuisines')
  async getCuisines() {
    return this.restaurantService.getAvailableCuisines();
  }

  @Post('reviews')
  @UseGuards(TokenGuard)
  addReview(@Body() reviewDto: ReviewRestaurantDto, @UserID() userId: number) {
    return this.restaurantService.addReviews(reviewDto, userId);
  }

  @Get('nearby')
  async getNearby(
    @Query('latitude') lat: string,
    @Query('longitude') lng: string,
    @Query('radius') radius: string,
  ) {
    return this.restaurantService.findNearbyRestaurants({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius: parseFloat(radius),
    });
  }

  @Get('cities')
  async getCities() {
    const all = await this.restaurantService.restaurantsList();
    const citiesMap = new Map();

    for (const r of all) {
      if (!r.address || !r.address.city) continue;

      const cityKey = r.address.city.toLowerCase();

      if (!citiesMap.has(cityKey)) {
        citiesMap.set(cityKey, {
          label: r.address.city,
          value: cityKey,
          latitude: r.address.latitude,
          longitude: r.address.longitude,
        });
      }
    }

    return Array.from(citiesMap.values());
  }

  @Get(':id/menu')
  async getRestaurantMenu(@Param('id', ParseIntPipe) id: number) {
    const r = await this.restaurantService.getRestaurantById(id);
    return Array.isArray((r as any).menu) ? (r as any).menu : [];
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyRestaurants(@Req() req) {
    return this.restaurantService.getOwned(req.user.id);
  }

  @Get(':id')
  async getRestaurant(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.getRestaurantById(id);
  }

  @Get(':id/available-tables')
  async availableTables(
    @Param('id', ParseIntPipe) id: number,
    @Query('start') startISO: string,
    @Query('end') endISO: string,
    @Query('people', ParseIntPipe) people: number,
  ) {
    if (!startISO || !endISO || !people) {
      throw new BadRequestException('Missing start/end/people');
    }
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid start/end');
    }
    return this.restaurantService.findAvailableTables({
      restaurantId: id,
      start,
      end,
      people,
    });
  }
}
