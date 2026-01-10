"""
AI Itinerary Planner using LangChain with Google Gemini
"""
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:
    try:
        # Fallback for alternative import path
        from langchain_community.chat_models import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage, SystemMessage
    except ImportError:
        raise ImportError(
            "langchain-google-genai is required. Install it with: pip install langchain-google-genai"
        )

from typing import List, Dict, Optional
import json
import config
from google_places import GooglePlacesClient
from weather_api import WeatherClient

class ItineraryPlanner:
    def __init__(self):
        # Initialize ChatGoogleGenerativeAI with proper parameter handling
        # Try different parameter combinations for compatibility
        try:
            # Most common parameter name is google_api_key
            self.llm = ChatGoogleGenerativeAI(
                model=config.DEFAULT_MODEL,
                temperature=0.7,
                google_api_key=config.GEMINI_API_KEY
            )
        except (TypeError, AttributeError, ValueError) as e:
            try:
                # Try with model_name instead of model
                self.llm = ChatGoogleGenerativeAI(
                    model_name=config.DEFAULT_MODEL,
                    temperature=0.7,
                    google_api_key=config.GEMINI_API_KEY
                )
            except Exception:
                try:
                    # Try with api_key parameter (older versions)
                    self.llm = ChatGoogleGenerativeAI(
                        model=config.DEFAULT_MODEL,
                        temperature=0.7,
                        api_key=config.GEMINI_API_KEY
                    )
                except Exception as e2:
                    # Set environment variable as last resort
                    import os
                    os.environ["GOOGLE_API_KEY"] = config.GEMINI_API_KEY
                    self.llm = ChatGoogleGenerativeAI(
                        model=config.DEFAULT_MODEL,
                        temperature=0.7
                    )
        self.places_client = GooglePlacesClient()
        self.weather_client = WeatherClient()
    
    def generate_itinerary(
        self,
        destination: str,
        days: int,
        budget: str,
        travel_dates: Optional[List[str]] = None,
        user_preferences: Optional[str] = None
    ) -> Dict:
        """
        Generate a complete itinerary with weather-aware adjustments
        """
        # Get popular places from Google Places API
        print(f"Fetching popular places for {destination}...")
        popular_places = self.places_client.get_popular_places(destination)
        
        # Get weather forecast if dates are provided
        weather_forecast = None
        if travel_dates and len(travel_dates) > 0:
            if popular_places and popular_places[0].get('location'):
                lat = popular_places[0]['location']['lat']
                lon = popular_places[0]['location']['lng']
                weather_forecast = self.weather_client.get_forecast(lat, lon, days)
        
        # Prepare places data for LLM
        places_info = self._format_places_for_llm(popular_places[:30])  # Top 30 places
        
        # Create prompt
        prompt = self._create_itinerary_prompt(
            destination, days, budget, places_info, weather_forecast, user_preferences
        )
        
        # Generate itinerary using LLM
        print("Generating itinerary with AI...")
        messages = [
            SystemMessage(content="You are an expert travel planner. Create detailed, practical itineraries based on user preferences, weather conditions, and available attractions."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)
        # Handle different response types from LangChain versions
        if hasattr(response, 'content'):
            itinerary_text = response.content
        elif isinstance(response, str):
            itinerary_text = response
        else:
            itinerary_text = str(response)
        
        # Parse the itinerary
        itinerary = self._parse_itinerary(itinerary_text, popular_places, weather_forecast)
        
        return itinerary
    
    def _format_places_for_llm(self, places: List[Dict]) -> str:
        """
        Format places data for LLM consumption
        """
        formatted = []
        for i, place in enumerate(places, 1):
            info = f"{i}. {place['name']}"
            info += f"\n   Rating: {place.get('rating', 'N/A')}/5"
            info += f"\n   Reviews: {place.get('user_ratings_total', 0)}"
            if place.get('types'):
                types = [t.replace('_', ' ') for t in place.get('types', [])[:3]]
                info += f"\n   Type: {', '.join(types)}"
            if place.get('vicinity'):
                info += f"\n   Location: {place['vicinity']}"
            formatted.append(info)
        
        return "\n\n".join(formatted)
    
    def _create_itinerary_prompt(
        self,
        destination: str,
        days: int,
        budget: str,
        places_info: str,
        weather_forecast: Optional[List[Dict]],
        user_preferences: Optional[str]
    ) -> str:
        """
        Create the prompt for itinerary generation
        """
        prompt = f"""Create a detailed {days}-day travel itinerary for {destination}.

BUDGET: {budget}

AVAILABLE PLACES AND ATTRACTIONS:
{places_info}

"""
        
        if weather_forecast:
            prompt += "WEATHER FORECAST:\n"
            for forecast in weather_forecast:
                prompt += f"Day {forecast.get('date', 'Unknown')}: {forecast.get('description', 'Unknown')}, {forecast.get('temperature', 0)}°C"
                if forecast.get('precipitation', 0) > 0:
                    prompt += f", Precipitation: {forecast.get('precipitation', 0)}mm"
                prompt += "\n"
            prompt += "\nIMPORTANT: Adjust activities based on weather. If it's raining or snowing, replace outdoor activities (like go-karting, hiking, beach visits) with indoor alternatives (museums, shopping, galleries, indoor attractions). Provide weather-appropriate suggestions.\n\n"
        
        if user_preferences:
            prompt += f"USER PREFERENCES: {user_preferences}\n\n"
        
        prompt += """Please create a detailed day-by-day itinerary with:
1. Day number and date (if weather forecast provided)
2. Morning activities (with time suggestions)
3. Afternoon activities (with time suggestions)
4. Evening activities (with time suggestions)
5. Restaurant/cafe recommendations for meals
6. Estimated costs for each day
7. Travel time between locations
8. Weather-appropriate activities

Format the response as JSON with the following structure:
{
  "summary": "Brief overview of the trip",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "weather": "Weather description",
      "morning": {
        "activities": [
          {
            "name": "Activity name",
            "time": "09:00-11:00",
            "location": "Location name",
            "cost": "Budget estimate",
            "weather_appropriate": true
          }
        ]
      },
      "afternoon": { "activities": [...] },
      "evening": { "activities": [...] },
      "meals": {
        "breakfast": "Restaurant/cafe suggestion",
        "lunch": "Restaurant/cafe suggestion",
        "dinner": "Restaurant/cafe suggestion"
      },
      "total_day_cost": "Estimated cost"
    }
  ],
  "total_budget": "Total estimated cost",
  "tips": ["Travel tip 1", "Travel tip 2", ...]
}

Ensure the itinerary is realistic, considers weather conditions, and stays within budget."""
        
        return prompt
    
    def _parse_itinerary(
        self,
        itinerary_text: str,
        places: List[Dict],
        weather_forecast: Optional[List[Dict]]
    ) -> Dict:
        """
        Parse the LLM response and match places with actual location data
        """
        try:
            # Try to extract JSON from the response
            json_start = itinerary_text.find('{')
            json_end = itinerary_text.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = itinerary_text[json_start:json_end]
                itinerary_data = json.loads(json_str)
            else:
                # Fallback: create a simple structure from text
                itinerary_data = {
                    "summary": itinerary_text[:500],
                    "itinerary": [],
                    "tips": []
                }
            
            # Match places from itinerary with actual Google Places data
            if 'itinerary' in itinerary_data:
                for day_plan in itinerary_data['itinerary']:
                    for time_period in ['morning', 'afternoon', 'evening']:
                        if time_period in day_plan and 'activities' in day_plan[time_period]:
                            for activity in day_plan[time_period]['activities']:
                                activity_name = activity.get('name', '')
                                # Try to find matching place
                                matched_place = self._find_matching_place(activity_name, places)
                                if matched_place:
                                    activity['place_id'] = matched_place.get('place_id')
                                    activity['location'] = matched_place.get('location')
                                    activity['rating'] = matched_place.get('rating')
                                    activity['address'] = matched_place.get('address', matched_place.get('vicinity'))
            
            # Add weather data to each day
            if weather_forecast and 'itinerary' in itinerary_data:
                for i, day_plan in enumerate(itinerary_data['itinerary']):
                    if i < len(weather_forecast):
                        day_plan['weather_data'] = weather_forecast[i]
            
            return itinerary_data
            
        except json.JSONDecodeError as e:
            print(f"Error parsing itinerary JSON: {e}")
            # Return a structured error response
            return {
                "summary": "Error parsing itinerary. Raw response provided below.",
                "raw_response": itinerary_text,
                "itinerary": [],
                "tips": ["Please review the raw response above"]
            }
    
    def _find_matching_place(self, activity_name: str, places: List[Dict]) -> Optional[Dict]:
        """
        Find a matching place from the places list based on activity name
        """
        activity_lower = activity_name.lower()
        for place in places:
            place_name_lower = place.get('name', '').lower()
            # Simple matching - check if place name contains activity name or vice versa
            if (activity_lower in place_name_lower or 
                place_name_lower in activity_lower or
                any(word in place_name_lower for word in activity_lower.split() if len(word) > 3)):
                return place
        return None
    
    def adjust_itinerary_for_weather(self, itinerary: Dict, weather_forecast: List[Dict]) -> Dict:
        """
        Post-process itinerary to adjust for weather conditions
        """
        if 'itinerary' not in itinerary:
            return itinerary
        
        for i, day_plan in enumerate(itinerary['itinerary']):
            if i < len(weather_forecast):
                weather = weather_forecast[i]
                is_bad_weather = self.weather_client.is_bad_weather(weather)
                
                if is_bad_weather:
                    # Adjust activities for bad weather
                    for time_period in ['morning', 'afternoon', 'evening']:
                        if time_period in day_plan and 'activities' in day_plan[time_period]:
                            for activity in day_plan[time_period]['activities']:
                                activity_name = activity.get('name', '')
                                suitability = self.weather_client.get_activity_suitability(
                                    activity_name, weather
                                )
                                
                                if not suitability['suitable']:
                                    activity['weather_adjusted'] = True
                                    activity['original_activity'] = activity_name
                                    if suitability['alternatives']:
                                        activity['suggested_alternatives'] = suitability['alternatives']
                                    activity['weather_note'] = suitability['reason']
        
        return itinerary
