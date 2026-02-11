
export const TOTAL_FEATURES: number = 250;
export const OUTPUT_PATH = 'data/sampleData.geojson';

export const RATIOS = {
    GEOFENCE: 0.4,
    TRIP: 0.4,
    STOP: 0.2
}

export const NUM_GEOFENCES = Math.floor(TOTAL_FEATURES * RATIOS.GEOFENCE);
export const NUM_TRIPS = Math.floor(TOTAL_FEATURES * RATIOS.TRIP);
export const NUM_STOPS = TOTAL_FEATURES - NUM_GEOFENCES - NUM_TRIPS; 

export const NZ_BBOX: [number, number, number, number] = [166, -47, 179, -34];
