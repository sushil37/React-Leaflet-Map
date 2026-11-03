# Lightweight Leaflet Map

A small wrapper around the **official [Leaflet](https://leafletjs.com) package** for applications that need a useful map without a lot of setup. Give it a container and some locations: it handles tile layers, marker images, draggable markers, and coordinate popups.

**Leaflet does the mapping.** It was created by **Volodymyr Agafonkin**, with contributions from the Leaflet community. This project builds on their work and does not claim authorship of Leaflet. It uses the official npm dependency, rather than maintaining a fork of Leaflet's source. This is an independent wrapper, with no claimed affiliation or endorsement.

## Who is this for?

Use it for a contact page with office locations, a pickup or delivery location picker, a small directory, or a dashboard where users adjust a location. It works with plain JavaScript and frameworks that can provide a DOM element.

Use Leaflet directly when you need custom rendering or a complex GIS application. This wrapper keeps the common setup short and exposes the underlying map and markers when you need more.

### Common application scenarios

| Scenario | What users can do | What your application supplies |
| --- | --- | --- |
| Store or branch locator | View branches and open a selected location | Branch data and a searchable list |
| Delivery or pickup form | Choose a point and adjust its coordinates | Form fields and address validation |
| Event or wedding page | See a fixed venue and meeting points | Venue coordinates and event details |
| Property listings | See properties together and focus on one | Listing data, filters, and detail links |
| Field inspection | Mark a survey or maintenance location | Report form, record IDs, and storage |
| Travel itinerary | View accommodation and planned stops | Ordered destinations; routing is separate |
| Admin data correction | Move an incorrectly placed marker | Save permissions and your update API |
| Saved personal places | Restore locations in the same browser | Optional local storage and a reset action |
| Provider-backed production app | Use your chosen tile service | Provider account, attribution, and usage limits |

The examples below cover these building blocks without adding runtime dependencies. Each snippet is independent unless it explicitly uses an existing `instance`. Import `createMap` and the stylesheet as shown in the integration section, and provide the referenced HTML elements.

## Try the working example

Use Node.js 20.19+ or 22.12+ and npm 10+.

```sh
npm install
npm start
```

Open http://localhost:3000. The demo already loads [`example.js`](./example.js). It shows:

- Named office and pickup locations with coordinate popups.
- Draggable markers and a visible coordinate update after dragging.
- Adding a location at the center of the map.
- Browser geolocation with a readable failure message.
- Switching between road and topographic maps.

No backend, UI framework, or API key is needed for this demo. Tiles need internet access. Geolocation requires browser permission and HTTPS, or localhost.

## Integrate in an application

The npm package is prepared for a future release; registry availability and the final package name have not been confirmed. Once published under this name:

```sh
npm install lightweight-leaflet-map leaflet
```

```js
import { createMap } from 'lightweight-leaflet-map';
import 'lightweight-leaflet-map/style.css';

const instance = createMap('map', {
  locations: [
    { name: 'Our office', latitude: 27.71, longitude: 85.326 },
  ],
});
```

Supply a container with an explicit height:

```html
<div id="map" style="height: 400px"></div>
```

The npm ES module shares your application's Leaflet dependency. It does not bundle a second copy. This is a browser library: in server-rendered applications, import and mount it on the client.

## Use in a plain HTML page

Run `npm run build`, then copy `dist/lib/` into your website. The standalone bundle includes Leaflet and marker images. Keep the third-party notice file with your distribution.

```html
<link rel="stylesheet" href="./lib/leaflet-map.css">
<div id="map" style="height: 400px"></div>
<script src="./lib/leaflet-map.global.js"></script>
<script>
  const instance = LeafletMap.createMap('map', {
    locations: [{ name: 'Office', latitude: 27.71, longitude: 85.326 }]
  });
</script>
```

Serve the files over HTTP. Load either the standalone bundle or the npm module. The built ES module imports `leaflet` and needs a bundler or an import map.

## Useful examples

### Pick a delivery location

Start with one marker. The callback runs when the user finishes dragging it; save the result in your application form or backend.

```js
const instance = createMap('map', {
  locations: [{ name: 'Delivery address', latitude: 27.71, longitude: 85.326 }],
  onMarkerChange(location, index) {
    document.querySelector('#coordinates').textContent =
      `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  },
});
```

Add `<output id="coordinates"></output>` to display the result. The wrapper does not store or send coordinates automatically.

### Add a location or move an existing one

```js
const marker = instance.addMarker({
  name: 'New pickup point', latitude: 27.715, longitude: 85.33,
});
marker.openPopup();
instance.markers[0].setLatLng([27.712, 85.328]);
```

Programmatic moves refresh the popup. They do not invoke the drag callback.

### Show all your locations

```js
const locations = [
  { name: 'Office', latitude: 27.71, longitude: 85.326 },
  { name: 'Warehouse', latitude: 27.68, longitude: 85.31 },
];
const instance = createMap('map', { locations });
instance.map.fitBounds(
  locations.map(place => [place.latitude, place.longitude]),
  { padding: [24, 24], maxZoom: 15 },
);
```

### Find the user's position

Call this from a button click so users choose when to share their location:

```js
instance.map.on('locationerror', () => {
  document.querySelector('#status').textContent = 'Location unavailable. Choose a point manually.';
});
instance.map.locate();
```

Provide an element with `id="status"`. A successful location request adds a marker and centers the map. Repeated requests or `watch: true` add a marker for each successful event; use one-shot requests for this simple workflow.

### Integrate with a framework

Create the instance after the container mounts. Before removing it, call:

```js
instance.destroy();
```

Cleanup is safe to call repeatedly. If a panel is resized or revealed, call `instance.map.invalidateSize()`. Framework lifecycle hooks can perform these two steps; React is not required.

### Store locator with a branch selector

Add `<select id="branch" aria-label="Choose a branch"></select>` beside the map. This also works for property listings or itinerary stops. Markers are fixed because visitors are browsing locations.

```js
const branches = [
  { name: 'Kathmandu', latitude: 27.71, longitude: 85.326 },
  { name: 'Lalitpur', latitude: 27.673, longitude: 85.325 },
];
const instance = createMap('map', { locations: branches });
instance.markers.forEach(marker => marker.dragging.disable());
const select = document.querySelector('#branch');
branches.forEach((branch, index) => {
  select.add(new Option(branch.name, String(index)));
});
select.addEventListener('change', () => {
  const marker = instance.markers[Number(select.value)];
  instance.map.setView(marker.getLatLng(), 15);
  marker.openPopup();
});
```

### Choose one inspection or pickup point by clicking

Click anywhere to place a point, click again to move it, or drag it for a small adjustment. Add `<output id="selected-point"></output>` to your report or booking form.

```js
let selectedMarker;
const output = document.querySelector('#selected-point');
function showCoordinates(latitude, longitude) {
  output.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
const instance = createMap('map', {
  locations: [],
  onMarkerChange(location) {
    showCoordinates(location.latitude, location.longitude);
  },
});
instance.map.on('click', ({ latlng }) => {
  if (selectedMarker) {
    selectedMarker.setLatLng(latlng);
  } else {
    selectedMarker = instance.addMarker({
      name: 'Selected point', latitude: latlng.lat, longitude: latlng.lng,
    });
  }
  // Programmatic moves do not invoke onMarkerChange.
  showCoordinates(latlng.lat, latlng.lng);
});
```

### Show a fixed event venue

For a contact or event page, disable marker dragging while keeping map navigation available.

```js
const instance = createMap('map', {
  locations: [{ name: 'Event entrance', latitude: 27.71, longitude: 85.326 }],
  zoom: 16,
});
instance.markers[0].dragging.disable();
instance.markers[0].openPopup();
```

### Remember a location in the same browser

This optional example uses local storage rather than a backend. It checks stored data before mounting and keeps working if storage is unavailable. Only store coordinates with the user's knowledge; local storage is not account synchronization.

```js
const fallback = { name: 'My place', latitude: 27.71, longitude: 85.326 };
let saved = fallback;
try {
  const value = JSON.parse(localStorage.getItem('saved-map-place'));
  if (value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180) {
    saved = { name: 'My place', latitude: value.latitude, longitude: value.longitude };
  }
} catch { /* Use the default if storage is blocked or invalid. */ }
const instance = createMap('map', {
  locations: [saved],
  onMarkerChange(location) {
    try { localStorage.setItem('saved-map-place', JSON.stringify(location)); }
    catch { /* Your app can show a message when saving is unavailable. */ }
  },
});
```

To forget the saved point, call `localStorage.removeItem('saved-map-place')` from your application's reset action.

### Use your own tile provider

`tileProviders` replaces the default provider list. The first provider is selected initially; two or more providers get a layer switcher. This example uses a same-origin tile endpoint that **your server must implement**:

```js
const instance = createMap('map', {
  tileProviders: [{
    name: 'Company map',
    url: '/tiles/{z}/{x}/{y}.png',
    attribution: 'Your provider’s required attribution',
    options: { minZoom: 0, maxZoom: 18 },
  }],
});
```

Use the URL, zoom limits, and exact attribution supplied by your provider. `options` accepts Leaflet tile-layer settings such as `subdomains`, `tileSize`, and `maxNativeZoom`. Provider attribution accepts trusted HTML; names are treated as text. Never place secret server credentials in a browser URL. A provider's permitted public browser token is visible to visitors.

Pass `tileProviders: []` to start without a basemap, for example while adding your own Leaflet layers. This suppresses the wrapper's tile requests; it does not provide offline tiles.

### Put a map in a hidden tab or modal

After revealing your map container, let the browser calculate its size, then refresh Leaflet:

```js
// Run after your application's tab or modal becomes visible.
requestAnimationFrame(() => instance.map.invalidateSize());
```

For animated panels, run this after the opening transition ends. Call `instance.destroy()` when the view is removed.

## API

`createMap(elementOrId, options)` returns `{ map, markers, addMarker, destroy }`.

| Option | Purpose | Default |
| --- | --- | --- |
| `locations` | Array of `{ name, latitude, longitude }` | Two Kathmandu locations |
| `center` | Initial Leaflet LatLng, commonly `[latitude, longitude]` | Average of initial locations |
| `zoom` | Initial zoom | `13` |
| `mapOptions` | Pass-through Leaflet map options | Scroll wheel zoom disabled |
| `tileProviders` | Array of `{ name, url, attribution, options? }`; `[]` disables basemap tiles | Roads and Topographic |
| `onMarkerChange(location, index)` | Called after a marker finishes dragging | No callback |

Top-level `center` and `zoom` take precedence over `mapOptions.center` and `mapOptions.zoom`. Otherwise the map options are used before wrapper defaults. Empty `locations: []` starts without markers and uses a Kathmandu fallback center. Coordinates must be finite numbers: latitude −90 to 90, longitude −180 to 180. Invalid initial locations are rejected before mounting.

`addMarker(location)` returns a Leaflet marker. `markers` holds markers created by the wrapper, in creation order; treat this array as read-only. Removing a marker directly through Leaflet does not remove it from this array. `map` exposes the [Leaflet API](https://leafletjs.com/reference-1.9.4.html).

## Footprint and boundaries

There is no React dependency or extra runtime UI framework. The current production ES module is approximately **6.7 KB gzip**, including marker images, plus **6.4 KB gzip CSS**; Leaflet is a separate peer dependency. The standalone browser JavaScript is approximately **50.4 KB gzip**, including Leaflet. Sizes vary with builds.

Road and topographic providers are supplied by default; `tileProviders` can replace them. Keep attribution visible and follow the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/) and [OpenTopoMap guidance](https://opentopomap.org/about). Public tile servers provide no availability guarantee. Coordinate persistence, address search, routing, and offline tiles are outside the current wrapper.

## Development and future npm release

```sh
npm test
npm run build
npm run preview
npm pack --dry-run
```

Lockfile changes are excluded from commits by project preference. Use `npm install`; the previously tracked lockfiles may describe the old React setup, so `npm ci` is not the supported setup command for this migration.

`dist/` contains the demo; `dist/lib/` contains reusable assets. Library builds exclude demo assets. The package exports the ES module and stylesheet and includes the standalone bundle, README, license, and third-party notices. `prepack` runs the tests and build before packaging.

Before the first release, confirm ownership and availability of the package name, choose the intended version, review `npm pack --dry-run`, and test the tarball in a separate consumer application. Then publish from your npm account using `npm publish`. Nothing has been published by this repository setup.

## Suggested enhancements

Keep new features small and optional. The most useful next steps are:

1. **Provider examples:** add tested recipes for commonly used services without coupling the wrapper to a provider SDK.
2. **Location management:** add `getLocations()`, `removeMarker()`, and `setLocations()` so forms and directories can stay synchronized without managing Leaflet layers themselves.
3. **TypeScript declarations:** document options and callbacks through editor autocomplete without adding runtime dependencies.
4. **Browser integration tests:** check real dragging, layer switching, marker images, and standalone loading; current tests run in jsdom.
5. **Release automation:** run tests, build, and package checks in CI, then publish a versioned release with explicit maintainer approval.

Address search and routing are better suited to optional integrations than mandatory dependencies.

## Credits and licenses

Wrapper by **Sushil Shrestha**, released under the [MIT license](./LICENSE).

Mapping powered by **[Leaflet](https://github.com/Leaflet/Leaflet)**, created by **[Volodymyr Agafonkin](https://agafonkin.com)** and maintained by its contributors. Leaflet is licensed under **BSD-2-Clause**, with copyright notices for Volodymyr Agafonkin and CloudMade. The complete upstream license is retained in [THIRD-PARTY-NOTICES.txt](./THIRD-PARTY-NOTICES.txt) and copied into the browser distribution.

Map data and styles are credited separately in the visible map attribution. Thank you to the Leaflet, OpenStreetMap, and OpenTopoMap communities for the work that makes this wrapper possible.
