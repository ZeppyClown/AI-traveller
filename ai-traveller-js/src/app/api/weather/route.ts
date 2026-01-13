import { NextRequest, NextResponse } from 'next/server';
import { WeatherClient } from '@/lib/weatherApi';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Lat and Lon parameters are required' }, { status: 400 });
    }

    const client = new WeatherClient();
    const result = await client.getForecast(parseFloat(lat), parseFloat(lon));

    return NextResponse.json(result);
}
