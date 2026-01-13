import axios from 'axios';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api';

export interface Location {
    lat: number;
    lng: number;
}

export interface PlaceDetails {
    place_id: string;
    name: string;
    description?: string;
    main_text?: string;
    secondary_text?: string;
    location?: Location;
    address?: string;
    rating?: number;
    user_ratings_total?: number;
    types: string[];
    vicinity?: string;
    website?: string;
    opening_hours?: any;
    country?: string;
    photoUrl?: string; // New field
}

export class GooglePlacesClient {
    private async get(endpoint: string, params: any) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                params: { ...params, key: API_KEY },
            });
            return response.data;
        } catch (error) {
            console.error(`Error in Google Places API (${endpoint}):`, error);
            return null;
        }
    }

    async searchPlace(query: string): Promise<PlaceDetails | null> {
        try {
            // Geocoding
            const geocodeRes = await this.get('/geocode/json', { address: query });
            if (!geocodeRes || !geocodeRes.results || geocodeRes.results.length === 0) {
                return null;
            }

            const result = geocodeRes.results[0];
            const location = result.geometry.location;
            let placeId = result.place_id;

            let placeDetails: any = null;

            // Try Text Search to get more info like rating/types/photos
            const searchRes = await this.get('/place/textsearch/json', { query });
            if (searchRes && searchRes.results && searchRes.results.length > 0) {
                const place = searchRes.results[0];
                placeId = place.place_id;
                placeDetails = place;
            }

            // Get Place Details - optional, text search usually has enough
            if (placeId && !placeDetails) {
                const detailsRes = await this.get('/place/details/json', { place_id: placeId });
                if (detailsRes && detailsRes.result) {
                    placeDetails = detailsRes.result;
                }
            }

            const details = placeDetails || {};

            const countryComp = result.address_components?.find((c: any) => c.types.includes('country'));
            const country = countryComp ? countryComp.long_name : undefined;

            let photoUrl = undefined;
            if (details.photos && details.photos.length > 0) {
                photoUrl = `${BASE_URL}/place/photo?maxwidth=400&photo_reference=${details.photos[0].photo_reference}&key=${API_KEY}`;
            }

            return {
                place_id: placeId,
                name: details.name || result.formatted_address || query,
                address: details.formatted_address || result.formatted_address,
                location: details.geometry?.location || location,
                rating: details.rating,
                user_ratings_total: details.user_ratings_total,
                types: details.types || [],
                country,
                formatted_address: details.formatted_address || result.formatted_address,
                photoUrl,
            } as any;
        } catch (e) {
            console.error('Error searching place:', e);
            return null;
        }
    }

    async getPopularPlaces(locationName: string, type: string = "tourist_attraction"): Promise<PlaceDetails[]> {
        try {
            const geocodeRes = await this.get('/geocode/json', { address: locationName });
            if (!geocodeRes?.results?.[0]) return [];

            const location = geocodeRes.results[0].geometry.location;
            const locationStr = `${location.lat},${location.lng}`;

            const placesRes = await this.get('/place/nearbysearch/json', {
                location: locationStr,
                radius: 50000,
                type,
                rankby: 'prominence'
            });

            if (!placesRes?.results) return [];

            return placesRes.results.slice(0, 20).map((place: any) => {
                let photoUrl = undefined;
                if (place.photos && place.photos.length > 0) {
                    photoUrl = `${BASE_URL}/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`;
                }
                return {
                    place_id: place.place_id,
                    name: place.name,
                    location: place.geometry.location,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    types: place.types || [],
                    vicinity: place.vicinity,
                    address: place.vicinity,
                    photoUrl
                };
            });
        } catch (e) {
            console.error('Error getting popular places:', e);
            return [];
        }
    }

    async autocompletePlaces(query: string, locationBias?: string): Promise<PlaceDetails[]> {
        try {
            // Using Text Search as it's often better/cheaper/simpler for this context than Autocomplete + Details
            const res = await this.get('/place/textsearch/json', { query });
            if (!res?.results) return [];

            return res.results.slice(0, 10).map((place: any) => {
                let photoUrl = undefined;
                if (place.photos && place.photos.length > 0) {
                    photoUrl = `${BASE_URL}/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`;
                }

                return {
                    place_id: place.place_id,
                    name: place.name,
                    description: place.formatted_address,
                    main_text: place.name,
                    secondary_text: place.formatted_address,
                    location: place.geometry.location,
                    address: place.formatted_address,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    types: place.types || [],
                    photoUrl
                };
            });
        } catch (e) {
            console.error('Error in autocomplete:', e);
            return [];
        }
    }
}
