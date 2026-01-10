"""
Weather API integration for checking weather conditions
"""
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import config

class WeatherClient:
    def __init__(self):
        self.api_key = config.OPENWEATHER_API_KEY
        self.base_url = "http://api.openweathermap.org/data/2.5"
    
    def get_current_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Get current weather for a location
        """
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting current weather: {e}")
            return None
    
    def get_forecast(self, lat: float, lon: float, days: int = 5) -> List[Dict]:
        """
        Get weather forecast for multiple days
        """
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Group forecasts by day
            daily_forecasts = {}
            for item in data.get('list', []):
                date = datetime.fromtimestamp(item['dt']).date()
                if date not in daily_forecasts:
                    daily_forecasts[date] = []
                daily_forecasts[date].append(item)
            
            # Get average/main conditions for each day
            forecast_list = []
            sorted_dates = sorted(daily_forecasts.keys())[:days]
            
            for date in sorted_dates:
                day_items = daily_forecasts[date]
                # Use the midday forecast as representative
                midday_item = min(day_items, key=lambda x: abs(12 - datetime.fromtimestamp(x['dt']).hour))
                
                forecast_list.append({
                    'date': date.isoformat(),
                    'temperature': midday_item['main']['temp'],
                    'feels_like': midday_item['main']['feels_like'],
                    'description': midday_item['weather'][0]['description'],
                    'main': midday_item['weather'][0]['main'],
                    'wind_speed': midday_item.get('wind', {}).get('speed', 0),
                    'humidity': midday_item['main']['humidity'],
                    'precipitation': midday_item.get('rain', {}).get('3h', 0) + midday_item.get('snow', {}).get('3h', 0)
                })
            
            return forecast_list
        except Exception as e:
            print(f"Error getting forecast: {e}")
            return []
    
    def is_bad_weather(self, weather_data: Dict) -> bool:
        """
        Check if weather is bad for outdoor activities
        """
        if not weather_data:
            return False
        
        main = weather_data.get('main', '').lower()
        description = weather_data.get('description', '').lower()
        precipitation = weather_data.get('precipitation', 0)
        
        # Bad weather conditions
        bad_conditions = ['rain', 'snow', 'storm', 'thunderstorm', 'drizzle', 'sleet']
        
        return (main in bad_conditions or 
                any(condition in description for condition in bad_conditions) or
                precipitation > 0)
    
    def get_weather_summary(self, weather_data: Dict) -> str:
        """
        Get a human-readable weather summary
        """
        if not weather_data:
            return "Weather data not available"
        
        main = weather_data.get('main', 'Unknown')
        description = weather_data.get('description', 'Unknown').title()
        temp = weather_data.get('temperature', 0)
        precipitation = weather_data.get('precipitation', 0)
        
        summary = f"{description}, {temp}°C"
        if precipitation > 0:
            summary += f", {precipitation}mm precipitation"
        
        return summary
    
    def get_activity_suitability(self, activity_type: str, weather_data: Dict) -> Dict[str, any]:
        """
        Determine if an activity is suitable based on weather
        Returns: {'suitable': bool, 'reason': str, 'alternatives': List[str]}
        """
        outdoor_activities = ['go-karting', 'hiking', 'beach', 'outdoor', 'park', 'garden', 
                             'sightseeing', 'walking tour', 'cycling', 'boating']
        indoor_activities = ['museum', 'gallery', 'shopping', 'indoor', 'theater', 'cinema', 
                           'restaurant', 'cafe', 'mall']
        
        activity_lower = activity_type.lower()
        is_outdoor = any(outdoor in activity_lower for outdoor in outdoor_activities)
        is_indoor = any(indoor in activity_lower for indoor in indoor_activities)
        
        if is_indoor:
            return {
                'suitable': True,
                'reason': 'Indoor activity, weather independent',
                'alternatives': []
            }
        
        if is_outdoor:
            is_bad = self.is_bad_weather(weather_data)
            if is_bad:
                alternatives = self._get_alternative_activities(activity_type)
                return {
                    'suitable': False,
                    'reason': f'Bad weather conditions: {self.get_weather_summary(weather_data)}',
                    'alternatives': alternatives
                }
            else:
                return {
                    'suitable': True,
                    'reason': 'Weather conditions are suitable',
                    'alternatives': []
                }
        
        # Unknown activity type - assume suitable but warn
        return {
            'suitable': True,
            'reason': 'Activity type unclear, proceeding with caution',
            'alternatives': []
        }
    
    def _get_alternative_activities(self, activity_type: str) -> List[str]:
        """
        Suggest alternative activities based on activity type
        """
        alternatives_map = {
            'go-karting': ['Indoor go-karting', 'Indoor arcade', 'Shopping mall', 'Museum', 'Escape room'],
            'hiking': ['Museum', 'Art gallery', 'Shopping', 'Indoor market', 'Spa'],
            'beach': ['Aquarium', 'Shopping center', 'Museum', 'Indoor pool', 'Cinema'],
            'park': ['Museum', 'Art gallery', 'Shopping district', 'Indoor market', 'Library'],
            'outdoor': ['Museum', 'Shopping', 'Art gallery', 'Indoor activities', 'Cultural center']
        }
        
        activity_lower = activity_type.lower()
        for key, alternatives in alternatives_map.items():
            if key in activity_lower:
                return alternatives
        
        return ['Museum', 'Shopping', 'Indoor attractions', 'Cultural sites', 'Restaurants']
