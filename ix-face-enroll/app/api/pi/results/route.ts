import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://138.197.234.202:8080';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/pi/results`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
