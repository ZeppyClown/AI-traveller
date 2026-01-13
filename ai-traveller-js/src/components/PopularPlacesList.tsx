import { PlaceDetails } from '@/lib/googlePlaces';

interface PopularPlacesListProps {
    places: PlaceDetails[];
    loading: boolean;
}

export default function PopularPlacesList({ places, loading }: PopularPlacesListProps) {
    return (
        <div>
            <h3 className="font-semibold text-gray-900 mb-4">Popular Attractions</h3>
            <div className="space-y-3">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)
                ) : (
                    places.map(place => (
                        <div key={place.place_id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-default">
                            <div className="flex justify-between">
                                <h4 className="font-medium text-gray-900 text-sm">{place.name}</h4>
                                <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded font-medium">★ {place.rating}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">{place.vicinity}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
