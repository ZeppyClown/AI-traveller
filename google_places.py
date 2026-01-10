"""
Google Places API integration for destination and place search
"""
import googlemaps
from typing import List, Dict, Optional
from datetime import datetime
import config

class GooglePlacesClient:
    def __init__(self):
        self.client = googlemaps.Client(key=config.GOOGLE_MAPS_API_KEY)
    
    def search_place(self, query: str) -> Optional[Dict]:
        """
        Search for a place using Google Places API
        """
        try:
            # Geocoding to get location details
            geocode_result = self.client.geocode(query)
            if not geocode_result:
                return None
            
            result = geocode_result[0]
            location = result['geometry']['location']
            
            # Use the geocoding result directly since it already has the place info
            # Or use Places API text search for more detailed info
            try:
                places_result = self.client.places(query=query)
                if places_result.get('results'):
                    place = places_result['results'][0]
                    place_id = place.get('place_id')
                else:
                    # If no results, use geocoding result
                    place_id = result.get('place_id')
                    place = None
            except Exception as e:
                print(f"Error in Places API search: {e}")
                place_id = result.get('place_id')
                place = None
            
            # Get detailed information if we have a place_id
            if place_id:
                try:
                    details = self.client.place(place_id=place_id)
                    place_details = details.get('result', {})
                except:
                    place_details = place if place else {}
            else:
                place_details = place if place else {}
            
            # Use geocoding result as fallback
            if not place_details:
                place_details = {
                    'name': result.get('formatted_address', query),
                    'formatted_address': result.get('formatted_address', ''),
                }
            
            return {
                'name': place_details.get('name', result.get('formatted_address', query)),
                'address': place_details.get('formatted_address', result.get('formatted_address', '')),
                'location': location,
                'rating': place_details.get('rating'),
                'user_ratings_total': place_details.get('user_ratings_total'),
                'place_id': place_id,
                'types': place_details.get('types', []),
                'country': self._extract_country(result)
            }
        except Exception as e:
            print(f"Error searching place: {e}")
            return None
    
    def get_popular_places(self, location: str, place_type: str = "tourist_attraction") -> List[Dict]:
        """
        Get popular places in a location (country/city)
        """
        try:
            # First geocode the location to get coordinates
            geocode_result = self.client.geocode(location)
            if not geocode_result:
                return []
            
            location_coords = geocode_result[0]['geometry']['location']
            
            # Search for popular places
            places_result = self.client.places_nearby(
                location=location_coords,
                radius=50000,  # 50km radius
                type=place_type,
                rank_by='prominence'
            )
            
            popular_places = []
            for place in places_result.get('results', [])[:20]:  # Limit to top 20
                place_details = {
                    'name': place.get('name'),
                    'location': place['geometry']['location'],
                    'rating': place.get('rating', 0),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'types': place.get('types', []),
                    'place_id': place.get('place_id'),
                    'vicinity': place.get('vicinity', '')
                }
                
                # Get more details if needed
                if place.get('place_id'):
                    try:
                        details = self.client.place(place_id=place['place_id'])
                        result = details.get('result', {})
                        place_details['address'] = result.get('formatted_address', place_details.get('vicinity'))
                        place_details['website'] = result.get('website')
                        place_details['opening_hours'] = result.get('opening_hours', {})
                    except Exception as e:
                        print(f"Error getting place details: {e}")
                        pass
                
                popular_places.append(place_details)
            
            # Sort by rating and number of reviews
            popular_places.sort(key=lambda x: (x['rating'], x['user_ratings_total']), reverse=True)
            return popular_places
            
        except Exception as e:
            print(f"Error getting popular places: {e}")
            return []
    
    def search_places_by_type(self, location: str, place_types: List[str]) -> Dict[str, List[Dict]]:
        """
        Search for places by multiple types (e.g., restaurants, museums, parks)
        """
        results = {}
        for place_type in place_types:
            results[place_type] = self.get_popular_places(location, place_type)
        return results
    
    def _extract_country(self, geocode_result: Dict) -> Optional[str]:
        """
        Extract country from geocode result
        """
        for component in geocode_result.get('address_components', []):
            if 'country' in component.get('types', []):
                return component['long_name']
        return None
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific place
        """
        try:
            details = self.client.place(place_id=place_id)
            return details.get('result')
        except Exception as e:
            print(f"Error getting place details: {e}")
            return None
    
    def autocomplete_places(self, query: str, location: Optional[Dict] = None, radius: int = 50000) -> List[Dict]:
        """
        Get autocomplete suggestions for places using Google Places API
        Uses find_place (text search) as the primary method since it's best for autocomplete
        """
        try:
            # Primary method: Use find_place for text-based search (best for autocomplete)
            try:
                find_result = self.client.find_place(
                    input=query,
                    input_type='textquery',
                    fields=['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types', 'vicinity']
                )
                candidates = find_result.get('candidates', [])
                places = []
                
                for candidate in candidates[:10]:
                    place_info = {
                        'place_id': candidate.get('place_id'),
                        'name': candidate.get('name', ''),
                        'description': candidate.get('formatted_address', candidate.get('name', '')),
                        'main_text': candidate.get('name', ''),
                        'secondary_text': candidate.get('vicinity') or candidate.get('formatted_address', ''),
                        'location': candidate.get('geometry', {}).get('location'),
                        'address': candidate.get('formatted_address', ''),
                        'rating': candidate.get('rating'),
                        'user_ratings_total': candidate.get('user_ratings_total', 0),
                        'types': candidate.get('types', [])
                    }
                    
                    # Get more details if place_id exists
                    if place_info['place_id']:
                        try:
                            details = self.get_place_details(place_info['place_id'])
                            if details:
                                place_info['rating'] = details.get('rating') or place_info['rating']
                                place_info['user_ratings_total'] = details.get('user_ratings_total') or place_info['user_ratings_total']
                                if not place_info['secondary_text']:
                                    place_info['secondary_text'] = details.get('vicinity', '') or details.get('formatted_address', '')
                                if not place_info['address']:
                                    place_info['address'] = details.get('formatted_address', '')
                        except:
                            pass
                    
                    places.append(place_info)
                
                if places:
                    return places
                    
            except Exception as e1:
                print(f"find_place failed, trying fallback: {e1}")
            
            # Fallback: Use places_nearby if location is provided
            if location:
                try:
                    nearby_results = self.client.places_nearby(
                        location=location,
                        radius=radius,
                        keyword=query
                    )
                    places = []
                    for place in nearby_results.get('results', [])[:10]:
                        place_geom = place.get('geometry', {})
                        place_location = place_geom.get('location') if place_geom else None
                        
                        place_info = {
                            'place_id': place.get('place_id'),
                            'name': place.get('name'),
                            'description': place.get('formatted_address', place.get('vicinity', place.get('name'))),
                            'main_text': place.get('name'),
                            'secondary_text': place.get('vicinity') or place.get('formatted_address', ''),
                            'location': place_location,
                            'address': place.get('formatted_address') or place.get('vicinity', ''),
                            'rating': place.get('rating'),
                            'user_ratings_total': place.get('user_ratings_total', 0),
                            'types': place.get('types', [])
                        }
                        places.append(place_info)
                    
                    if places:
                        return places
                except Exception as e2:
                    print(f"places_nearby failed: {e2}")
            
            # Final fallback: Use geocoding + nearby search
            try:
                geocode_result = self.client.geocode(query)
                if geocode_result:
                    loc = geocode_result[0]['geometry']['location']
                    nearby_results = self.client.places_nearby(
                        location=loc,
                        radius=radius,
                        keyword=query
                    )
                    places = []
                    for place in nearby_results.get('results', [])[:10]:
                        place_geom = place.get('geometry', {})
                        place_location = place_geom.get('location') if place_geom else None
                        
                        place_info = {
                            'place_id': place.get('place_id'),
                            'name': place.get('name'),
                            'description': place.get('formatted_address', place.get('vicinity', place.get('name'))),
                            'main_text': place.get('name'),
                            'secondary_text': place.get('vicinity') or place.get('formatted_address', ''),
                            'location': place_location,
                            'address': place.get('formatted_address') or place.get('vicinity', ''),
                            'rating': place.get('rating'),
                            'user_ratings_total': place.get('user_ratings_total', 0),
                            'types': place.get('types', [])
                        }
                        places.append(place_info)
                    return places
            except Exception as e3:
                print(f"Geocode fallback failed: {e3}")
            
            return []
            
        except Exception as e:
            print(f"Error in autocomplete_places: {e}")
            import traceback
            traceback.print_exc()
            return []
