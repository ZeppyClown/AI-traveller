import { NextRequest, NextResponse } from 'next/server';
import { ItineraryPlanner } from '@/lib/itineraryPlanner';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { destination, days, budget, dates, preferences } = body;

        if (!destination || !days || !budget) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const planner = new ItineraryPlanner();
        const result = await planner.generateItinerary(destination, days, budget, dates, preferences);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in planning itinerary:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
