import axios from 'axios';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
    date: string;
    temperature: number;
    feels_like: number;
    description: string;
    main: string;
    wind_speed: number;
    humidity: number;
    precipitation: number;
}

export interface ActivitySuitability {
    suitable: boolean;
    reason: string;
    alternatives: string[];
}

export class WeatherClient {
    private async get(endpoint: string, params: any) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                params: { ...params, appid: API_KEY, units: 'metric' },
            });
            return response.data;
        } catch (error) {
            console.error(`Error in Weather API (${endpoint}):`, error);
            return null;
        }
    }

    async getCurrentWeather(lat: number, lon: number): Promise<any> {
        return this.get('/weather', { lat, lon });
    }

    async getForecast(lat: number, lon: number, days: number = 5): Promise<WeatherData[]> {
        try {
            const data = await this.get('/forecast', { lat, lon });
            if (!data) return [];

            const dailyForecasts: { [key: string]: any[] } = {};

            data.list.forEach((item: any) => {
                const date = new Date(item.dt * 1000).toISOString().split('T')[0];
                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = [];
                }
                dailyForecasts[date].push(item);
            });

            const sortedDates = Object.keys(dailyForecasts).sort().slice(0, days);

            return sortedDates.map(date => {
                const dayItems = dailyForecasts[date];
                // Pick item closest to 12:00
                const middayItem = dayItems.reduce((prev, curr) => {
                    const prevHour = new Date(prev.dt * 1000).getHours();
                    const currHour = new Date(curr.dt * 1000).getHours();
                    return Math.abs(12 - currHour) < Math.abs(12 - prevHour) ? curr : prev;
                });

                const rain = middayItem.rain?.['3h'] || 0;
                const snow = middayItem.snow?.['3h'] || 0;

                return {
                    date,
                    temperature: middayItem.main.temp,
                    feels_like: middayItem.main.feels_like,
                    description: middayItem.weather[0].description,
                    main: middayItem.weather[0].main,
                    wind_speed: middayItem.wind?.speed || 0,
                    humidity: middayItem.main.humidity,
                    precipitation: rain + snow
                };
            });
        } catch (e) {
            console.error('Error getting forecast:', e);
            return [];
        }
    }

    isBadWeather(weatherData: WeatherData): boolean {
        if (!weatherData) return false;

        const main = weatherData.main.toLowerCase();
        const description = weatherData.description.toLowerCase();
        const badConditions = ['rain', 'snow', 'storm', 'thunderstorm', 'drizzle', 'sleet'];

        return (
            badConditions.includes(main) ||
            badConditions.some(condition => description.includes(condition)) ||
            weatherData.precipitation > 0
        );
    }

    getWeatherSummary(weatherData: WeatherData): string {
        if (!weatherData) return "Weather data not available";

        const description = weatherData.description.charAt(0).toUpperCase() + weatherData.description.slice(1);
        let summary = `${description}, ${weatherData.temperature}°C`;

        if (weatherData.precipitation > 0) {
            summary += `, ${weatherData.precipitation.toFixed(1)}mm precipitation`;
        }

        return summary;
    }

    getActivitySuitability(activityType: string, weatherData: WeatherData): ActivitySuitability {
        const outdoorActivities = ['go-karting', 'hiking', 'beach', 'outdoor', 'park', 'garden',
            'sightseeing', 'walking tour', 'cycling', 'boating'];
        const indoorActivities = ['museum', 'gallery', 'shopping', 'indoor', 'theater', 'cinema',
            'restaurant', 'cafe', 'mall'];

        const activityLower = activityType.toLowerCase();
        const isOutdoor = outdoorActivities.some(outdoor => activityLower.includes(outdoor));
        const isIndoor = indoorActivities.some(indoor => activityLower.includes(indoor));

        if (isIndoor) {
            return { suitable: true, reason: 'Indoor activity', alternatives: [] };
        }

        if (isOutdoor) {
            if (this.isBadWeather(weatherData)) {
                return {
                    suitable: false,
                    reason: `Bad weather: ${this.getWeatherSummary(weatherData)}`,
                    alternatives: this.getAlternativeActivities(activityType)
                };
            }
            return { suitable: true, reason: 'Good weather', alternatives: [] };
        }

        return { suitable: true, reason: 'Activity type unclear', alternatives: [] };
    }

    private getAlternativeActivities(activityType: string): string[] {
        const alternativesMap: { [key: string]: string[] } = {
            'go-karting': ['Indoor go-karting', 'Indoor arcade', 'Shopping mall', 'Museum'],
            'hiking': ['Museum', 'Art gallery', 'Shopping', 'Indoor market'],
            'beach': ['Aquarium', 'Shopping center', 'Museum', 'Cinema'],
            'park': ['Museum', 'Art gallery', 'Shopping district', 'Library'],
            'outdoor': ['Museum', 'Shopping', 'Art gallery', 'Indoor activities']
        };

        const activityLower = activityType.toLowerCase();
        for (const [key, alternatives] of Object.entries(alternativesMap)) {
            if (activityLower.includes(key)) return alternatives;
        }

        return ['Museum', 'Shopping', 'Indoor attractions', 'Restaurants'];
    }
}
