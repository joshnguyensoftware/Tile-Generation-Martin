import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { MAP_CONFIG } from "./mapConfig";
import { MAP_TILE_SIZE } from "./mapConfig";
import { LAYER_IDS } from "./mapConfig";

export const MAP_SOURCES: Record<string, SourceSpecification> = {
    "here-map": {
        type: "raster",
        tiles: [MAP_CONFIG.sources.HERE.url],
        tileSize: MAP_TILE_SIZE,
        attribution: MAP_CONFIG.sources.HERE.attribution
    },

    "custom-tiles": {
        type: "vector",
        tiles: [MAP_CONFIG.sources.CUSTOM_TILES.url],
    }
} 

export const MAP_LAYERS: LayerSpecification[] = [

    {
        id: "base-map",
        type: "raster",
        source: "here-map",
        minzoom: 0,
        maxzoom: 22
    },

    {
        id: "geofences-layer",
        type: "fill",
        source: "custom-tiles",
        'source-layer': 'geofence_org_63908dd6',
        paint: { "fill-color": "#ff0000",
                 "fill-opacity": 0.5 },
        filter: ["==", "$type", "Polygon"]
    },

    {
        id: "trips-layer",
        type: "line",
        source: "custom-tiles",
        'source-layer': 'geofence',
        paint: {
            "line-color": "#0000ff",
            "line-width": 2
        },
        filter: ["==", "$type", "LineString"]
    },

    {
        id: "stops-layer",
        type: "circle",
        source: "custom-tiles",
        'source-layer': 'geofence',
        paint: {
            "circle-color": "#00ff00",
            "circle-radius": 4
        },
        filter: ["==", "$type", "Point"]
    }
];
