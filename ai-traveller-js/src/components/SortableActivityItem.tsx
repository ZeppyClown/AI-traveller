
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, ImageIcon, MapPin } from 'lucide-react';

interface SortableActivityItemProps {
    activity: any;
    onRemove: () => void;
}

export function SortableActivityItem({ activity, onRemove }: SortableActivityItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: activity.id || activity.name + activity.time }); // fallback id

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group mb-3">
            <div className="p-3 bg-white hover:shadow-md transition-shadow border border-gray-100 rounded-xl flex gap-3 items-start">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                    <GripVertical className="w-5 h-5" />
                </div>

                {/* Image */}
                <div className="shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    {activity.photoUrl ? (
                        <img src={activity.photoUrl} alt={activity.name} className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h5 className="font-medium text-gray-900 truncate pr-2">{activity.name}</h5>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-gray-100 text-gray-900">{activity.time}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{activity.address || 'Location details'}</span>
                    </div>

                    {activity.weather_adjusted && (
                        <p className="text-xs text-amber-600 mt-1 italic">
                            ⚠️ {activity.weather_note}
                        </p>
                    )}
                </div>

                {/* Delete Button */}
                <button
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 -mr-2 -mt-2 transition-colors"
                    onClick={onRemove}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

