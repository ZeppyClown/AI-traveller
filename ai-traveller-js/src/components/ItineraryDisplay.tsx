import { useState } from 'react';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Itinerary } from '@/lib/itineraryPlanner';
import { Cloud, Plus, X } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import PlaceSearch from './PlaceSearch';
import { SortableActivityItem } from './SortableActivityItem';

interface ItineraryDisplayProps {
    itinerary: Itinerary;
    destination: string;
    onAddActivity: (day: number, place: PlaceDetails, time: string) => void;
    onRemoveActivity: (day: number, period: string, activityId: string) => void;
    onReorderActivities: (day: number, period: string, newOrder: any[]) => void;
}

export default function ItineraryDisplay({
    itinerary,
    destination,
    onAddActivity,
    onRemoveActivity,
    onReorderActivities
}: ItineraryDisplayProps) {

    const [addingToDay, setAddingToDay] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAddSubmit = (day: number, place: PlaceDetails) => {
        onAddActivity(day, place, selectedTime);
        setAddingToDay(null);
    };

    // Helper to handle drag end
    const handleDragEnd = (event: DragEndEvent, day: number, period: string, activities: any[]) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = activities.findIndex((item) => (item.id || item.name + item.time) === active.id);
            const newIndex = activities.findIndex((item) => (item.id || item.name + item.time) === over?.id);

            const newOrder = arrayMove(activities, oldIndex, newIndex);
            onReorderActivities(day, period, newOrder);
        }
        setActiveId(null);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }

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
                <div key={day.day} className="bg-white rounded-xl border border-gray-200 shadow-sm relative">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-xl flex justify-between items-center">
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
                            // Ensure we have IDs for DND
                            const activities = (section?.activities || []).map((act: any) => ({
                                ...act,
                                id: act.id || act.name + act.time // fallback ID
                            }));

                            if (activities.length === 0) return null;

                            return (
                                <div key={period} className="relative pl-4 border-l-2 border-gray-100">
                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400"></div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{period}</h4>

                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={(e) => handleDragEnd(e, day.day, period, activities)}
                                    >
                                        <SortableContext
                                            items={activities.map((a: any) => a.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-2">
                                                {activities.map((act: any) => (
                                                    <SortableActivityItem
                                                        key={act.id}
                                                        activity={act}
                                                        onRemove={() => onRemoveActivity(day.day, period, act.id)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                        {/* Overlay could be added here for smoother drag visuals */}
                                    </DndContext>
                                </div>
                            );
                        })}

                        {/* Add Place UI */}
                        {addingToDay === day.day ? (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2 relative z-10">
                                <div className="mb-2 flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="w-24 bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                    />
                                    <span className="text-xs text-gray-500 flex-1 text-right">Select time & place/activity</span>
                                    <button
                                        onClick={() => setAddingToDay(null)}
                                        className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <PlaceSearch onSelect={(place) => handleAddSubmit(day.day, place)} placeholder="Search (e.g. Eiffel Tower)..." />
                                </div>
                            </div>
                        ) : (
                            <button
                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                onClick={() => {
                                    setAddingToDay(day.day);
                                    setSelectedTime('09:00');
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Activity
                            </button>
                        )}

                    </div>
                </div>
            ))}
        </div>
    );
}
