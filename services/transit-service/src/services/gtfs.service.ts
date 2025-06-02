import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';
import { AgencyRepository } from '../repositories/agency.repository';
import { StopRepository } from '../repositories/stop.repository';
import { RouteRepository } from '../repositories/route.repository';
import { FeedEntity } from '../entities/feed.entity';

@Injectable()
export class GtfsService {
  private readonly logger = new Logger(GtfsService.name);
  private readonly storagePath: string;
  private readonly maxFileSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly agencyRepository: AgencyRepository,
    private readonly stopRepository: StopRepository,
    private readonly routeRepository: RouteRepository,
  ) {
    this.storagePath = this.configService.get('gtfs.storagePath') || '/tmp/gtfs-data';
    this.maxFileSize = this.configService.get('gtfs.maxFileSize') || 104857600;
  }

  async downloadAndProcessFeed(feed: FeedEntity): Promise<void> {
    const feedPath = path.join(this.storagePath, feed.feedId);

    try {
      // Create directory for feed
      await fs.mkdir(feedPath, { recursive: true });

      // Download GTFS zip file
      const zipPath = path.join(feedPath, 'gtfs.zip');
      await this.downloadFile(feed.feedUrl, zipPath);

      // Extract zip file
      await this.extractZip(zipPath, feedPath);

      // Process GTFS files
      await this.processGtfsFiles(feedPath, feed.feedId);

      // Clean up zip file
      await fs.unlink(zipPath);

      this.logger.log(`Successfully processed GTFS feed: ${feed.feedId}`);
    } catch (error) {
      this.logger.error(`Error processing GTFS feed ${feed.feedId}:`, error);
      throw error;
    }
  }

  private async downloadFile(url: string, destination: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size`);
    }

    const fileStream = createWriteStream(destination);
    await pipeline(response.body, fileStream);
  }

  private async extractZip(zipPath: string, outputPath: string): Promise<void> {
    await pipeline(createReadStream(zipPath), unzipper.Extract({ path: outputPath }));
  }

  private async processGtfsFiles(feedPath: string, feedId: string): Promise<void> {
    // Process files in order of dependencies
    await this.processAgencies(feedPath, feedId);
    await this.processStops(feedPath, feedId);
    await this.processRoutes(feedPath, feedId);
    // Additional files can be processed here (trips, stop_times, etc.)
  }

  private async processAgencies(feedPath: string, feedId: string): Promise<void> {
    const agencyFile = path.join(feedPath, 'agency.txt');

    try {
      await fs.access(agencyFile);
    } catch {
      this.logger.warn(`No agency.txt file found for feed ${feedId}`);
      return;
    }

    const agencies: any[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        agencies.push({
          agencyId: record.agency_id || feedId,
          agencyName: record.agency_name,
          agencyUrl: record.agency_url,
          agencyTimezone: record.agency_timezone,
          agencyLang: record.agency_lang,
          agencyPhone: record.agency_phone,
          agencyFareUrl: record.agency_fare_url,
          feedId,
        });
      }
    });

    const stream = createReadStream(agencyFile);
    stream.pipe(parser);

    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
    });

    if (agencies.length > 0) {
      await this.agencyRepository.upsert(agencies);
      this.logger.log(`Processed ${agencies.length} agencies for feed ${feedId}`);
    }
  }

  private async processStops(feedPath: string, feedId: string): Promise<void> {
    const stopsFile = path.join(feedPath, 'stops.txt');

    try {
      await fs.access(stopsFile);
    } catch {
      this.logger.warn(`No stops.txt file found for feed ${feedId}`);
      return;
    }

    const stops: any[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        stops.push({
          stopId: record.stop_id,
          stopCode: record.stop_code,
          stopName: record.stop_name,
          stopDesc: record.stop_desc,
          stopLat: parseFloat(record.stop_lat),
          stopLon: parseFloat(record.stop_lon),
          zoneId: record.zone_id,
          stopUrl: record.stop_url,
          locationType: parseInt(record.location_type || '0'),
          parentStation: record.parent_station,
          stopTimezone: record.stop_timezone,
          wheelchairBoarding: parseInt(record.wheelchair_boarding || '0'),
          feedId,
        });
      }
    });

    const stream = createReadStream(stopsFile);
    stream.pipe(parser);

    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
    });

    if (stops.length > 0) {
      // Process in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < stops.length; i += batchSize) {
        const batch = stops.slice(i, i + batchSize);
        await this.stopRepository.upsert(batch);
      }
      this.logger.log(`Processed ${stops.length} stops for feed ${feedId}`);
    }
  }

  private async processRoutes(feedPath: string, feedId: string): Promise<void> {
    const routesFile = path.join(feedPath, 'routes.txt');

    try {
      await fs.access(routesFile);
    } catch {
      this.logger.warn(`No routes.txt file found for feed ${feedId}`);
      return;
    }

    const routes: any[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        routes.push({
          routeId: record.route_id,
          agencyId: record.agency_id,
          routeShortName: record.route_short_name,
          routeLongName: record.route_long_name,
          routeDesc: record.route_desc,
          routeType: parseInt(record.route_type),
          routeUrl: record.route_url,
          routeColor: record.route_color,
          routeTextColor: record.route_text_color,
          routeSortOrder: record.route_sort_order ? parseInt(record.route_sort_order) : null,
          feedId,
        });
      }
    });

    const stream = createReadStream(routesFile);
    stream.pipe(parser);

    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
    });

    if (routes.length > 0) {
      await this.routeRepository.upsert(routes);
      this.logger.log(`Processed ${routes.length} routes for feed ${feedId}`);
    }
  }

  async cleanupFeedData(feedId: string): Promise<void> {
    // Delete data in reverse order of dependencies
    await this.routeRepository.deleteByFeed(feedId);
    await this.stopRepository.deleteByFeed(feedId);
    await this.agencyRepository.deleteByFeed(feedId);

    // Clean up files
    const feedPath = path.join(this.storagePath, feedId);
    try {
      await fs.rm(feedPath, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to clean up feed directory: ${feedPath}`, error);
    }
  }
}

// Helper to create write stream (import from 'fs')
import { createWriteStream } from 'fs';
