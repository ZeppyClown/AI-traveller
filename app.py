"""
Main Streamlit Application for AI Travel Planner with Router
"""
import streamlit as st
import folium
from streamlit_folium import st_folium
from datetime import datetime, timedelta
import json
from typing import Dict, List, Optional

from config import GOOGLE_MAPS_API_KEY, OPENWEATHER_API_KEY, GEMINI_API_KEY
from google_places import GooglePlacesClient
from weather_api import WeatherClient
from itinerary_planner import ItineraryPlanner
from map_visualization import MapVisualizer

# Page configuration
st.set_page_config(
    page_title="AI Travel Planner",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items=None
)

# Remove default padding
st.markdown("""
    <style>
        .main .block-container {
            padding-top: 1rem;
            padding-bottom: 1rem;
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            height: 100vh;
        }
        .stApp {
            margin-top: 0;
        }
    </style>
""", unsafe_allow_html=True)

# Initialize session state
if 'page' not in st.session_state:
    st.session_state.page = 'landing'  # 'landing' or 'travel'
if 'destination_data' not in st.session_state:
    st.session_state.destination_data = None
if 'itinerary' not in st.session_state:
    st.session_state.itinerary = None
if 'places' not in st.session_state:
    st.session_state.places = []
if 'manual_itinerary' not in st.session_state:
    st.session_state.manual_itinerary = {}
if 'autocomplete_results' not in st.session_state:
    st.session_state.autocomplete_results = {}
if 'destination' not in st.session_state:
    st.session_state.destination = ''
if 'num_days' not in st.session_state:
    st.session_state.num_days = 3
if 'budget' not in st.session_state:
    st.session_state.budget = 'Moderate ($$)'
if 'start_date' not in st.session_state:
    st.session_state.start_date = datetime.now().date()
if 'user_preferences' not in st.session_state:
    st.session_state.user_preferences = ''

# Initialize clients
@st.cache_resource
def get_clients():
    try:
        places_client = GooglePlacesClient()
        if not hasattr(places_client, 'autocomplete_places'):
            raise AttributeError("GooglePlacesClient missing autocomplete_places method")
        return {
            'places': places_client,
            'weather': WeatherClient(),
            'planner': ItineraryPlanner(),
            'map': MapVisualizer()
        }
    except Exception as e:
        st.error(f"Error initializing clients: {e}")
        st.warning("Please make sure all API keys are set in your .env file")
        return None

clients = get_clients()

if clients is None:
    st.stop()

# Router: Landing Page
def landing_page():
    """Landing page where user enters destination"""
    st.title("✈️ AI Travel Planner")
    st.markdown("### Where are you going?")
    st.markdown("Plan your perfect trip with AI-powered itinerary generation")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        <div style='padding: 20px;'>
            <h3>Enter your destination to get started</h3>
            <p>Tell us where you want to travel, and we'll help you create the perfect itinerary!</p>
        </div>
        """, unsafe_allow_html=True)
        
        destination = st.text_input(
            "Destination (Country/City)",
            value=st.session_state.destination,
            placeholder="e.g., Paris, France or Tokyo, Japan",
            help="Enter the country or city you want to visit",
            key="landing_destination"
        )
        
        num_days = st.number_input(
            "Number of Days",
            min_value=1,
            max_value=30,
            value=st.session_state.num_days,
            step=1,
            key="landing_num_days"
        )
        
        budget = st.selectbox(
            "Budget",
            options=["Budget ($)", "Moderate ($$)", "Luxury ($$$)"],
            index=1,
            key="landing_budget"
        )
        
        start_date = st.date_input(
            "Travel Start Date",
            value=st.session_state.start_date,
            min_value=datetime.now().date(),
            key="landing_start_date"
        )
        
        user_preferences = st.text_area(
            "Preferences (optional)",
            value=st.session_state.user_preferences,
            placeholder="E.g., Interested in museums, local food, outdoor activities",
            help="Tell us what you're interested in",
            height=100,
            key="landing_preferences"
        )
        
        if st.button("🚀 Start Planning", type="primary", use_container_width=True):
            if destination:
                with st.spinner(f"Searching for {destination}..."):
                    try:
                        place_data = clients['places'].search_place(destination)
                        if place_data:
                            # Save to session state
                            st.session_state.destination_data = place_data
                            st.session_state.destination = destination
                            st.session_state.num_days = num_days
                            st.session_state.budget = budget
                            st.session_state.start_date = start_date
                            st.session_state.user_preferences = user_preferences
                            
                            # Navigate to travel page
                            st.session_state.page = 'travel'
                            st.rerun()
                        else:
                            st.error("Destination not found. Please try again with a different location.")
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
            else:
                st.warning("Please enter a destination")
    
    with col2:
        st.markdown("""
        <div style='background-color: #f0f2f6; padding: 20px; border-radius: 10px;'>
            <h4>✨ Features</h4>
            <ul>
                <li>🗺️ Interactive Maps</li>
                <li>🤖 AI Itinerary Planning</li>
                <li>🌤️ Weather-Aware Suggestions</li>
                <li>📍 Google Places Integration</li>
                <li>💰 Budget Planning</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

