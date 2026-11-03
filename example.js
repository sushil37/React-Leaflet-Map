// Loaded by the demo. Copy this pattern into your own application.
import { createMap } from './src/map.js';

const status = document.getElementById('status');
const instance = createMap('map', {
  locations: [
    { name: 'Kathmandu office', latitude: 27.71, longitude: 85.326 },
    { name: 'Pickup point', latitude: 27.7105, longitude: 85.322 },
  ],
  onMarkerChange(location) {
    status.textContent = `${location.name}: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    // Save location to your application here. Nothing is sent automatically.
  },
});

const controller = new AbortController();
const eventOptions = { signal: controller.signal };
document.getElementById('add-location').addEventListener('click', () => {
  const { lat, lng } = instance.map.getCenter();
  instance.addMarker({ name: 'New location', latitude: lat, longitude: lng }).openPopup();
  status.textContent = 'Location added at the map center. Drag it to adjust.';
}, eventOptions);
document.getElementById('locate').addEventListener('click', () => {
  status.textContent = 'Requesting your location…';
  instance.map.locate();
}, eventOptions);
instance.map.on('locationfound', () => { status.textContent = 'Your location was added.'; });
instance.map.on('locationerror', () => {
  status.textContent = 'Location unavailable. Check browser permission or add a location manually.';
});

if (import.meta.hot) import.meta.hot.dispose(() => {
  controller.abort();
  instance.destroy();
});
