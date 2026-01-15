'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, PolylineF } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const mapOptions = {
    mapId: "43db60cb66c1ad14f32557da", // User's custom Cloud Style ID
    disableDefaultUI: false,
    clickableIcons: true,
    scrollwheel: true,
};

interface MapProps {
    center: [number, number];
    zoom?: number;
    places?: any[];
    itinerary?: any[];
}

export default function Map({ center, zoom = 12, places = [], itinerary = [] }: MapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const mapCenter = useMemo(() => ({ lat: center[0], lng: center[1] }), [center]);

    // Parse itinerary to get route coordinates
    const routeCoords = useMemo(() => {
        const coords: { lat: number; lng: number, name: string }[] = [];
        itinerary.forEach(day => {
            ['morning', 'afternoon', 'evening'].forEach(period => {
                // @ts-ignore
                day[period]?.activities?.forEach((act: any) => {
                    if (act.location) {
                        coords.push({
                            lat: act.location.lat,
                            lng: act.location.lng,
                            name: act.name
                        });
                    }
                });
            });
        });
        return coords;
    }, [itinerary]);

    const [activeMarker, setActiveMarker] = useState<string | null>(null);
    const [routeMetrics, setRouteMetrics] = useState<any[]>([]);

    useEffect(() => {
        if (!isLoaded || routeCoords.length < 2) {
            setRouteMetrics([]);
            return;
        }

        const calculateRoutes = async () => {
            const service = new google.maps.DistanceMatrixService();
            const origins = routeCoords.slice(0, -1);
            const destinations = routeCoords.slice(1);

            // Limit to avoid API errors (max 25 locations typically)
            if (origins.length > 25) {
                console.warn("Too many stops for distance matrix demo");
                return;
            }

            try {
                const response = await service.getDistanceMatrix({
                    origins: origins.map(p => ({ lat: p.lat, lng: p.lng })),
                    destinations: destinations.map(p => ({ lat: p.lat, lng: p.lng })),
                    travelMode: google.maps.TravelMode.DRIVING,
                });

                const metrics = origins.map((origin, index) => {
                    // The diagonal elements [index][index] represent the sequential segments
                    const element = response.rows[index].elements[index];
                    return {
                        from: origin.name,
                        to: destinations[index].name,
                        distance: element.distance?.text,
                        duration: element.duration?.text
                    };
                });
                setRouteMetrics(metrics);
            } catch (error) {
                console.error("Distance Matrix error:", error);
            }
        };

        calculateRoutes();

    }, [isLoaded, routeCoords]);


    const handleMarkerClick = (id: string) => {
        if (id === activeMarker) {
            setActiveMarker(null);
        } else {
            setActiveMarker(id);
        }
    };

    if (!isLoaded) return <div className="h-full w-full bg-gray-100 animate-pulse" />;

    return (
        <div className="h-full w-full z-0 relative">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={zoom}
                options={mapOptions}
            >
                {/* Route Info Panel */}
                {routeMetrics.length > 0 && (
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg max-h-[40vh] overflow-y-auto max-w-sm text-sm">
                        <h3 className="font-bold mb-2 text-gray-800">Trip Logistics</h3>
                        <div className="space-y-3">
                            {routeMetrics.map((metric, idx) => (
                                <div key={idx} className="border-l-2 border-blue-500 pl-3">
                                    <div className="font-medium text-gray-900">{metric.from} <span className="text-gray-400">→</span> {metric.to}</div>
                                    <div className="text-xs text-gray-600 mt-0.5 flex gap-2">
                                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{metric.duration}</span>
                                        <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{metric.distance}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Itinerary Markers */}
                {itinerary.map(day => (
                    ['morning', 'afternoon', 'evening'].map(period => (
                        // @ts-ignore
                        day[period]?.activities?.map((act: any) => {
                            if (!act.location) return null;
                            const markerId = act.id || `${act.name}-${day.day}-${period}`;

                            return (
                                <MarkerF
                                    key={markerId}
                                    position={{ lat: act.location.lat, lng: act.location.lng }}
                                    onClick={() => handleMarkerClick(markerId)}
                                >
                                    {activeMarker === markerId && (
                                        <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                                            <div className="min-w-[150px] text-black">
                                                <h3 className="font-bold">{act.name}</h3>
                                                <p className="text-sm">{act.address}</p>
                                                <div className="mt-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded inline-block">
                                                    Day {day.day} - {period}
                                                </div>
                                            </div>
                                        </InfoWindowF>
                                    )}
                                </MarkerF>
                            );
                        })
                    ))
                ))}

                {/* Places Markers (Suggestions) */}
                {places.map((place) => {
                    if (!place.location) return null;
                    const markerId = place.place_id || place.name;

                    return (
                        <MarkerF
                            key={markerId}
                            position={{ lat: place.location.lat, lng: place.location.lng }}
                            opacity={0.7}
                            onClick={() => handleMarkerClick(markerId)}
                        >
                            {activeMarker === markerId && (
                                <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                                    <div className="min-w-[150px] text-black">
                                        <h3 className="font-bold">{place.name}</h3>
                                        <p className="text-sm">{place.address}</p>
                                        <p className="text-xs text-gray-500">Suggestion</p>
                                    </div>
                                </InfoWindowF>
                            )}
                        </MarkerF>
                    );
                })}

                {/* Itinerary Route */}
                {routeCoords.length > 1 && (
                    <PolylineF
                        path={routeCoords}
                        options={{
                            strokeColor: "#2563EB", // Blue-600
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                        }}
                    />
                )}
            </GoogleMap>
        </div>
    );
}
