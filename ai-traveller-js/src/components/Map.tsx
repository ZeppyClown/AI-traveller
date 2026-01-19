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

// Color palette for different days
const DAY_COLORS = [
    '#EF4444', // Red - Day 1
    '#3B82F6', // Blue - Day 2
    '#10B981', // Green - Day 3
    '#F59E0B', // Amber - Day 4
    '#8B5CF6', // Purple - Day 5
    '#EC4899', // Pink - Day 6
    '#14B8A6', // Teal - Day 7
    '#F97316', // Orange - Day 8
    '#6366F1', // Indigo - Day 9
    '#84CC16', // Lime - Day 10
];

const getDayColor = (dayNumber: number) => {
    return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
};

// Create SVG marker with custom color
const createColoredMarkerIcon = (color: string) => {
    const svg = `
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z" 
                  fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
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

    // State for day filtering
    const [selectedDay, setSelectedDay] = useState<number | null>(null); // null = all days

    // Get unique days from itinerary
    const availableDays = useMemo(() => {
        return itinerary.map(day => day.day).sort((a, b) => a - b);
    }, [itinerary]);

    // Parse itinerary to get route coordinates (filtered by selected day)
    const routeCoords = useMemo(() => {
        const coords: { lat: number; lng: number, name: string, day: number }[] = [];
        itinerary.forEach(day => {
            // Filter by selected day if one is selected
            if (selectedDay !== null && day.day !== selectedDay) return;

            ['morning', 'afternoon', 'evening'].forEach(period => {
                // @ts-ignore
                day[period]?.activities?.forEach((act: any) => {
                    if (act.location) {
                        coords.push({
                            lat: act.location.lat,
                            lng: act.location.lng,
                            name: act.name,
                            day: day.day
                        });
                    }
                });
            });
        });
        return coords;
    }, [itinerary, selectedDay]);

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
                {/* Day Selector */}
                {availableDays.length > 0 && (
                    <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg">
                        <h3 className="font-bold mb-2 text-gray-800 text-sm">Filter by Day</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedDay(null)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedDay === null
                                    ? 'bg-gray-800 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                All Days
                            </button>
                            {availableDays.map(day => {
                                const color = getDayColor(day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedDay === day
                                            ? 'text-white shadow-md'
                                            : 'bg-white text-gray-700 hover:shadow-md border-2'
                                            }`}
                                        style={{
                                            backgroundColor: selectedDay === day ? color : 'white',
                                            borderColor: color,
                                        }}
                                    >
                                        Day {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                {itinerary.map(day => {
                    // Filter by selected day if one is selected
                    if (selectedDay !== null && day.day !== selectedDay) return null;

                    const dayColor = getDayColor(day.day);
                    const markerIcon = createColoredMarkerIcon(dayColor);

                    return ['morning', 'afternoon', 'evening'].map(period => (
                        // @ts-ignore
                        day[period]?.activities?.map((act: any) => {
                            if (!act.location) return null;
                            const markerId = act.id || `${act.name}-${day.day}-${period}`;

                            return (
                                <MarkerF
                                    key={markerId}
                                    position={{ lat: act.location.lat, lng: act.location.lng }}
                                    onClick={() => handleMarkerClick(markerId)}
                                    icon={{
                                        url: markerIcon,
                                        scaledSize: new google.maps.Size(32, 40),
                                    }}
                                >
                                    {activeMarker === markerId && (
                                        <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                                            <div className="min-w-[150px] text-black">
                                                <h3 className="font-bold">{act.name}</h3>
                                                <p className="text-sm">{act.address}</p>
                                                <div
                                                    className="mt-1 text-xs font-semibold text-white px-2 py-0.5 rounded inline-block"
                                                    style={{ backgroundColor: dayColor }}
                                                >
                                                    Day {day.day} - {period}
                                                </div>
                                            </div>
                                        </InfoWindowF>
                                    )}
                                </MarkerF>
                            );
                        })
                    ));
                })}

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
                            strokeColor: selectedDay !== null ? getDayColor(selectedDay) : "#2563EB",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                        }}
                    />
                )}
            </GoogleMap>
        </div>
    );
}
