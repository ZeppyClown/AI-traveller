import { useState } from 'react';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Itinerary } from '@/lib/itineraryPlanner';
import { Cloud, MapPin, DollarSign } from 'lucide-react';
import PlaceSearch from './PlaceSearch';

interface ItineraryDisplayProps {
    itinerary: Itinerary;
    destination: string;
    onAddActivity: (day: number, place: PlaceDetails, time: string) => void;
}

export default function ItineraryDisplay({ itinerary, destination, onAddActivity }: ItineraryDisplayProps) {
    const [addingToDay, setAddingToDay] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState('09:00');

    const handleAddSubmit = (day: number, place: PlaceDetails) => {
        onAddActivity(day, place, selectedTime);
        setAddingToDay(null);
    };

    return (
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
                                    <PlaceSearch onSelect={(place) => handleAddSubmit(day.day, place)} placeholder="Search for a place to add..." />
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
    );
}
