import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { LineString } from 'geojson';

@Entity({ name: 'shapes', schema: 'transit' })
@Index(['feedId'])
export class ShapeEntity {
  @PrimaryColumn({ name: 'shape_id' })
  shapeId: string;

  @Column({
    name: 'shape_points',
    type: 'jsonb',
  })
  shapePoints: Array<{
    shapePtLat: number;
    shapePtLon: number;
    shapePtSequence: number;
    shapeDistTraveled?: number;
  }>;

  @Column({
    name: 'geometry',
    type: 'geography',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  geometry: LineString;

  @Column({ name: 'feed_id' })
  feedId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
