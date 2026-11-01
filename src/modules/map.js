/**
 * Krishi Mitra — Map & GIS Interaction Module
 * Wraps Leaflet.js with Esri Maxar Satellite Imagery, interactive vertex drawing,
 * and 1-acre geometric boundary estimation.
 */

import { generateAcreSquare, polygonAreaHa, perimeterM, centroid } from './calculations.js';

export const ESRI_TILES_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export function isLeafletAvailable() {
  return typeof window !== 'undefined' && !!window.L;
}

export function createPinIcon() {
  if (!isLeafletAvailable()) return null;
  return window.L.divIcon({
    className: 'custom-loc-pin',
    html: '<div style="width:26px;height:26px;border-radius:50%;background:rgba(217,174,97,.32);display:grid;place-items:center;box-shadow:0 0 0 0 rgba(217,174,97,.5)"><div style="width:11px;height:11px;border-radius:50%;background:#e8c17c;border:2px solid #2b2118"></div></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

export function initLocationMap(containerId, center = [29.6857, 76.9905], onLocationChange) {
  if (!isLeafletAvailable()) return { map: null, marker: null };
  const L = window.L;
  const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!el) return { map: null, marker: null };

  const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, 12);
  L.tileLayer(ESRI_TILES_URL, { maxZoom: 19, attribution: 'Esri, Maxar' }).addTo(map);
  map.attributionControl.setPrefix(false);

  const icon = createPinIcon();
  const marker = L.marker(center, { icon }).addTo(map);

  map.on('click', (e) => {
    if (onLocationChange) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    }
  });

  return { map, marker };
}

export function initTraceMap(containerId, center = [29.6857, 76.9905], onMapClick) {
  if (!isLeafletAvailable()) return null;
  const L = window.L;
  const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!el) return null;

  const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, 15);
  L.tileLayer(ESRI_TILES_URL, { maxZoom: 19, attribution: 'Esri, Maxar' }).addTo(map);
  map.attributionControl.setPrefix(false);

  map.on('click', (e) => {
    if (onMapClick) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });

  return map;
}

/**
 * Synchronizes Leaflet markers and polygon layer with state draft coordinates.
 */
export function syncTraceLayers(map, points, currentMarkers = [], currentPolygon = null) {
  if (!isLeafletAvailable() || !map) {
    return { markers: [], polygon: null };
  }
  const L = window.L;

  // Clear existing markers
  currentMarkers.forEach((m) => {
    try {
      map.removeLayer(m);
    } catch (e) {}
  });

  // Clear existing polygon
  if (currentPolygon) {
    try {
      map.removeLayer(currentPolygon);
    } catch (e) {}
  }

  const newMarkers = (points || []).map((pt) => {
    return L.circleMarker(pt, {
      radius: 5,
      color: '#2b2118',
      weight: 2,
      fillColor: '#e8c17c',
      fillOpacity: 1
    }).addTo(map);
  });

  let newPolygon = null;
  if (points && points.length >= 3) {
    newPolygon = L.polygon(points, {
      color: '#e8c17c',
      weight: 2,
      dashArray: '6 5',
      fillColor: '#d9ae61',
      fillOpacity: 0.16
    }).addTo(map);
  }

  return { markers: newMarkers, polygon: newPolygon };
}

export function fitBounds(map, points, padding = [40, 40]) {
  if (!isLeafletAvailable() || !map || !points || points.length < 2) return;
  const L = window.L;
  try {
    map.fitBounds(L.latLngBounds(points), { padding });
  } catch (e) {}
}

