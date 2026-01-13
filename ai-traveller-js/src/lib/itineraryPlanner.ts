import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { GooglePlacesClient, PlaceDetails } from './googlePlaces';
import { WeatherClient, WeatherData } from './weatherApi';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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
    id?: string;
    photoUrl?: string;
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
    private model: ChatGoogleGenerativeAI;

    constructor() {
        this.placesClient = new GooglePlacesClient();
        this.weatherClient = new WeatherClient();

        // Initialize LangChain Chat Model
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-pro",
            maxOutputTokens: 2048,
            apiKey: GEMINI_API_KEY,
            temperature: 0.7,
        });
    }

    async generateItinerary(
        destination: string,
        days: number,
        budget: string,
        travelDates?: string[],
        userPreferences?: string
    ):
        Promise<Itinerary> {

        // 1. Get Context (Places & Weather)
        const popularPlaces = await this.placesClient.getPopularPlaces(destination);

        let weatherInfo = "";
        let weatherForecast: WeatherData[] = [];
        if (travelDates && travelDates.length > 0 && popularPlaces.length > 0 && popularPlaces[0].location) {
            weatherForecast = await this.weatherClient.getForecast(
                popularPlaces[0].location.lat,
                popularPlaces[0].location.lng,
                days
            );

            if (weatherForecast.length > 0) {
                weatherInfo = "WEATHER FORECAST:\n" + weatherForecast.map(f =>
                    `Day ${f.date}: ${f.description}, ${f.temperature}°C` + (f.precipitation > 0 ? `, Rain: ${f.precipitation}mm` : '')
                ).join("\n");
                weatherInfo += "\nIMPORTANT: Adjust activities based on weather. If raining, prefer indoor activities.\n";
            }
        }

        const placesInfo = this.formatPlacesForLLM(popularPlaces.slice(0, 30));

        // 2. Define LangChain Template
        const template = `Create a detailed {days}-day travel itinerary for {destination}.
        
        BUDGET: {budget}
        
        AVAILABLE PLACES:
        {placesInfo}
        
        {weatherInfo}
        
        USER PREFERENCES:
        {userPreferences}
        
        Please create a detailed day-by-day itinerary.
        Structure the response as a valid JSON object with the following schema:
        {{
          "summary": "Brief overview",
          "itinerary": [
            {{
              "day": 1,
              "date": "YYYY-MM-DD",
              "weather": "desc",
              "morning": {{ "activities": [{{ "name": "Activity Name", "time": "09:00", "cost": "$20", "type": "outdoor" }}] }},
              "afternoon": {{ "activities": [...] }},
              "evening": {{ "activities": [...] }},
              "meals": {{ "breakfast": "...", "lunch": "...", "dinner": "..." }},
              "total_day_cost": "..."
            }}
          ],
          "total_budget": "...",
          "tips": ["..."]
        }}
        
        Ensure the JSON is valid and contains no markdown formatting outside the JSON block.
        `;

        const prompt = PromptTemplate.fromTemplate(template);
        const outputParser = new StringOutputParser();

        // 3. Create Chain
        const chain = RunnableSequence.from([
            prompt,
            this.model,
            outputParser
        ]);

        // 4. Execute Chain
        try {
            const result = await chain.invoke({
                days: days.toString(),
                destination,
                budget,
                placesInfo,
                weatherInfo,
                userPreferences: userPreferences || "None"
            });

            // 5. Parse and Enhance
            return this.parseItinerary(result, popularPlaces, weatherForecast);

        } catch (e) {
            console.error("Error generating itinerary with LangChain:", e);
            throw e;
        }
    }

    private formatPlacesForLLM(places: PlaceDetails[]): string {
        return places.map((p, i) => {
            let info = `${i + 1}. ${p.name}`;
            if (p.rating) info += ` (Rating: ${p.rating}/5)`;
            if (p.types) info += ` [${p.types.slice(0, 2).join(', ').replace(/_/g, ' ')}]`;
            return info;
        }).join('\n');
    }

    private parseItinerary(text: string, places: PlaceDetails[], weatherForecast: WeatherData[]): Itinerary {
        try {
            let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}') + 1;
            if (start !== -1 && end > start) {
                cleanText = cleanText.slice(start, end);
            }

            const data: Itinerary = JSON.parse(cleanText);

            if (data.itinerary) {
                data.itinerary.forEach((day, i) => {
                    if (i < weatherForecast.length) {
                        day.weather_data = weatherForecast[i];
                    }

                    ['morning', 'afternoon', 'evening'].forEach(period => {
                        // @ts-ignore
                        const section = day[period];
                        if (section && section.activities) {
                            section.activities.forEach((activity: Activity) => {
                                // Match with real place data
                                const match = this.findMatchingPlace(activity.name, places);
                                if (match) {
                                    activity.place_id = match.place_id;
                                    activity.location = match.location;
                                    activity.rating = match.rating;
                                    activity.address = match.address || match.vicinity;
                                    activity.type = match.types?.[0];
                                    activity.photoUrl = match.photoUrl; // Pass photo if available
                                }
                                // Ensure ID
                                activity.id = (activity.place_id || Date.now().toString()) + Math.random().toString(36).substr(2, 5);
                            });
                        }
                    });
                });
            }
            return data;
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
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
