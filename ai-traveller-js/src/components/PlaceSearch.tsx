'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlaceDetails } from '@/lib/googlePlaces';
import { Search, MapPin, Loader2 } from 'lucide-react';

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
        const timer = setTimeout(async () => {
            if (query.length < 3) {
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
        }, 500); // Debounce

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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                {loading && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-blue-500 animate-spin" />
                )}
            </div>

            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
                    {results.map((place) => (
                        <button
                            key={place.place_id}
                            onClick={() => handleSelect(place)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0"
                        >
                            <MapPin className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                            <div>
                                <div className="font-medium text-sm text-gray-900">{place.name}</div>
                                <div className="text-xs text-gray-500 truncate">{place.address}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
