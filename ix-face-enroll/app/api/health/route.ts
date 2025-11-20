import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://165.227.17.154:8080';

export async function GET(request: NextRequest) {
  try {
    // Try common health check endpoints
    const healthEndpoints = ['/health', '/api/health', '/status'];
    
    for (const endpoint of healthEndpoints) {
      try {
        const backendResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (backendResponse.ok || backendResponse.status < 500) {
          const data = await backendResponse.json().catch(() => ({}));
          return NextResponse.json(
            {
              success: true,
              message: `API is reachable! Endpoint: ${endpoint} (Status: ${backendResponse.status})`,
              data,
            },
            {
              status: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              },
            }
          );
        }
      } catch (error) {
        continue;
      }
    }

    // If all health endpoints failed, try the base URL
    try {
      const backendResponse = await fetch(BACKEND_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      return NextResponse.json(
        {
          success: true,
          message: `API is reachable! Base URL responded (Status: ${backendResponse.status})`,
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          success: false,
          message: errorMessage.includes('timeout')
            ? 'Connection timeout. The API server may be down or unreachable.'
            : `Connection failed: ${errorMessage}`,
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }
  } catch (error) {
    console.error('[API] Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Health check failed',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

