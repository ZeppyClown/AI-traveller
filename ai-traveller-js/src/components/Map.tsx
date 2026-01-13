'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    center: [number, number];
    zoom?: number;
    places?: any[];
    itinerary?: any[];
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function Map({ center, zoom = 12, places = [], itinerary = [] }: MapProps) {

    // Parse itinerary to get route coordinates
    const routeCoords: [number, number][] = [];
    itinerary.forEach(day => {
        ['morning', 'afternoon', 'evening'].forEach(period => {
            day[period]?.activities?.forEach((act: any) => {
                if (act.location) {
                    routeCoords.push([act.location.lat, act.location.lng]);
                }
            });
        });
    });

    return (
        <div className="h-full w-full z-0 relative">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} />

                {/* Places Markers */}
                {places.map((place) => (
                    place.location && (
                        <Marker
                            key={place.place_id || Math.random()}
                            position={[place.location.lat, place.location.lng]}
                        >
                            <Popup>
                                <div className="min-w-[150px]">
                                    <h3 className="font-bold">{place.name}</h3>
                                    <p className="text-sm">{place.address}</p>
                                    {place.rating && <p className="text-xs text-yellow-600">★ {place.rating}</p>}
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* Itinerary Route */}
                {routeCoords.length > 1 && (
                    <Polyline positions={routeCoords} color="blue" weight={4} opacity={0.6} />
                )}

            </MapContainer>
        </div>
    );
}
