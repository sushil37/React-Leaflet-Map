import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  tooltipAnchor: [16, -28],
});

export const defaultLocations = [
  { name: 'Location 1', latitude: 27.71, longitude: 85.326 },
  { name: 'Location 2', latitude: 27.7105, longitude: 85.322 },
];

const defaultTileProviders = [
  {
    name: 'Roads',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    options: { maxZoom: 19 },
  },
  {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    options: { maxZoom: 17 },
  },
];

function validateLocation(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
    || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
    throw new TypeError('Locations require numeric latitude (-90 to 90) and longitude (-180 to 180).');
  }
}

/** Mount a map in an element or element ID. Call destroy before removing it. */
export function createMap(container, options = {}) {
  const providers = options.tileProviders ?? defaultTileProviders;
  if (!Array.isArray(providers)) throw new TypeError('tileProviders must be an array.');
  const names = new Set();
  for (const provider of providers) {
    if (!provider || typeof provider.name !== 'string' || !provider.name.trim()
      || typeof provider.url !== 'string' || !provider.url.trim()
      || typeof provider.attribution !== 'string' || !provider.attribution.trim()
      || names.has(provider.name)) {
      throw new TypeError('Tile providers require a unique name, URL, and attribution.');
    }
    names.add(provider.name);
  }
  const locations = options.locations ?? defaultLocations;
  if (!Array.isArray(locations)) throw new TypeError('locations must be an array.');
  locations.forEach(validateLocation);
  if (options.onMarkerChange != null && typeof options.onMarkerChange !== 'function') {
    throw new TypeError('onMarkerChange must be a function.');
  }
  const center = options.center ?? options.mapOptions?.center ?? (locations.length
    ? locations.reduce((sum, place) => [sum[0] + place.latitude / locations.length, sum[1] + place.longitude / locations.length], [0, 0])
    : [27.71025, 85.324]);
  const position = L.latLng(center);
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
    throw new TypeError('center must be a valid Leaflet LatLng.');
  }
  const zoom = options.zoom ?? options.mapOptions?.zoom ?? 13;
  if (!Number.isFinite(zoom)) throw new TypeError('zoom must be a finite number.');
  // Initialize the view after construction so setup errors can be cleaned up.
  const map = L.map(container, { scrollWheelZoom: false, ...options.mapOptions, center: undefined, zoom: undefined, layers: [] });
  let resizeObserver;
  try {
    map.setView(position, zoom);
    options.mapOptions?.layers?.forEach(layer => map.addLayer(layer));
    const baseLayers = Object.create(null);
    providers.forEach((provider, index) => {
      const layer = L.tileLayer(provider.url, { ...provider.options, attribution: provider.attribution });
      // Leaflet layer labels accept HTML; provider names are plain text.
      const label = document.createElement('span');
      label.textContent = provider.name;
      baseLayers[label.innerHTML] = layer;
      if (index === 0) layer.addTo(map);
    });
    if (providers.length > 1) L.control.layers(baseLayers).addTo(map);
    const markers = [];

    function addMarker(location) {
      validateLocation(location);
      const marker = L.marker([location.latitude, location.longitude], {
        icon, draggable: true, title: location.name ?? 'Location',
      }).addTo(map);
      function updatePopup() {
        const { lat, lng } = marker.getLatLng();
        const content = document.createElement('div');
        const heading = document.createElement('h3');
        heading.textContent = location.name ?? 'Location';
        const latitude = document.createElement('p');
        latitude.textContent = `Latitude: ${lat.toFixed(6)}`;
        const longitude = document.createElement('p');
        longitude.textContent = `Longitude: ${lng.toFixed(6)}`;
        content.append(heading, latitude, longitude);
        marker.bindPopup(content);
      }
      updatePopup();
      marker.on('move', updatePopup);
      marker.on('dragend', () => {
        options.onMarkerChange?.({ name: location.name, latitude: marker.getLatLng().lat, longitude: marker.getLatLng().lng }, markers.indexOf(marker));
      });
      markers.push(marker);
      return marker;
    }

    locations.forEach(addMarker);
    map.on('locationfound', ({ latlng }) => {
      addMarker({ name: 'Your location', latitude: latlng.lat, longitude: latlng.lng });
      map.flyTo(latlng, map.getZoom());
    });

    // Leaflet watches the window, but not a container becoming visible or resizing.
    // Re-measure after CSS loads and whenever the embedding layout changes.
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      });
      resizeObserver.observe(map.getContainer());
    }

    let destroyed = false;
    return { map, markers, addMarker, destroy() {
      if (!destroyed) {
        resizeObserver?.disconnect();
        map.remove();
        destroyed = true;
      }
    } };
  } catch (error) {
    resizeObserver?.disconnect();
    map.remove();
    throw error;
  }
}
