'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Itinerary } from '@/lib/itineraryPlanner';
import { Star, Loader2, Sparkles } from 'lucide-react';

import TravelHeader from '@/components/TravelHeader';
import PopularPlacesList from '@/components/PopularPlacesList';
import ItineraryDisplay from '@/components/ItineraryDisplay';

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

        // Only fetch coordinates for map center, don't populate "popularPlaces" (suggestions) yet
        const fetchCoordinates = async () => {
            try {
                // We use the simpler search/autocomplete endpoint just to get the lat/lng of the city
                // Or we can use the popular endpoint but just take the first result and NOT setPopularPlaces
                const res = await axios.get('/api/places/popular', { params: { location: destination } });
                const places: PlaceDetails[] = res.data;

                if (places.length > 0 && places[0].location) {
                    setMapCenter([places[0].location.lat, places[0].location.lng]);
                }
            } catch (e) {
                console.error("Failed to fetch destination coordinates", e);
            } finally {
                setLoadingPlaces(false);
            }
        };

        fetchCoordinates();
    }, [destination]);

    const generateItinerary = async () => {
        setLoadingItinerary(true);
        // Also fetch popular places now if we haven't
        if (popularPlaces.length === 0) {
            try {
                const res = await axios.get('/api/places/popular', { params: { location: destination } });
                setPopularPlaces(res.data);
            } catch (e) { console.error("Failed to fetch places", e); }
        }

        try {
            const res = await axios.post('/api/itinerary', {
                destination,
                days,
                budget,
                dates: date ? [date] : [],
                preferences
            });
            // Ensure AI items have IDs
            const data = res.data;
            data.itinerary.forEach((day: any) => {
                ['morning', 'afternoon', 'evening'].forEach(period => {
                    if (day[period]?.activities) {
                        day[period].activities = day[period].activities.map((a: any) => ({
                            ...a,
                            id: a.id || (a.name + Math.random().toString(36).substr(2, 9))
                        }));
                    }
                });
            });
            setItinerary(data);
        } catch (e) {
            console.error("Failed to generate itinerary", e);
            alert("Failed to generate itinerary. Please try again.");
        } finally {
            setLoadingItinerary(false);
        }
    };

    const handleAddActivity = (day: number, place: PlaceDetails, time: string) => {
        if (!itinerary) return;

        const updatedItinerary = { ...itinerary };
        const dayPlan = updatedItinerary.itinerary.find(d => d.day === day);

        if (dayPlan) {
            const hour = parseInt(time.split(':')[0]);
            let period: 'morning' | 'afternoon' | 'evening' = 'morning';
            if (hour >= 12 && hour < 17) period = 'afternoon';
            if (hour >= 17) period = 'evening';

            // @ts-ignore
            if (!dayPlan[period].activities) dayPlan[period].activities = [];
            // @ts-ignore
            dayPlan[period].activities.push({
                id: place.place_id + Date.now(), // Ensure unique ID
                name: place.name,
                time: time,
                address: place.address,
                location: place.location,
                cost: 'TBD',
                place_id: place.place_id,
                rating: place.rating,
                photoUrl: place.photoUrl // Pass photo URL
            });

            // Sort by time
            // @ts-ignore
            dayPlan[period].activities.sort((a, b) => a.time.localeCompare(b.time));
        }

        setItinerary(updatedItinerary);
    };

    const handleRemoveActivity = (day: number, period: string, activityId: string) => {
        if (!itinerary) return;
        const updatedItinerary = { ...itinerary };
        const dayPlan = updatedItinerary.itinerary.find(d => d.day === day);
        if (dayPlan) {
            // @ts-ignore
            if (dayPlan[period]?.activities) {
                // @ts-ignore
                dayPlan[period].activities = dayPlan[period].activities.filter((a: any) =>
                    (a.id || a.name + a.time) !== activityId
                );
            }
        }
        setItinerary(updatedItinerary);
    };

    const handleReorderActivities = (day: number, period: string, newOrder: any[]) => {
        if (!itinerary) return;
        const updatedItinerary = { ...itinerary };
        const dayPlan = updatedItinerary.itinerary.find(d => d.day === day);
        if (dayPlan) {
            // @ts-ignore
            if (dayPlan[period]) {
                // @ts-ignore
                dayPlan[period].activities = newOrder;
            }
        }
        setItinerary(updatedItinerary);
    };

    if (!destination) {
        return <div className="flex h-screen items-center justify-center">No destination selected.</div>
    }

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Left Sidebar: Itinerary & Details */}
            <div className="w-1/3 min-w-[400px] flex flex-col border-r border-gray-200 z-10 shadow-xl bg-gray-50">

                <TravelHeader
                    destination={destination}
                    days={days}
                    budget={budget}
                    onBack={() => router.push('/')}
                />

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={generateItinerary}
                            disabled={loadingItinerary}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingItinerary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {itinerary && itinerary.summary && itinerary.summary !== `Trip to ${destination}` ? 'Regenerate Itinerary' : 'Auto-Generate Itinerary'}
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
                        <ItineraryDisplay
                            itinerary={itinerary}
                            destination={destination}
                            onAddActivity={handleAddActivity}
                            onRemoveActivity={handleRemoveActivity}
                            onReorderActivities={handleReorderActivities}
                        />
                    ) : (
                        !loadingItinerary && <PopularPlacesList places={popularPlaces} loading={loadingPlaces} />
                    )}

                    {/* Initial Loading State fallback for Popular places if needed, handled inside component */}
                    {!itinerary && !loadingItinerary && popularPlaces.length === 0 && loadingPlaces && (
                        <div className="text-center text-gray-400 py-10">Loading suggestions...</div>
                    )}

                </div>
            </div>

            {/* Right Content: Map */}
            <div className="flex-1 relative bg-gray-100">
                <Map
                    center={mapCenter}
                    places={[]} /* Don't show popular places on map as requested */
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
