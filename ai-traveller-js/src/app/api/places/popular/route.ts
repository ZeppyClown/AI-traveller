import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesClient } from '@/lib/googlePlaces';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');

    if (!location) {
        return NextResponse.json({ error: 'Location parameter is required' }, { status: 400 });
    }

    const client = new GooglePlacesClient();
    const results = await client.getPopularPlaces(location);

    return NextResponse.json(results);
}
