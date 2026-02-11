# Tile Generation with Martin

A complete tile generation and visualization pipeline for displaying geospatial data (Geofences, Trips, Stops) using PostGIS and Martin tile server.

## Architecture

1. **Data Generation** - TypeScript script generates synthetic GeoJSON data
2. **PostGIS Database** - Stores geospatial data with spatial indexing
3. **Martin Tile Server** - Dynamically generates vector tiles from PostGIS
4. **Frontend** - React + MapLibre GL visualizes the tiles

---

## 1: Data Generation

A TypeScript script to generate features of synthetic GeoJSON data (Geofences, Trips, Stops) within New Zealand.

The current distribution ratio is 40% Geofences, 40% Trips and 20% Stops.

### Usage

1. **Install and Create Data Folder**
```bash
cd dataGeneration && npm install
mkdir -p data
```

2. **Run**
```bash
npx tsx main.ts
```

3. **Test**
```bash
npm test
```

### Configuration
Adjust `TOTAL_FEATURES` and distribution ratios in `dataGeneration/constants.ts`.

### Output
The script generates a file named `sampleData.geojson` at `dataGeneration/data/sampleData.geojson`.

---

## 2: Database Setup & Martin Tile Server

### Setting Up the PostGIS Database

**1. Create and Start the Database**
```bash
cd data

docker run --name eroad-db \
  --platform linux/amd64 \
  -e POSTGRES_PASSWORD=1234 \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4
```

**2. Import GeoJSON Data**
```bash
docker run --net=host -v "$(pwd)":/data ghcr.io/osgeo/gdal:ubuntu-full-3.6.3 \
  ogr2ogr -f "PostgreSQL" PG:"host=127.0.0.1 port=5432 user=postgres dbname=postgres password=1234" \
  /data/sampleData.geojson \
  -nln public.nz_data \
  -nlt PROMOTE_TO_MULTI
```

---

### Running Martin Tile Server

**Basic Usage (Local Database)**
```bash
docker run \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:1234@host.docker.internal:5432/postgres \
  ghcr.io/maplibre/martin:1.0.0
```

**With EROAD Test Database**
```bash
docker run \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432/geofence \
  ghcr.io/maplibre/martin:1.0.0
```

**With Configuration File**
```bash
docker run \
  -p 3000:3000 \
  -v $(pwd)/config.yaml:/config.yaml \
  -e DATABASE_URL=postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432/geofence \
  ghcr.io/maplibre/martin:1.0.0 \
  --config /config.yaml
```

---

### Martin Configuration (config.yaml)

To filter data by organization, create a `config.yaml` file:

```yaml
postgres:
  connection_string: "postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432"
  default_srid: 4326

  table: >
    (
      SELECT *
      FROM geofence g
      WHERE g.organisation = '63908dd6-80aa-4398-892f-13392a390ae8'
    ) AS t
  geometry_column: polygon
  srid: 4326
```

---

### Custom SQL Function (Advanced)

For dynamic filtering by organization via URL parameters:

```sql
CREATE OR REPLACE FUNCTION public.geofences_by_org(
  z integer,
  x integer,
  y integer,
  query_params json
)
RETURNS bytea AS $$
DECLARE
  mvt bytea;
BEGIN
  SELECT INTO mvt ST_AsMVT(tile, 'geofences', 4096, 'geom')
  FROM (
    SELECT
      g.gid AS id,
      g.name,
      g.start_date,
      g.end_date,
      g.organisation,
      g.contains_public_road,
      g.public_override_reason,
      ST_AsMVTGeom(
        ST_Transform(ST_CurveToLine(g.polygon), 3857),
        ST_TileEnvelope(z, x, y),
        4096,
        64,
        true
      ) AS geom
    FROM geofence g
    WHERE
      g.polygon && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
      AND g.organisation = (query_params->>'organisation')::uuid
  ) AS tile
  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
```

This function allows filtering geofences by passing `organisation` as a query parameter in the tile request.

