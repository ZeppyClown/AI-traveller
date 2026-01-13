import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesClient } from '@/lib/googlePlaces';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const locationBias = searchParams.get('locationBias');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const client = new GooglePlacesClient();
    // @ts-ignore
    const results = await client.autocompletePlaces(query, locationBias);

    return NextResponse.json(results);
}
