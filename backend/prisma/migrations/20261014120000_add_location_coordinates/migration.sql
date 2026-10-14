ALTER TABLE "locations"
  ADD COLUMN "latitude" DECIMAL(9,6),
  ADD COLUMN "longitude" DECIMAL(10,6);

ALTER TABLE "locations" ADD CONSTRAINT "locations_coordinate_range"
  CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR
    ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND
     "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180));