# Router: Travel Page
def travel_page():
    """Travel page with 1:3 split - left: itinerary, right: map"""
    
    destination_data = st.session_state.destination_data
    if not destination_data:
        st.error("No destination selected. Redirecting to landing page...")
        st.session_state.page = 'landing'
        st.rerun()
        return
    
    location = destination_data['location']
    destination = st.session_state.destination
    num_days = st.session_state.num_days
    start_date = st.session_state.start_date
    budget = st.session_state.budget
    user_preferences = st.session_state.user_preferences
    
    # Remove default padding and make full page - no containers
    st.markdown("""
        <style>
            .main .block-container {
                padding-top: 0rem;
                padding-bottom: 0rem;
                padding-left: 0rem;
                padding-right: 0rem;
                max-width: 100%;
            }
            section[data-testid="stSidebar"] {
                display: none;
            }
            header[data-testid="stHeader"] {
                display: none;
            }
            .stApp > header {
                display: none;
            }
            div[data-testid="stToolbar"] {
                display: none;
            }
            .stApp {
                margin-top: 0;
            }
            section.main {
                padding-top: 0;
            }
        </style>
    """, unsafe_allow_html=True)
    
    # Main layout: 1:3 split (Itinerary : Map) - Full page coverage
    itinerary_col, map_col = st.columns([1, 3], gap="small")
    
    with itinerary_col:
        # Minimal header with back button
        col_back, col_title = st.columns([1, 3])
        with col_back:
            if st.button("←", help="Back to landing", use_container_width=True):
                st.session_state.page = 'landing'
                st.rerun()
        with col_title:
            st.markdown(f"### {destination_data['name']}")
        
        st.markdown("---")
        
        # Initialize manual itinerary structure if not exists
        for day_num in range(1, num_days + 1):
            day_key = f"day_{day_num}"
            if day_key not in st.session_state.manual_itinerary:
                st.session_state.manual_itinerary[day_key] = {
                    'date': (start_date + timedelta(days=day_num - 1)).strftime('%A, %B %d'),
                    'iso_date': (start_date + timedelta(days=day_num - 1)).isoformat(),
                    'places': [],
                    'notes': ''
                }
        
        
        # Merge AI itinerary if available
        if st.session_state.itinerary and 'itinerary' in st.session_state.itinerary:
            ai_itinerary = st.session_state.itinerary.get('itinerary', [])
            for day_plan in ai_itinerary:
                day_num = day_plan.get('day', 1)
                day_key = f"day_{day_num}"
                
                all_activities = []
                for time_period in ['morning', 'afternoon', 'evening']:
                    if time_period in day_plan and day_plan[time_period].get('activities'):
                        all_activities.extend(day_plan[time_period]['activities'])
                
                if day_key in st.session_state.manual_itinerary:
                    existing_names = [p.get('name') for p in st.session_state.manual_itinerary[day_key]['places']]
                    for activity in all_activities:
                        if activity.get('name') and activity.get('name') not in existing_names:
                            place_info = {
                                'name': activity.get('name'),
                                'time': activity.get('time', ''),
                                'address': activity.get('address', ''),
                                'location': activity.get('location'),
                                'rating': activity.get('rating'),
                                'cost': activity.get('cost', ''),
                                'type': activity.get('type', 'activity'),
                                'from_ai': True
                            }
                            st.session_state.manual_itinerary[day_key]['places'].append(place_info)
        
        # Display day-by-day itinerary (scrollable)
        with st.container():
            for day_num in range(1, num_days + 1):
                day_key = f"day_{day_num}"
                day_data = st.session_state.manual_itinerary.get(day_key, {})
                day_date = day_data.get('date', f"Day {day_num}")
                
                # Day expander
                with st.expander(f"📅 {day_date}", expanded=(day_num == 1)):
                    # Weather info
                    weather_info = None
                    if st.session_state.itinerary and 'itinerary' in st.session_state.itinerary:
                        for day_plan in st.session_state.itinerary['itinerary']:
                            if day_plan.get('day') == day_num:
                                weather_info = day_plan.get('weather_data')
                    
                    if weather_info:
                        weather_summary = clients['weather'].get_weather_summary(weather_info)
                        if clients['weather'].is_bad_weather(weather_info):
                            st.warning(f"⚠️ {weather_summary}")
                        else:
                            st.success(f"☀️ {weather_summary}")
                    
                    # Notes
                    notes = st.text_area(
                        "Notes",
                        value=day_data.get('notes', ''),
                        key=f"notes_{day_num}",
                        placeholder="Add notes...",
                        height=68
                    )
                    st.session_state.manual_itinerary[day_key]['notes'] = notes
                    
                    # Add place search
                    place_query = st.text_input(
                        "🔍 Search place",
                        key=f"place_search_{day_num}",
                        placeholder="Type place name...",
                        help="Start typing to see suggestions"
                    )
                    
                    # Autocomplete suggestions
                    if place_query and len(place_query) > 2:
                        try:
                            location_bias = destination_data.get('location')
                            suggestions = clients['places'].autocomplete_places(place_query, location_bias)
                            
                            if suggestions:
                                for idx, suggestion in enumerate(suggestions[:3]):
                                    suggestion_text = f"{suggestion.get('main_text', suggestion.get('name', ''))}"
                                    if suggestion.get('rating'):
                                        suggestion_text += f" ⭐ {suggestion['rating']}/5"
                                    
                                    if st.button(suggestion_text, key=f"suggest_{day_num}_{idx}", use_container_width=True):
                                        place_info = {
                                            'name': suggestion.get('main_text') or suggestion.get('name'),
                                            'address': suggestion.get('secondary_text') or suggestion.get('address', ''),
                                            'location': suggestion.get('location'),
                                            'place_id': suggestion.get('place_id'),
                                            'rating': suggestion.get('rating'),
                                            'type': 'place'
                                        }
                                        st.session_state.manual_itinerary[day_key]['places'].append(place_info)
                                        st.rerun()
                        except Exception as e:
                            st.error(f"Error: {e}")
                    
                    # Display places
                    places_list = day_data.get('places', [])
                    if places_list:
                        for idx, place in enumerate(places_list):
                            st.markdown(f"**{place.get('name', 'Place')}**")
                            if place.get('address'):
                                st.caption(f"📍 {place['address']}")
                            if place.get('time'):
                                st.caption(f"🕐 {place['time']}")
                            
                            col_edit, col_del = st.columns(2)
                            with col_edit:
                                if st.button("✏️", key=f"edit_{day_num}_{idx}", use_container_width=True):
                                    pass
                            with col_del:
                                if st.button("🗑️", key=f"del_{day_num}_{idx}", use_container_width=True):
                                    st.session_state.manual_itinerary[day_key]['places'].pop(idx)
                                    st.rerun()
                            st.divider()
                    else:
                        st.info("No places added yet")
    
    with map_col:
        # Minimal header
        st.markdown("### 🗺️ Map")
        
        # Create map
        travel_map = clients['map'].create_country_map(destination_data['name'], location)
        
        # Add popular places if available
        if st.session_state.places:
            clients['map'].add_places_to_map(st.session_state.places, travel_map)
        
        # Add itinerary places to map
        all_itinerary_places = []
        for day_key in st.session_state.manual_itinerary:
            day_places = st.session_state.manual_itinerary[day_key].get('places', [])
            for place in day_places:
                if place.get('location'):
                    all_itinerary_places.append(place)
        
        if all_itinerary_places:
            clients['map'].add_places_to_map(all_itinerary_places, travel_map)
        
        # Add itinerary route if available
        if st.session_state.itinerary:
            itinerary_dict = {
                'itinerary': []
            }
            for day_key in sorted(st.session_state.manual_itinerary.keys()):
                day_data = st.session_state.manual_itinerary[day_key]
                day_places = day_data.get('places', [])
                if day_places:
                    day_plan = {
                        'day': int(day_key.split('_')[1]),
                        'morning': {'activities': []},
                        'afternoon': {'activities': []},
                        'evening': {'activities': []}
                    }
                    for place in day_places:
                        activity = {
                            'name': place.get('name'),
                            'location': place.get('location'),
                            'address': place.get('address')
                        }
                        day_plan['morning']['activities'].append(activity)
                    itinerary_dict['itinerary'].append(day_plan)
            
            if itinerary_dict['itinerary']:
                clients['map'].add_itinerary_route(itinerary_dict, travel_map)
        
        # Display map (full width and height of column)
        # Calculate available height (viewport minus header/padding)
        map_height = 900
        st_folium(travel_map, width=None, height=map_height, returned_objects=[])
        
        # Find popular places button - positioned at bottom of map column
        st.markdown("---")
        col_find, col_ai = st.columns(2)
        with col_find:
            if st.button("🔍 Find Popular Places", use_container_width=True):
                with st.spinner("Fetching popular places..."):
                    try:
                        places = clients['places'].get_popular_places(destination)
                        st.session_state.places = places
                        st.success(f"Found {len(places)} popular places!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
        with col_ai:
            if st.button("✨ Generate AI Itinerary", use_container_width=True):
                with st.spinner("Generating itinerary..."):
                    try:
                        if not st.session_state.places:
                            st.session_state.places = clients['places'].get_popular_places(destination)
                        
                        travel_dates = [(start_date + timedelta(days=i)).isoformat() for i in range(num_days)]
                        itinerary = clients['planner'].generate_itinerary(
                            destination=destination,
                            days=num_days,
                            budget=budget,
                            travel_dates=travel_dates,
                            user_preferences=user_preferences
                        )
                        st.session_state.itinerary = itinerary
                        st.success("Itinerary generated!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {str(e)}")

# Router logic
# if st.session_state.page == 'landing':
#     landing_page()
# elif st.session_state.page == 'travel':
#     travel_page()

if st.session_state.page == 'landing':
    travel_page()

# Footer
st.divider()
st.markdown("""
<div style='text-align: center; color: gray; font-size: 0.8em;'>
    <p>AI Travel Planner - Powered by LangChain, Google Gemini, Google Places API, and OpenWeather API</p>
</div>
""", unsafe_allow_html=True)
