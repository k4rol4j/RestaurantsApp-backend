import {
  Body,
  Controller,
  Get,
  Param,
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

  @Get('cuisines')
  async getCuisines() {
    const all = await this.restaurantService.restaurantsList();
    const cuisines = [...new Set(all.map((r) => r.cuisine))];
    return cuisines;
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
      if (!r.location || !r.latitude || !r.longitude) continue;

      const cityKey = r.location.toLowerCase();
      if (!citiesMap.has(cityKey)) {
        citiesMap.set(cityKey, {
          label: r.location,
          value: cityKey,
          latitude: r.latitude,
          longitude: r.longitude,
        });
      }
    }

    return Array.from(citiesMap.values());
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyRestaurants(@Req() req) {
    return this.restaurantService.getOwned(req.user.id);
  }

  @Get(':id(\\d+)')
  async getRestaurant(@Param('id') id: string) {
    return this.restaurantService.getRestaurantById(Number(id));
  }
}
