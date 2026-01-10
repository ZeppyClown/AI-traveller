# AI Travel Planner

An intelligent travel planning application similar to Wanderlog, powered by AI and integrated with Google Places API and weather services. Create personalized, weather-aware itineraries for any destination.

## Features

- 🗺️ **Interactive Map Visualization**: View your destination and popular places on an interactive map
- 🔍 **Google Places Integration**: Search for destinations and discover popular attractions from Google
- 🤖 **AI Itinerary Generation**: Generate personalized itineraries using LangChain and Google Gemini
- 🌤️ **Weather-Aware Planning**: Automatically adjusts activities based on weather conditions
- 📝 **User Notes**: Add personal notes and preferences about places
- 💰 **Budget Planning**: Plan trips according to budget constraints (Budget, Moderate, Luxury)
- 📅 **Date-Based Planning**: Get weather forecasts and time-specific recommendations

## Prerequisites

- Python 3.8 or higher
- API Keys:
  - Google Maps API Key (for Places API)
  - OpenWeather API Key
  - Google Gemini API Key

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (or create a `.env` file)
   - Add your API keys:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Getting API Keys

### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Geocoding API
   - Maps JavaScript API
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### OpenWeather API Key
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key to your `.env` file

### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy your API key
5. Add it to your `.env` file as `GEMINI_API_KEY`

## Usage

Run the Streamlit application:

```bash
streamlit run app.py
```

The application will open in your default web browser.

### How to Use

1. **Enter Trip Details** (in the sidebar):
   - Destination (country or city)
   - Number of days
   - Budget level
   - Travel start date
   - Optional preferences

2. **Search Destination**:
   - Click "🔍 Search Destination" to find and validate your destination
   - The map will show your destination location

3. **Find Popular Places**:
   - Click "🔍 Find Popular Places" to discover top attractions
   - Places will be marked on the map with ratings

4. **Generate AI Itinerary**:
   - Click "✨ Generate AI Itinerary"
   - The AI will create a personalized itinerary based on:
     - Popular places in the destination
     - Weather forecast for your travel dates
     - Your budget and preferences
     - Weather-appropriate activities (indoor alternatives for bad weather)

5. **Review Your Itinerary**:
   - View day-by-day plans with activities, times, and costs
   - Check weather alerts and adjusted activities
   - See the itinerary route on the map
   - Download as JSON for reference

## Project Structure

```
AI traveller/
├── app.py                 # Main Streamlit application
├── config.py              # Configuration and environment variables
├── google_places.py       # Google Places API integration
├── weather_api.py         # Weather API integration
├── itinerary_planner.py   # AI itinerary generation using LangChain
├── map_visualization.py   # Map creation and visualization
├── requirements.txt       # Python dependencies
├── README.md             # This file
└── .env                  # Environment variables (create this)
```

## Features in Detail

### Weather-Aware Itinerary
The AI planner checks weather conditions for each day and automatically:
- Suggests indoor alternatives for outdoor activities when it's raining/snowing
- Adjusts activities like go-karting, hiking, beach visits based on weather
- Provides alternative suggestions (museums, galleries, shopping, etc.)

### Smart Place Matching
- Fetches real-time popular places from Google Places API
- Matches AI-suggested activities with actual places
- Includes ratings, reviews, and location data

### Interactive Map
- Shows destination country/city
- Marks all popular places with color-coded ratings
- Displays itinerary route day-by-day
- Interactive markers with detailed information

## Limitations

- Requires internet connection for API calls
- API usage limits apply (especially Google Places API)
- Weather forecasts are limited to 5 days (OpenWeather free tier)
- Some features may require paid API tiers for higher usage

## Troubleshooting

**Error: API Key not found**
- Make sure you've created a `.env` file with all required API keys
- Check that the keys are correct and active

**Error: Destination not found**
- Try using more specific location names (city, country)
- Check your Google Maps API key has Places API enabled

**Error: No itinerary generated**
- Verify your Google Gemini API key is valid and has quota remaining
- Check your internet connection
- Try again with fewer days or a simpler destination
- Ensure you're using a supported model (e.g., gemini-pro)

## Future Enhancements

- [ ] Save and load trip plans
- [ ] Share itineraries with others
- [ ] Hotel and accommodation recommendations
- [ ] Restaurant recommendations with reviews
- [ ] Real-time flight and hotel price integration
- [ ] Multi-destination trips
- [ ] Offline mode with cached data

## License

This project is open source and available for personal and commercial use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
