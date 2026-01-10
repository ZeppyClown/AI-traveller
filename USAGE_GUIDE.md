# Quick Start Guide

## Setup Steps

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Get API Keys**
   - **Google Maps API Key**: 
     - Go to https://console.cloud.google.com/
     - Create a project
     - Enable "Places API", "Geocoding API", and "Maps JavaScript API"
     - Create credentials (API Key)
   
   - **OpenWeather API Key**:
     - Go to https://openweathermap.org/api
     - Sign up for free account
     - Get API key from dashboard
   
   - **Google Gemini API Key**:
     - Go to https://makersuite.google.com/app/apikey
     - Sign in with your Google account
     - Click "Create API Key" or "Get API Key"
     - Copy your API key

3. **Create .env File**
   Create a file named `.env` in the project root with:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   DEFAULT_MODEL=gemini-pro
   ```

4. **Run the Application**
   ```bash
   streamlit run app.py
   ```

## How to Use

### Step 1: Enter Trip Details
- Fill in the sidebar with:
  - Destination (e.g., "Paris, France" or "Tokyo, Japan")
  - Number of days for your trip
  - Budget level (Budget, Moderate, or Luxury)
  - Travel start date
  - Optional preferences (e.g., "Interested in museums and food")

### Step 2: Search Destination
- Click "🔍 Search Destination" button
- The map will show your destination location
- Destination information will be displayed

### Step 3: Find Popular Places
- Click "🔍 Find Popular Places" button
- The app will fetch top attractions from Google Places API
- Places will be marked on the map with ratings

### Step 4: Generate AI Itinerary
- Click "✨ Generate AI Itinerary" button
- The AI will:
  - Use LangChain and Google Gemini to create a personalized itinerary
  - Check weather forecast for your travel dates
  - Adjust activities based on weather (e.g., skip outdoor activities if raining)
  - Match activities with actual places from Google Places API
  - Provide day-by-day schedule with times and costs

### Step 5: Review and Download
- Review your generated itinerary
- See weather-adjusted activities highlighted
- View itinerary route on the map
- Download itinerary as JSON for offline reference

## Example Usage

**Destination**: "Paris, France"
**Days**: 3
**Budget**: Moderate ($$)
**Start Date**: 2024-06-01
**Preferences**: "Interested in art museums, French cuisine, and historical sites"

The AI will generate a 3-day itinerary with:
- Morning, afternoon, and evening activities
- Restaurant recommendations for meals
- Weather-appropriate activities (if rain forecasted, suggests indoor museums instead of outdoor activities)
- Estimated costs per day
- Travel tips

## Troubleshooting

### Error: API Key not found
- Make sure you created a `.env` file in the project root
- Verify all API keys are correctly entered
- Check for typos in variable names

### Error: Destination not found
- Try using more specific location names
- Use format: "City, Country" (e.g., "Paris, France")
- Check that your Google Maps API key has Places API enabled

### Error: No itinerary generated
- Verify your Google Gemini API key is valid and has quota remaining
- Check your internet connection
- Try with a simpler destination or fewer days

### Weather forecast not showing
- Verify your OpenWeather API key is valid
- Travel dates must be within 5 days (free tier limit)
- Check that dates are not in the past

## Features Explained

### Weather-Aware Planning
The AI automatically adjusts your itinerary based on weather:
- If raining/snowing: Outdoor activities (go-karting, hiking, beach) are replaced with indoor alternatives (museums, galleries, shopping)
- Bad weather days show warnings and suggested alternatives
- Weather conditions are displayed for each day

### Place Matching
- AI suggests activities based on popular places
- Activities are matched with actual Google Places data
- Includes ratings, reviews, and addresses
- Shows locations on interactive map

### Budget Planning
- Estimates costs for each activity
- Provides daily budget breakdown
- Total trip cost estimation
- Suggestions aligned with budget level

## Tips for Best Results

1. **Be Specific with Preferences**: The more details you provide, the better the itinerary
2. **Check Weather**: If traveling during rainy season, the AI will automatically adjust
3. **Review Place Ratings**: Popular places are sorted by rating and reviews
4. **Multiple Destinations**: Currently supports single destination trips
5. **Save Your Itinerary**: Download the JSON for offline access
