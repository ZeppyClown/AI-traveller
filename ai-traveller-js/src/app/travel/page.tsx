'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Itinerary } from '@/lib/itineraryPlanner';
import { ArrowLeft, MapPin, Star, Calendar, Clock, DollarSign, Cloud, Loader2 } from 'lucide-react';
import PlaceSearch from '@/components/PlaceSearch';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

function TravelPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const destination = searchParams.get('destination') || '';
    const days = parseInt(searchParams.get('days') || '3');
    const budget = searchParams.get('budget') || 'Moderate ($$)';
    const date = searchParams.get('date') || '';
    const preferences = searchParams.get('preferences') || '';

    const [popularPlaces, setPopularPlaces] = useState<PlaceDetails[]>([]);
    const [itinerary, setItinerary] = useState<Itinerary | null>(null);
    const [loadingPlaces, setLoadingPlaces] = useState(true);
    const [loadingItinerary, setLoadingItinerary] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);

    // Manual entry state
    const [addingToDay, setAddingToDay] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState('09:00');

    // Initialize empty itinerary
    useEffect(() => {
        if (!itinerary && days > 0) {
            const initialItinerary: Itinerary = {
                summary: `Trip to ${destination}`,
                total_budget: '0',
                tips: [],
                itinerary: Array.from({ length: days }, (_, i) => ({
                    day: i + 1,
                    morning: { activities: [] },
                    afternoon: { activities: [] },
                    evening: { activities: [] },
                    meals: {}
                }))
            };
            setItinerary(initialItinerary);
        }
    }, [days, destination]);

    useEffect(() => {
        if (!destination) return;

        const fetchPlaces = async () => {
            try {
                const res = await axios.get('/api/places/popular', { params: { location: destination } });
                const places: PlaceDetails[] = res.data;
                setPopularPlaces(places);

                if (places.length > 0 && places[0].location) {
                    setMapCenter([places[0].location.lat, places[0].location.lng]);
                }
            } catch (e) {
                console.error("Failed to fetch places", e);
            } finally {
                setLoadingPlaces(false);
            }
        };

        fetchPlaces();
    }, [destination]);

    const generateItinerary = async () => {
        setLoadingItinerary(true);
        try {
            const res = await axios.post('/api/itinerary', {
                destination,
                days,
                budget,
                dates: date ? [date] : [],
                preferences
            });
            setItinerary(res.data);
        } catch (e) {
            console.error("Failed to generate itinerary", e);
            alert("Failed to generate itinerary. Please try again.");
        } finally {
            setLoadingItinerary(false);
        }
    };

    const handleAddPlace = (day: number, place: PlaceDetails) => {
        if (!itinerary) return;

        const updatedItinerary = { ...itinerary };
        const dayPlan = updatedItinerary.itinerary.find(d => d.day === day);

        if (dayPlan) {
            // Determine period based on time (simple logic)
            const hour = parseInt(selectedTime.split(':')[0]);
            let period: 'morning' | 'afternoon' | 'evening' = 'morning';
            if (hour >= 12 && hour < 17) period = 'afternoon';
            if (hour >= 17) period = 'evening';

            // @ts-ignore
            if (!dayPlan[period].activities) dayPlan[period].activities = [];
            // @ts-ignore
            dayPlan[period].activities.push({
                name: place.name,
                time: selectedTime,
                address: place.address,
                location: place.location,
                cost: 'TBD',
                place_id: place.place_id,
                rating: place.rating,
                // Custom flag to indicate manual entry if needed
            });

            // Sort by time
            // @ts-ignore
            dayPlan[period].activities.sort((a, b) => a.time.localeCompare(b.time));
        }

        setItinerary(updatedItinerary);
        setAddingToDay(null);
    };

    if (!destination) {
        return <div className="flex h-screen items-center justify-center">No destination selected.</div>
    }

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Left Sidebar: Itinerary & Details */}
            <div className="w-1/3 min-w-[400px] flex flex-col border-r border-gray-200 z-10 shadow-xl bg-gray-50">

                {/* Header */}
                <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{destination}</h1>
                        <p className="text-sm text-gray-500">{days} Days • {budget}</p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={generateItinerary}
                            disabled={loadingItinerary}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingItinerary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                            {itinerary && itinerary.summary ? 'Regenerate Itinerary' : 'Auto-Generate Itinerary'}
                        </button>
                    </div>

                    {loadingItinerary && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-gray-500 animate-pulse">Crafting your perfect trip...</p>
                        </div>
                    )}

                    {/* Itinerary Display */}
                    {itinerary ? (
                        <div className="space-y-6">
                            {itinerary.summary && itinerary.summary !== `Trip to ${destination}` && (
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <h2 className="font-semibold text-gray-900 mb-2">Trip Summary</h2>
                                    <p className="text-sm text-gray-600 leading-relaxed">{itinerary.summary}</p>
                                    <div className="mt-3 text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
                                        Est. Cost: {itinerary.total_budget}
                                    </div>
                                </div>
                            )}

                            {itinerary.itinerary.map((day) => (
                                <div key={day.day} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-900">Day {day.day}</h3>
                                        <div className="flex items-center gap-2">
                                            {day.weather_data && (
                                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                    <Cloud className="w-3 h-3" />
                                                    {day.weather_data.temperature}°C {day.weather_data.main}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-6">
                                        {['morning', 'afternoon', 'evening'].map((period) => {
                                            // @ts-ignore
                                            const section = day[period];
                                            // Show section if it has activities OR if we are adding stuff (to keep layout structure)
                                            // But actually we hide empty sections usually. 
                                            // Let's just render if it has stuff. 
                                            if (!section?.activities?.length) return null;

                                            return (
                                                <div key={period} className="relative pl-4 border-l-2 border-gray-100">
                                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400"></div>
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{period}</h4>
                                                    <div className="space-y-4">
                                                        {section.activities.map((act: any, idx: number) => (
                                                            <div key={idx} className="group hover:bg-gray-50 rounded-lg -ml-2 p-2 transition-colors">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h5 className="font-medium text-gray-900">{act.name}</h5>
                                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{act.time}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {act.address || 'Location details'}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <DollarSign className="w-3 h-3" />
                                                                    {act.cost || 'Free'}
                                                                </div>
                                                                {act.weather_adjusted && (
                                                                    <p className="text-xs text-amber-600 mt-1 italic">
                                                                        ⚠️ Adjusted for weather: {act.weather_note}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add Place UI */}
                                        {addingToDay === day.day ? (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                                <div className="mb-2 flex gap-2">
                                                    <input
                                                        type="time"
                                                        value={selectedTime}
                                                        onChange={(e) => setSelectedTime(e.target.value)}
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        onClick={() => setAddingToDay(null)}
                                                        className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <PlaceSearch onSelect={(place) => handleAddPlace(day.day, place)} placeholder="Search for a place to add..." />
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setAddingToDay(day.day);
                                                    setSelectedTime('09:00');
                                                }}
                                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                + Add Activity
                                            </button>
                                        )}

                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Initializing...</p>
                        </div>
                    )}

                </div>
            </div>

            {/* Right Content: Map */}
            <div className="flex-1 relative bg-gray-100">
                <Map
                    center={mapCenter}
                    places={popularPlaces}
                    itinerary={itinerary?.itinerary}
                />
            </div>
        </div>
    );
}

export default function TravelPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <TravelPageContent />
        </Suspense>
    );
}
