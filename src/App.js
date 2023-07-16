import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

const chowks = [
  {
    id: 1,
    name: 'Location 1',
    latitude: 27.71,
    longitude: 85.326,
    nameNe: 'Nearest',
    ward: 1
  },
  {
    id: 2,
    name: 'Location 2',
    latitude: 27.7105,
    longitude: 85.322,
    nameNe: 'Nearest',
    ward: 1
  }
];

function MapWrapper() {
  const [positions, setPositions] = useState(chowks.map(chowk => [chowk.latitude, chowk.longitude]));

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      console.log(`Clicked at: ${lat}, ${lng}`);
    },
    locationfound(e) {
      console.log(`Position: `, e.latlng);
      const { lat, lng } = e.latlng;
      const updatedPositions = [...positions, [lat, lng]];
      setPositions(updatedPositions);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const handleMarkerDragEnd = (index) => (e) => {
    const { lat, lng } = e.target.getLatLng();
    console.log(`Dragged to: ${lat}, ${lng}`);
    const updatedPositions = [...positions];
    updatedPositions[index] = [lat, lng];
    setPositions(updatedPositions);
  };

  return (
    <>
      {chowks.map((chowk, index) => (
        <Marker key={chowk.id} position={[chowk.latitude, chowk.longitude]} draggable={true} onDragend={handleMarkerDragEnd(index)}>
          <Popup>
            <div>
              <h3>{chowk.name}</h3>
              <p>Latitude: {chowk.latitude.toFixed(6)}</p>
              <p>Longitude: {chowk.longitude.toFixed(6)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function Maps() {
  // Calculate the average latitude and longitude from chowks
  const center = chowks.reduce(
    (acc, chowk) => [acc[0] + chowk.latitude, acc[1] + chowk.longitude],
    [0, 0]
  );
  center[0] /= chowks.length;
  center[1] /= chowks.length;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '50%', height: '50vh' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Roads">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Terrain">
              <TileLayer url="https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png" attribution="Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL." />
            </LayersControl.BaseLayer>
          </LayersControl>
          <MapWrapper />
        </MapContainer>
      </div>
    </div>
  );
}

export default Maps;
