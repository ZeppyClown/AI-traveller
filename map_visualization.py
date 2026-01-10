"""
Map visualization using Folium
"""
import folium
from folium import plugins
from typing import List, Dict, Optional
import json

class MapVisualizer:
    def __init__(self):
        self.map = None
    
    def create_country_map(self, destination: str, location: Dict[str, float]) -> folium.Map:
        """
        Create a map centered on the destination country
        """
        self.map = folium.Map(
            location=[location['lat'], location['lng']],
            zoom_start=6,
            tiles='satellite'
        )
        
        # Add a marker for the destination
        folium.Marker(
            [location['lat'], location['lng']],
            popup=destination,
            tooltip=destination,
            icon=folium.Icon(color='red', icon='info-sign')
        ).add_to(self.map)
        
        return self.map
    
    def add_places_to_map(self, places: List[Dict], map_obj: Optional[folium.Map] = None) -> folium.Map:
        """
        Add multiple places to the map
        """
        if map_obj is None:
            map_obj = self.map
        
        if map_obj is None:
            raise ValueError("No map object provided. Create a map first.")
        
        # Group places by rating for color coding
        for place in places:
            location = place.get('location')
            if not location:
                continue
            
            lat = location.get('lat')
            lng = location.get('lng')
            name = place.get('name', 'Unknown')
            rating = place.get('rating', 0)
            address = place.get('address') or place.get('vicinity', '')
            
            # Color code by rating
            if rating >= 4.5:
                color = 'green'
                icon = 'star'
            elif rating >= 4.0:
                color = 'blue'
                icon = 'info-sign'
            elif rating >= 3.5:
                color = 'orange'
                icon = 'map-marker'
            else:
                color = 'gray'
                icon = 'map-marker'
            
            # Create popup content
            popup_html = f"""
            <div style="width:250px">
                <h4>{name}</h4>
                <p><b>Rating:</b> {rating}/5 ({place.get('user_ratings_total', 0)} reviews)</p>
                <p><b>Address:</b> {address}</p>
            </div>
            """
            
            folium.Marker(
                [lat, lng],
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"{name} ({rating}★)",
                icon=folium.Icon(color=color, icon=icon)
            ).add_to(map_obj)
        
        return map_obj
    
    def add_itinerary_route(self, itinerary: Dict, map_obj: Optional[folium.Map] = None) -> folium.Map:
        """
        Add itinerary route to the map with day-by-day markers
        """
        if map_obj is None:
            map_obj = self.map
        
        if map_obj is None:
            raise ValueError("No map object provided. Create a map first.")
        
        if 'itinerary' not in itinerary:
            return map_obj
        
        # Day colors
        day_colors = ['red', 'blue', 'green', 'purple', 'orange', 'darkred', 
                     'lightred', 'beige', 'darkblue', 'darkgreen', 'cadetblue', 
                     'darkpurple', 'white', 'pink', 'lightblue', 'lightgreen', 
                     'gray', 'black', 'lightgray']
        
        for day_index, day_plan in enumerate(itinerary['itinerary']):
            day = day_plan.get('day', day_index + 1)
            color = day_colors[day_index % len(day_colors)]
            
            # Collect all locations for this day
            day_locations = []
            for time_period in ['morning', 'afternoon', 'evening']:
                if time_period in day_plan and 'activities' in day_plan[time_period]:
                    for activity in day_plan[time_period]['activities']:
                        if activity.get('location'):
                            loc = activity['location']
                            day_locations.append({
                                'location': [loc['lat'], loc['lng']],
                                'name': activity.get('name', 'Activity'),
                                'time': activity.get('time', ''),
                                'time_period': time_period
                            })
            
            # Add markers for each activity
            for i, loc_data in enumerate(day_locations):
                marker = folium.Marker(
                    loc_data['location'],
                    popup=f"Day {day} - {loc_data['time_period'].title()}<br>{loc_data['name']}<br>{loc_data['time']}",
                    tooltip=f"Day {day}: {loc_data['name']}",
                    icon=folium.Icon(color=color, icon='map-marker', prefix='fa')
                )
                marker.add_to(map_obj)
                
                # Add day number label
                folium.plugins.MarkerCluster().add_child(marker)
            
            # Draw route if there are multiple locations
            if len(day_locations) > 1:
                route_coords = [loc['location'] for loc in day_locations]
                folium.PolyLine(
                    route_coords,
                    color=color,
                    weight=3,
                    opacity=0.7,
                    popup=f"Day {day} Route"
                ).add_to(map_obj)
        
        # Add a layer control
        folium.LayerControl().add_to(map_obj)
        
        return map_obj
    
    def save_map(self, filepath: str, map_obj: Optional[folium.Map] = None):
        """
        Save map to HTML file
        """
        if map_obj is None:
            map_obj = self.map
        
        if map_obj is None:
            raise ValueError("No map object to save")
        
        map_obj.save(filepath)
