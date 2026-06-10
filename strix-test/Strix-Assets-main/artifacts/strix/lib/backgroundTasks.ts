import * as TaskManager from 'expo-task-manager';
import { updateCurrentSpeed } from './sensorUtils';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Location data type received from the background task
interface LocationData {
  locations: Array<{
    coords: {
      latitude: number;
      longitude: number;
      speed: number | null;
    };
  }>;
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[Strix BackgroundTask] Error in background location task:", error);
    return;
  }
  if (data) {
    const { locations } = data as LocationData;
    if (locations && locations.length > 0) {
      const latestLocation = locations[locations.length - 1];

      if (latestLocation.coords.speed !== null && latestLocation.coords.speed !== undefined) {
        const safeSpeedKmh = Math.max(0, latestLocation.coords.speed) * 3.6;
        updateCurrentSpeed(safeSpeedKmh);
      }
    }
  }
});
