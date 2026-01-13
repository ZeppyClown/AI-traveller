'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Search, MapPin, Loader2, ImageIcon } from 'lucide-react';

interface PlaceSearchProps {
    onSelect: (place: PlaceDetails) => void;
    placeholder?: string;
}

export default function PlaceSearch({ onSelect, placeholder = "Search for a place..." }: PlaceSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlaceDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Debounce reduced to 200ms
        const timer = setTimeout(async () => {
            if (query.length < 2) { // Allow searching with fewer chars
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const res = await axios.get('/api/places/autocomplete', {
                    params: { query }
                });
                setResults(res.data);
                setShowDropdown(true);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (place: PlaceDetails) => {
        onSelect(place);
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    return (
        <div className="relative w-full" ref={searchRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                {loading && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-blue-500 animate-spin" />
                )}
            </div>

            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto">
                    {results.map((place) => (
                        <button
                            key={place.place_id}
                            onClick={() => handleSelect(place)}
                            className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
                        >
                            {/* Image Thumbnail */}
                            <div className="shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                {place.photoUrl ? (
                                    <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-gray-900 truncate">{place.name}</div>
                                <div className="text-xs text-gray-500 truncate">{place.address}</div>
                                {place.rating && (
                                    <div className="text-xs text-yellow-600 mt-0.5">★ {place.rating} ({place.user_ratings_total})</div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
