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

Martin goes here

create data base 
```bash
cd data

docker run --name eroad-db \
  --platform linux/amd64 \
  -e POSTGRES_PASSWORD=1234 \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4

```

Populate database with geojson
```bash
docker run --net=host -v "$(pwd)":/data ghcr.io/osgeo/gdal:ubuntu-full-3.6.3 \
  ogr2ogr -f "PostgreSQL" PG:"host=127.0.0.1 port=5432 user=postgres dbname=postgres password=1234" \
  /data/sampleData.geojson \
  -nln public.nz_data \
  -nlt PROMOTE_TO_MULTI

```

Running martin
```bash
docker run \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432/geofence \
  ghcr.io/maplibre/martin:1.0.0 
```

Running Martin With Eroad Test DB with config
```bash
docker run \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432/geofence \
  ghcr.io/maplibre/martin:1.0.0 \
  --config config2.yaml
```

If you only want to expose a certain organisation, configure martin to include a new catalog using config.yaml
```bash
postgres:
  connection_string: "postgres://geofence:IjFf1-TtRFwQ3RB1HWu6MGngd8aWWphb@dbgeofencereadonly.test.erdmg.com:5432"
  default_srid: 4326

  table:  >
      (
        SELECT *
        FROM geofence g
        WHERE g.organisation = '63908dd6-80aa-4398-892f-13392a390ae8'
      ) AS t
  geometry_column: polygon
  srid: 4326  
```

SQL Function
```bash
create or REPLACE 
function public.geofences_by_org (
	  z integer,
	  x integer,
	  y integer,
	  query_params json		
  )
  returns bytea as $$
  
declare
	 mvt bytea;
begin
	SELECT INTO mvt ST_AsMVT(tile, 'geofences', 4096, 'geom')
	from (
        select
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

      AND g.organisation =
        (query_params->>'organisation')::uuid
		
	) AS tile
	 WHERE geom IS NOT NULL;
	
	 RETURN mvt;
end
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;


```

---

## 3: Frontend (React + MapLibre GL)

A React TypeScript application that visualizes the generated vector tiles using MapLibre GL.

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Navigate to frontend folder**
```bash
cd frontend/react-ts
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Map**
Update `src/config/mapConfig.ts` if needed:
- `initialCenter`: Map center coordinates [lng, lat]
- `initialZoom`: Initial zoom level
- `sources.PLANETILER.url`: Tile server URL

### Usage

1. **Start Development Server**
```bash
npm run dev
```

2. **Build for Production**
```bash
npm run build
```

3. **Preview Production Build**
```bash
npm run preview
```

### Project Structure

```
frontend/react-ts/src/
├── components/          # React components
│   └── map.tsx         # Main map component
├── config/             # Configuration files
│   ├── mapConfig.ts    # Map settings (center, zoom, sources)
│   └── mapStyles.ts    # Layer definitions and styling
├── hooks/              # Custom React hooks
│   └── useMap.ts       # Map initialization logic
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

### Map Layers

The frontend displays three layers from the vector tiles:

- **Geofences** - Red filled polygons with 50% opacity
- **Trips** - Blue lines (2px width)
- **Stops** - Green circles (4px radius)

### Customization

**To change layer styles**, edit `src/config/mapStyles.ts`:

```typescript
export const MAP_LAYERS: LayerSpecification[] = [
  {
    id: 'geofences-layer',
    type: 'fill',
    'source-layer': 'geofences',
    paint: {
      'fill-color': '#ff0000',  // Change color
      'fill-opacity': 0.5        // Change opacity
    }
  },
  // ...
];
```

**To change map center/zoom**, edit `src/config/mapConfig.ts`:

```typescript
export const MAP_CONFIG = {
  initialCenter: [174.7633, -36.8485] as [number, number], // Auckland
  initialZoom: 10,
  // ...
};
```

---

## Full Pipeline Workflow

1. **Generate Data**
```bash
cd dataGeneration
npx tsx main.ts
# Creates dataGeneration/data/sampleData.geojson
```
2. **Generate Tiles**
```bash
cd planetiler
java -jar target/planetiler-1.0-SNAPSHOT.jar --force --tile-compression=none
# Creates tiles in planetiler/outputTiles/
```

3. **Serve Tiles**
```bash
cd planetiler
npx http-server outputTiles --cors -p 8080
```

4. **Start Frontend**
```bash
cd frontend/react-ts
npm run dev
# Open browser to http://localhost:5173
```

---

## Troubleshooting

### No Data Visible on Map

1. **Check tile server is running**: Visit `http://localhost:8080/metadata.json`
2. **Check CORS**: Ensure `http-server` started with `--cors` flag
3. **Check layer names**: Verify `source-layer` in `mapStyles.ts` matches layers in `metadata.json`
4. **Check zoom level**: Data is only visible at zoom levels 0-14

### 404 Errors in Browser Console

This is normal for sparse data. Tiles are only generated where features exist.

