import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMap } from './map.js';

let instance;
afterEach(() => {
  instance?.destroy();
  document.body.replaceChildren();
});
function mount(options) {
  document.body.innerHTML = '<div id="map" style="height:400px"></div>';
  instance = createMap('map', options);
  return instance;
}

describe('framework-independent map', () => {
  it('mounts real Leaflet markers and updates popups and callbacks after dragging', () => {
    const onMarkerChange = vi.fn();
    const { markers } = mount({ onMarkerChange });
    expect(markers).toHaveLength(2);
    markers[0].setLatLng([28, 86]).fire('dragend');
    expect(markers[0].getPopup().getContent().textContent).toContain('Latitude: 28.000000');
    expect(onMarkerChange).toHaveBeenCalledWith({ name: 'Location 1', latitude: 28, longitude: 86 }, 0);
  });

  it('supports custom locations and treats names as text', () => {
    const { markers } = mount({ locations: [{ name: '<img src=x onerror=alert(1)>', latitude: 0, longitude: 0 }] });
    expect(markers).toHaveLength(1);
    expect(markers[0].getPopup().getContent().querySelector('img')).toBeNull();
  });

  it('adds found locations and can be destroyed and remounted', () => {
    const { map, markers } = mount({ locations: [] });
    map.fire('locationfound', { latlng: { lat: 28, lng: 86 } });
    expect(markers).toHaveLength(1);
    instance.destroy();
    instance = createMap('map');
    expect(instance.markers).toHaveLength(2);
  });
});

describe('integration regressions', () => {
  it('refreshes popups after programmatic moves without calling the drag callback', () => {
    const onMarkerChange = vi.fn();
    const { markers } = mount({ onMarkerChange });
    markers[0].setLatLng([1, 2]);
    expect(markers[0].getPopup().getContent().textContent).toContain('Latitude: 1.000000');
    expect(onMarkerChange).not.toHaveBeenCalled();
  });

  it('honors mapOptions and gives explicit wrapper options precedence', () => {
    const { map } = mount({ mapOptions: { center: [10, 20], zoom: 5 } });
    expect(map.getCenter().lat).toBe(10);
    expect(map.getZoom()).toBe(5);
    instance.destroy();
    instance = createMap('map', { center: [30, 40], zoom: 7, mapOptions: { center: [10, 20], zoom: 5 } });
    expect(instance.map.getCenter().lat).toBe(30);
    expect(instance.map.getZoom()).toBe(7);
  });

  it('rejects invalid inputs before mounting and permits a retry', () => {
    document.body.innerHTML = '<div id="map"></div>';
    expect(() => createMap('map', { locations: [{ latitude: 'bad', longitude: 0 }] })).toThrow(TypeError);
    instance = createMap('map');
    expect(() => instance.addMarker({ latitude: 91, longitude: 0 })).toThrow(TypeError);
    expect(instance.markers).toHaveLength(2);
  });

  it('cleans up when setup fails after creating the Leaflet map', () => {
    document.body.innerHTML = '<div id="map"></div>';
    expect(() => createMap('map', { mapOptions: { layers: [{}] } })).toThrow();
    instance = createMap('map');
    expect(instance.markers).toHaveLength(2);
  });

  it('allows repeated cleanup', () => {
    mount();
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

describe('tile providers', () => {
  it('replaces defaults and applies provider attribution and zoom limits', () => {
    const { map } = mount({ tileProviders: [{
      name: 'Custom', url: 'https://example.test/{z}/{x}/{y}.png',
      attribution: 'Example maps', options: { maxZoom: 16 },
    }] });
    const tiles = [];
    map.eachLayer(layer => { if (layer.getTileUrl) tiles.push(layer); });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].options.attribution).toBe('Example maps');
    expect(map.getMaxZoom()).toBe(16);
    expect(document.querySelector('.leaflet-control-attribution').textContent).toContain('Example maps');
    expect(document.querySelector('.leaflet-control-layers')).toBeNull();
  });

  it('supports a map without external tile requests', () => {
    const { map } = mount({ tileProviders: [] });
    const tiles = [];
    map.eachLayer(layer => { if (layer.getTileUrl) tiles.push(layer); });
    expect(tiles).toHaveLength(0);
  });

  it('rejects malformed or duplicate providers before mounting', () => {
    document.body.innerHTML = '<div id="map"></div>';
    const provider = { name: 'Custom', url: '/tiles/{z}/{x}/{y}.png', attribution: 'Example' };
    expect(() => createMap('map', { tileProviders: [provider, provider] })).toThrow(TypeError);
    expect(() => createMap('map', { tileProviders: [{ name: 'Missing URL' }] })).toThrow(TypeError);
    instance = createMap('map');
  });

  it('renders provider names as text in the layer switcher', () => {
    mount({ tileProviders: [
      { name: '<img src=x onerror=alert(1)>', url: '/a/{z}/{x}/{y}.png', attribution: 'A' },
      { name: 'Other', url: '/b/{z}/{x}/{y}.png', attribution: 'B' },
    ] });
    expect(document.querySelector('.leaflet-control-layers img')).toBeNull();
    expect(document.querySelector('.leaflet-control-layers').textContent).toContain('<img');
  });
});

describe('container layout changes', () => {
  it('refreshes tile layout when the container gains its size and stops observing on destroy', () => {
    let onResize;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback) { onResize = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    try {
      const { map } = mount({ tileProviders: [] });
      const container = document.getElementById('map');
      expect(observe).toHaveBeenCalledWith(container);
      expect(map.getSize().x).toBe(0);
      Object.defineProperties(container, {
        clientWidth: { configurable: true, value: 800 },
        clientHeight: { configurable: true, value: 400 },
      });
      onResize();
      expect(map.getSize().x).toBe(800);
      expect(map.getSize().y).toBe(400);
      instance.destroy();
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('native marker customization', () => {
  it('supports shared options and per-marker overrides without affecting other markers', () => {
    const shared = L.divIcon({ html: 'A', className: 'shared-icon' });
    const custom = L.divIcon({ html: 'B', className: 'custom-icon' });
    const { markers, addMarker } = mount({ markerOptions: { icon: shared, draggable: false, opacity: 0.6 } });
    expect(markers[0].options.icon).toBe(shared);
    expect(markers[0].dragging.enabled()).toBe(false);
    const marker = addMarker({ name: 'Custom', latitude: 1, longitude: 2 }, { icon: custom, draggable: true });
    expect(marker.options.icon).toBe(custom);
    expect(marker.options.opacity).toBe(0.6);
    expect(marker.dragging.enabled()).toBe(true);
    expect(markers[0].options.icon).toBe(shared);
  });
});
