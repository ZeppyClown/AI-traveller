import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesClient } from '@/lib/googlePlaces';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const client = new GooglePlacesClient();
    const result = await client.searchPlace(query);

    if (!result) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    return NextResponse.json(result);
}
