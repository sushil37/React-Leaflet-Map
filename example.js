// Playground-only code. The reusable wrapper stays in src/map.js.
import L from 'leaflet';
import { createMap } from './src/map.js';

const $ = id => document.getElementById(id);
const controller = new AbortController();
const listen = (id, event, callback) => $(id).addEventListener(event, callback, { signal: controller.signal });
const home = [27.71025, 85.324];
const instance = createMap('map', { locations: [], center: home });
const { map } = instance;
let defaultIcon;
let markerSequence = 0;
const features = L.featureGroup().addTo(map);
// Reuse the wrapper's asset-safe default icon for the classic option.
const sample = instance.addMarker({ name: 'Icon template', latitude: home[0], longitude: home[1] });
defaultIcon = sample.options.icon;
sample.remove();
L.control.scale({ imperial: false }).addTo(map);
let circle;
let pinNumber = 0;
let lastCode = '';
const fmt = point => `[${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}]`;
const say = message => { $('status').textContent = message; };
const setup = `import L from 'leaflet';\nimport { createMap } from 'lightweight-leaflet-map';\nimport 'lightweight-leaflet-map/style.css';\n\n// Supply <div id="map" style="height: 400px"></div>.\nconst instance = createMap('map', {\n  locations: [], center: [27.71025, 85.324], zoom: 13,\n});\n`;
function showCode(title, code, help = 'Native Leaflet API through instance.map. Import L for shapes and GeoJSON.') {
  $('code-title').textContent = title;
  $('code-help').textContent = help;
  lastCode = setup + '\n' + code;
  $('code').textContent = lastCode;
  $('copy-code').textContent = 'Copy code';
}
function snapshot() {
  const data = features.toGeoJSON();
  // GeoJSON cannot represent a circle, so retain its radius as a property.
  features.eachLayer(layer => {
    if (layer instanceof L.Circle) {
      const feature = data.features.find(item => item.properties.playgroundId === layer._playgroundId);
      if (feature) feature.properties.radiusMeters = layer.getRadius();
    }
  });
  return data;
}
let featureId = 0;
function register(layer, name) {
  layer._playgroundId = ++featureId;
  layer.feature = { type: 'Feature', properties: { name, playgroundId: featureId } };
  features.addLayer(layer);
  refresh();
  return layer;
}
function refresh() {
  $('feature-count').textContent = `${features.getLayers().length} ${features.getLayers().length === 1 ? 'feature' : 'features'}`;
  $('geojson-preview').textContent = JSON.stringify(snapshot(), null, 2);
}
function eventLog(message) {
  const item = document.createElement('li');
  item.textContent = message;
  $('events').prepend(item);
  while ($('events').children.length > 8) $('events').lastChild.remove();
}
function markerIcon(number) {
  const style = $('marker-style').value;
  if (style === 'default') return defaultIcon;
  const element = document.createElement('span');
  element.className = 'map-pin';
  element.style.setProperty('--pin-color', $('marker-color').value);
  if (style === 'number') element.textContent = String(number);
  return L.divIcon({
    html: element, className: `custom-marker ${style}`,
    iconSize: style === 'dot' ? [22, 22] : [30, 30],
    iconAnchor: style === 'pin' ? [15, 36] : style === 'dot' ? [11, 11] : [15, 15],
    popupAnchor: [0, -30],
  });
}
function shapeOptions() {
  return { color: $('shape-color').value, fillOpacity: Number($('shape-opacity').value) / 100 };
}
function showStyleCode() {
  const style = $('marker-style').value;
  const color = $('marker-color').value;
  if (style === 'default') {
    showCode('Keep the classic Leaflet marker', `instance.addMarker({ name: 'Place', latitude: 27.71, longitude: 85.326 });`, 'The bundled default marker needs no custom icon or CSS.');
    return;
  }
  showCode('Bring your own marker style', `// An HTMLElement keeps dynamic labels out of HTML strings.
const badge = document.createElement('span');
badge.textContent = '1';
Object.assign(badge.style, {
  display: 'grid', placeItems: 'center', width: '30px', height: '30px',
  background: '${color}', color: 'white', border: '3px solid white',
  borderRadius: '${style === 'dot' ? '50%' : style === 'pin' ? '50% 50% 50% 0' : '10px'}',
  boxShadow: '0 3px 10px #15372e45',${style === 'pin' ? "\n  transform: 'rotate(-45deg)'," : ''}
});
const icon = L.divIcon({ html: badge, className: '', iconSize: [30, 30] });
instance.addMarker({ name: 'Place', latitude: 27.71, longitude: 85.326 }, { icon });

// Shape colors use native Leaflet options.
L.circle([27.71, 85.326], ${JSON.stringify({ radius: 500, ...shapeOptions() })}).addTo(instance.map);`, 'Custom icons and CSS live in your app. The wrapper simply forwards native Leaflet marker options.');
}
function applyMarkerStyle() {
  features.eachLayer(layer => { if (layer instanceof L.Marker) {
    layer.setIcon(markerIcon(layer._markerNumber));
    layer.getElement()?.setAttribute('aria-label', layer.options.title || 'Location');
  } });
  showStyleCode();
  say('Marker appearance updated. Your choices also apply to new pins.');
}
function applyShapeStyle() {
  features.eachLayer(layer => { if (layer.setStyle) layer.setStyle(shapeOptions()); });
  $('opacity-value').textContent = `${$('shape-opacity').value}%`;
  showStyleCode();
  say('Shape color and fill updated.');
}
listen('marker-color', 'input', applyMarkerStyle);
listen('marker-style', 'change', applyMarkerStyle);
listen('shape-color', 'input', applyShapeStyle);
listen('shape-opacity', 'input', applyShapeStyle);
function addPin(point, name) {
  const marker = instance.addMarker({ name, latitude: point.lat, longitude: point.lng }, { icon: markerIcon(++markerSequence) });
  marker._markerNumber = markerSequence;
  marker.getElement()?.setAttribute('aria-label', name);
  if (!$('draggable').checked) marker.dragging.disable();
  marker.on('move', refresh);
  marker.on('dragend', () => {
    say(`${name} moved to ${fmt(marker.getLatLng())}.`);
    eventLog(`dragend · ${fmt(marker.getLatLng())}`);
    showCode('Move a marker', `const marker = instance.addMarker(${JSON.stringify({ name, latitude: point.lat, longitude: point.lng }, null, 2)});\nmarker.setLatLng(${fmt(marker.getLatLng())});`);
  });
  register(marker, name);
  return marker;
}
function fit() {
  if (!features.getLayers().length) { say('Add a pin or shape first, then fit the map.'); return; }
  map.fitBounds(features.getBounds(), { padding: [35, 35], maxZoom: 16, animate: false });
  say('Map fitted to all visible features.');
}
function clear() {
  features.clearLayers();
  circle = undefined;
  refresh();
}
function loadScenario() {
  clear();
  pinNumber = 0;
  markerSequence = 0;
  map.stopLocate();
  map.setView(home, 13, { animate: false });
  const scenario = $('scenario').value;
  $('click-to-add').checked = scenario === 'delivery';
  $('draggable').checked = scenario !== 'venue';
  const locations = scenario === 'venue'
    ? [{ name: 'Event entrance', latitude: 27.71, longitude: 85.326 }]
    : scenario === 'delivery' ? [] : [
      { name: 'Kathmandu office', latitude: 27.71, longitude: 85.326 },
      { name: 'Pickup point', latitude: 27.7105, longitude: 85.322 },
    ];
  locations.forEach(place => addPin(L.latLng(place.latitude, place.longitude), place.name));
  const descriptions = {
    places: 'Click a pin for coordinates, then drag it to a new spot.',
    venue: 'A fixed venue marker for an event page. Dragging is off.',
    delivery: 'Click the map to choose one delivery point. Click again to move it.',
    trail: 'Connect stops with a sample line. This is not a routing service.',
  };
  $('scenario-help').textContent = descriptions[scenario];
  if (scenario === 'venue') { map.setZoom(16); features.getLayers()[0].openPopup(); }
  if (scenario === 'trail') addTrail();
  else if (scenario === 'delivery') showCode('Choose a delivery point', `let marker;\ninstance.map.on('click', ({ latlng }) => {\n  if (marker) marker.setLatLng(latlng);\n  else marker = instance.addMarker({\n    name: 'Delivery point', latitude: latlng.lat, longitude: latlng.lng,\n  });\n});`, 'Wrapper markers plus the Leaflet click event. Click again to reposition the same point.');
  else showCode(scenario === 'venue' ? 'Show a fixed venue' : 'Start with a few lines', `const locations = ${JSON.stringify(locations, null, 2)};\nlocations.forEach(place => {\n  const marker = instance.addMarker(place);${scenario === 'venue' ? '\n  marker.dragging.disable();\n  marker.openPopup();' : ''}\n});`, 'Wrapper API for markers and popups. The setup below works with a bundler and the npm package.');
  say(descriptions[scenario]);
  eventLog(`scenario · ${scenario}`);
}
function around() {
  const { lat, lng } = map.getCenter();
  return [[lat - .004, lng - .006], [lat + .004, lng - .002], [lat + .002, lng + .006]];
}
function addTrail() {
  const points = around();
  register(L.polyline(points, { ...shapeOptions(), weight: 5 }).bindPopup('Sample walking trail · not calculated directions'), 'Sample trail');
  showCode('Connect stops with a line', `L.polyline(${JSON.stringify(points)}, {\n  color: '${$('shape-color').value}', weight: 5,\n}).addTo(instance.map).bindPopup('Sample trail');`);
  say('Sample trail added. Lines connect coordinates; no routing service is used.');
}
listen('scenario', 'change', loadScenario);
listen('add-location', 'click', () => {
  const point = map.getCenter();
  const name = $('marker-name').value.trim() || `Place ${++pinNumber}`;
  addPin(point, name).openPopup();
  showCode('Add a named pin', `instance.addMarker(${JSON.stringify({ name, latitude: point.lat, longitude: point.lng }, null, 2)}).openPopup();`, 'Wrapper API. Marker names are treated as text. Dragging refreshes the coordinate popup.');
  say('Pin added at the map center. Drag it to adjust.');
});
map.on('click', ({ latlng }) => {
  $('coordinates').textContent = `Clicked ${fmt(latlng)}`;
  eventLog(`click · ${fmt(latlng)}`);
  if (!$('click-to-add').checked) return;
  if ($('scenario').value === 'delivery') {
    const marker = features.getLayers().find(layer => layer instanceof L.Marker);
    if (marker) marker.setLatLng(latlng);
    else addPin(latlng, 'Delivery point');
    say(`Delivery point: ${fmt(latlng)}. Drag it to fine-tune.`);
  } else {
    addPin(latlng, $('marker-name').value.trim() || 'Selected point');
    showCode('Drop a pin on click', `instance.map.on('click', ({ latlng }) => {\n  instance.addMarker({\n    name: 'Selected point', latitude: latlng.lat, longitude: latlng.lng,\n  });\n});`);
    say(`Pin added at ${fmt(latlng)}.`);
  }
});
listen('click-to-add', 'change', () => say($('click-to-add').checked ? 'Click the map to place a pin.' : 'Click-to-add is off. You can still inspect coordinates.'));
listen('draggable', 'change', () => {
  features.eachLayer(layer => { if (layer.dragging) layer.dragging[$('draggable').checked ? 'enable' : 'disable'](); });
  showCode('Control marker dragging', `const marker = instance.addMarker({ name: 'Place', latitude: 27.71, longitude: 85.326 });\nmarker.dragging.${$('draggable').checked ? 'enable' : 'disable'}();`);
  say($('draggable').checked ? 'Marker dragging enabled.' : 'Markers are fixed in place.');
});
listen('scroll-zoom', 'change', () => {
  const enabled = $('scroll-zoom').checked;
  map.scrollWheelZoom[enabled ? 'enable' : 'disable']();
  showCode('Control scroll wheel zoom', `instance.map.scrollWheelZoom.${enabled ? 'enable' : 'disable'}();`);
  say(`Scroll wheel zoom ${enabled ? 'enabled' : 'disabled'}.`);
});
listen('circle', 'click', () => {
  if (circle) features.removeLayer(circle);
  const point = map.getCenter();
  const radius = Number($('radius').value);
  circle = register(L.circle(point, { radius, ...shapeOptions() }).bindPopup('Example service area'), 'Service area');
  showCode('Show a service radius', `L.circle(${fmt(point)}, {\n  radius: ${radius}, color: '${$('shape-color').value}', fillOpacity: ${shapeOptions().fillOpacity},\n}).addTo(instance.map);`);
  say(`Service area added: ${radius} meter radius. Adjust it with the slider.`);
});
listen('radius', 'input', () => {
  const radius = Number($('radius').value);
  $('radius-value').textContent = `${radius.toLocaleString()} m`;
  if (!circle) { say('Click “Radius circle” to add the adjustable service area.'); return; }
  circle.setRadius(radius);
  refresh();
  showCode('Adjust a service radius', `const circle = L.circle(${fmt(circle.getLatLng())}, { radius: ${radius} }).addTo(instance.map);\ncircle.setRadius(${radius});`);
});
listen('polygon', 'click', () => {
  const points = around();
  register(L.polygon(points, shapeOptions()).bindPopup('Example service boundary'), 'Service boundary');
  showCode('Outline an area', `L.polygon(${JSON.stringify(points)}, {\n  color: '${$('shape-color').value}', fillOpacity: ${shapeOptions().fillOpacity},\n}).addTo(instance.map);`);
  say('Area polygon added. Click the shape to open its popup.');
});
listen('route', 'click', addTrail);
listen('geojson', 'click', () => {
  const { lat, lng } = map.getCenter();
  const data = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { name: 'Cafe' }, geometry: { type: 'Point', coordinates: [lng - .003, lat + .002] } },
    { type: 'Feature', properties: { name: 'Meeting point' }, geometry: { type: 'Point', coordinates: [lng + .003, lat - .002] } },
  ] };
  L.geoJSON(data, {
    pointToLayer: (feature, point) => L.circleMarker(point, { radius: 8, ...shapeOptions() }),
    onEachFeature(feature, layer) {
      const text = document.createElement('span'); text.textContent = feature.properties.name;
      register(layer.bindPopup(text), feature.properties.name);
    },
  });
  showCode('Load a GeoJSON collection', `const data = ${JSON.stringify(data, null, 2)};\nL.geoJSON(data, {\n  pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 8 }),\n}).addTo(instance.map);`, 'Native Leaflet API. GeoJSON coordinates use [longitude, latitude], unlike Leaflet’s [latitude, longitude].');
  say('Two GeoJSON points added. Click a point to see its name.');
});
listen('fit', 'click', () => {
  fit();
  const data = snapshot();
  showCode('Fit your features into view', `const data = ${JSON.stringify(data, null, 2)};\nconst layer = L.geoJSON(data).addTo(instance.map);\nif (data.features.length) {\n  instance.map.fitBounds(layer.getBounds(), { padding: [35, 35], maxZoom: 16 });\n}`);
});
listen('clear', 'click', () => { map.stopLocate(); clear(); say('Features cleared. Add a pin or try another scenario.'); showCode('Remove a group of layers', `const group = L.featureGroup().addTo(instance.map);\ngroup.addLayer(instance.addMarker({ name: 'Place', latitude: 27.71, longitude: 85.326 }));\ngroup.clearLayers();`); });
listen('reset', 'click', () => {
  $('marker-color').value = '#14634e'; $('shape-color').value = '#6661ac';
  $('marker-style').value = 'pin'; $('shape-opacity').value = '20'; $('opacity-value').textContent = '20%';
  $('scenario').value = 'places'; $('marker-name').value = 'My place';
  $('radius').value = '500'; $('radius-value').textContent = '500 m';
  $('scroll-zoom').checked = false; map.scrollWheelZoom.disable();
  loadScenario();
});
listen('locate', 'click', () => {
  say('Requesting your location. Your browser may ask for permission.');
  map.locate();
  showCode('Find the user’s location', `instance.map.on('locationerror', event => {\n  console.log('Location unavailable:', event.message);\n});\n// Call from a user action. The wrapper adds a marker on success.\ninstance.map.locate();`, 'Wrapper geolocation behavior. Requires permission and HTTPS or localhost.');
});
map.on('locationfound', () => {
  const marker = instance.markers.at(-1);
  marker._markerNumber = ++markerSequence;
  marker.setIcon(markerIcon(markerSequence));
  if (!$('draggable').checked) marker.dragging.disable();
  marker.on('move', refresh);
  register(marker, 'Your location');
  say('Your location added. Nothing is saved or sent by this playground.');
  eventLog('locationfound');
});
map.on('locationerror', () => { say('Location unavailable. Check browser permission, or choose a point manually.'); eventLog('locationerror'); });
map.on('moveend zoomend', () => {
  $('zoom-level').textContent = `Zoom ${map.getZoom()}`;
  $('coordinates').textContent = `Center ${fmt(map.getCenter())}`;
});
map.on('moveend', () => eventLog(`moveend · ${fmt(map.getCenter())}`));
map.on('zoomend', () => eventLog(`zoomend · ${map.getZoom()}`));
map.on('baselayerchange', event => { eventLog(`baselayerchange · ${event.name}`); say(`Basemap switched to ${event.name}.`); });
listen('copy-code', 'click', async () => {
  try { await navigator.clipboard.writeText(lastCode); $('copy-code').textContent = 'Copied!'; }
  catch { say('Clipboard unavailable. Select and copy the code below.'); }
});
listen('export', 'click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/geo+json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'my-map.geojson';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say('GeoJSON downloaded. Your data stays in your browser.');
});
loadScenario();
if (import.meta.hot) import.meta.hot.dispose(() => { controller.abort(); instance.destroy(); });
