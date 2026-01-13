import { GoogleGenerativeAI } from '@google/generative-ai';
import { GooglePlacesClient, PlaceDetails } from './googlePlaces';
import { WeatherClient, WeatherData } from './weatherApi';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface DayPlan {
    day: number;
    date?: string;
    weather?: string;
    weather_data?: WeatherData;
    morning: { activities: Activity[] };
    afternoon: { activities: Activity[] };
    evening: { activities: Activity[] };
    meals: {
        breakfast?: string;
        lunch?: string;
        dinner?: string;
    };
    total_day_cost?: string;
}

interface Activity {
    name: string;
    time: string;
    location?: any;
    address?: string;
    cost?: string;
    weather_appropriate?: boolean;
    place_id?: string;
    rating?: number;
    weather_adjusted?: boolean;
    original_activity?: string;
    suggested_alternatives?: string[];
    weather_note?: string;
    type?: string;
}

export interface Itinerary {
    summary: string;
    itinerary: DayPlan[];
    total_budget: string;
    tips: string[];
}

export class ItineraryPlanner {
    private placesClient: GooglePlacesClient;
    private weatherClient: WeatherClient;
    private model: any;

    constructor() {
        this.placesClient = new GooglePlacesClient();
        this.weatherClient = new WeatherClient();
        this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async generateItinerary(
        destination: string,
        days: number,
        budget: string,
        travelDates?: string[],
        userPreferences?: string
    ): Promise<Itinerary> {

        // 1. Get Popular Places
        const popularPlaces = await this.placesClient.getPopularPlaces(destination);

        // 2. Get Weather
        let weatherForecast: WeatherData[] = [];
        if (travelDates && travelDates.length > 0 && popularPlaces.length > 0) {
            const loc = popularPlaces[0].location;
            if (loc) {
                weatherForecast = await this.weatherClient.getForecast(loc.lat, loc.lng, days);
            }
        }

        // 3. Prepare Prompt
        const placesInfo = this.formatPlacesForLLM(popularPlaces.slice(0, 30));
        const prompt = this.createPrompt(destination, days, budget, placesInfo, weatherForecast, userPreferences);

        // 4. Generate with Gemini
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 5. Parse
            const itinerary = this.parseItinerary(text, popularPlaces, weatherForecast);
            return itinerary;
        } catch (e) {
            console.error("Error generating itinerary:", e);
            throw e;
        }
    }

    private formatPlacesForLLM(places: PlaceDetails[]): string {
        return places.map((p, i) => {
            let info = `${i + 1}. ${p.name}`;
            if (p.rating) info += `\n   Rating: ${p.rating}/5`;
            if (p.user_ratings_total) info += `\n   Reviews: ${p.user_ratings_total}`;
            if (p.types) info += `\n   Type: ${p.types.slice(0, 3).join(', ').replace(/_/g, ' ')}`;
            if (p.vicinity) info += `\n   Location: ${p.vicinity}`;
            return info;
        }).join('\n\n');
    }

    private createPrompt(
        destination: string,
        days: number,
        budget: string,
        placesInfo: string,
        weatherForecast: WeatherData[],
        userPreferences?: string
    ): string {
        let prompt = `Create a detailed ${days}-day travel itinerary for ${destination}.\n\nBUDGET: ${budget}\n\nAVAILABLE PLACES AND ATTRACTIONS:\n${placesInfo}\n\n`;

        if (weatherForecast.length > 0) {
            prompt += "WEATHER FORECAST:\n";
            weatherForecast.forEach(f => {
                prompt += `Day ${f.date}: ${f.description}, ${f.temperature}°C`;
                if (f.precipitation > 0) prompt += `, Precipitation: ${f.precipitation}mm`;
                prompt += "\n";
            });
            prompt += "\nIMPORTANT: Adjust activities based on weather. If it's raining, replace outdoor activities with indoor alternatives.\n\n";
        }

        if (userPreferences) {
            prompt += `USER PREFERENCES: ${userPreferences}\n\n`;
        }

        prompt += `Please create a detailed day-by-day itinerary with:
1. Day number and date
2. Morning, Afternoon, Evening activities (with precise times)
3. Meal recommendations
4. Costs and travel times

Format the response as pure JSON with this structure:
{
  "summary": "Brief overview",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "weather": "desc",
      "morning": { "activities": [{ "name": "Activity Name", "time": "09:00", "cost": "$20", "type": "outdoor/indoor" }] },
      "afternoon": { "activities": [...] },
      "evening": { "activities": [...] },
      "meals": { "breakfast": "...", "lunch": "...", "dinner": "..." },
      "total_day_cost": "..."
    }
  ],
  "total_budget": "...",
  "tips": ["..."]
}
Ensure the JSON is valid. Do not include markdown formatting.\n`;
        return prompt;
    }

    private parseItinerary(text: string, places: PlaceDetails[], weatherForecast: WeatherData[]): Itinerary {
        try {
            // clean text
            let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}') + 1;
            if (start !== -1 && end > start) {
                cleanText = cleanText.slice(start, end);
            }

            const data: Itinerary = JSON.parse(cleanText);

            // Enhance with real place data
            if (data.itinerary) {
                data.itinerary.forEach((day, i) => {
                    // Add weather data if available
                    if (i < weatherForecast.length) {
                        day.weather_data = weatherForecast[i];
                    }

                    ['morning', 'afternoon', 'evening'].forEach(period => {
                        // @ts-ignore
                        const section = day[period];
                        if (section && section.activities) {
                            section.activities.forEach((activity: Activity) => {
                                const match = this.findMatchingPlace(activity.name, places);
                                if (match) {
                                    activity.place_id = match.place_id;
                                    activity.location = match.location;
                                    activity.rating = match.rating;
                                    activity.address = match.address || match.vicinity;
                                    activity.type = match.types?.[0]; // simple type
                                }
                            });
                        }
                    });
                });
            }
            return data;
        } catch (e) {
            console.error("Failed to parse JSON", e);
            return {
                summary: "Error generating structured itinerary",
                itinerary: [],
                total_budget: "Unknown",
                tips: ["Please try again."]
            };
        }
    }

    private findMatchingPlace(activityName: string, places: PlaceDetails[]): PlaceDetails | undefined {
        const lowerName = activityName.toLowerCase();
        return places.find(p => {
            const pName = p.name.toLowerCase();
            return pName.includes(lowerName) || lowerName.includes(pName);
        });
    }
}
