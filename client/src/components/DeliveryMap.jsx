import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function DeliveryMap({
  pickupLat = 12.9784,
  pickupLng = 77.6408,
  pickupLabel = 'Pickup Location',
  dropLat = 12.9250,
  dropLng = 77.5938,
  dropLabel = 'Drop Location',
  agentLat = 12.9450,
  agentLng = 77.6180,
  agentName = 'Delivery Partner',
  status = 'IN_TRANSIT'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([pickupLat, pickupLng], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap dark / minimalist styled tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Custom HTML Icons for crisp aesthetics
    const pickupIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(16, 185, 129, 0.6); border: 2px solid white; font-weight: bold; font-size: 14px;">📦</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const dropIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background: #ef4444; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); border: 2px solid white; font-weight: bold; font-size: 14px;">📍</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const agentIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background: #2563eb; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(37, 99, 235, 0.8); border: 2px solid white; font-size: 16px; animation: pulse-ring 2s infinite;">🛵</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    // Add Markers
    const pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon })
      .addTo(map)
      .bindPopup(`<strong>Origin:</strong> ${pickupLabel}`);

    const dropMarker = L.marker([dropLat, dropLng], { icon: dropIcon })
      .addTo(map)
      .bindPopup(`<strong>Destination:</strong> ${dropLabel}`);

    const markers = [pickupMarker, dropMarker];

    if (agentLat && agentLng && status !== 'DELIVERED') {
      const agentMarker = L.marker([agentLat, agentLng], { icon: agentIcon })
        .addTo(map)
        .bindPopup(`<strong>${agentName}</strong><br>Status: ${status}`);
      markers.push(agentMarker);

      // Route polyline
      const polyline = L.polyline([
        [pickupLat, pickupLng],
        [agentLat, agentLng],
        [dropLat, dropLng]
      ], {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 8'
      }).addTo(map);
    } else {
      L.polyline([
        [pickupLat, pickupLng],
        [dropLat, dropLng]
      ], {
        color: '#6366f1',
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 8'
      }).addTo(map);
    }

    // Fit map bounds to encompass all markers
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));

    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, [pickupLat, pickupLng, pickupLabel, dropLat, dropLng, dropLabel, agentLat, agentLng, agentName, status]);

  return (
    <div className="map-card-container">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
