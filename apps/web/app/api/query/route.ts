import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { path, args } = body;

        if (!path) {
            return NextResponse.json(
                { error: 'Missing path parameter' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Parse the path to get module and function name
        // Format: "module:functionName" e.g., "deployments:getBrandingByCredentials"
        const [module, functionName] = path.split(':');

        if (!module || !functionName) {
            return NextResponse.json(
                { error: 'Invalid path format. Expected "module:functionName"' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Get the API function dynamically
        // @ts-expect-error - Dynamic access to api object
        const apiModule = api[module];
        if (!apiModule) {
            return NextResponse.json(
                { error: `Unknown module: ${module}` },
                { status: 404, headers: corsHeaders }
            );
        }

        const apiFunction = apiModule[functionName];
        if (!apiFunction) {
            return NextResponse.json(
                { error: `Unknown function: ${functionName} in module ${module}` },
                { status: 404, headers: corsHeaders }
            );
        }

        // Call the Convex query/mutation
        const result = await convex.query(apiFunction, args || {});

        return NextResponse.json(
            { status: 'success', value: result },
            { headers: corsHeaders }
        );
    } catch (error: any) {
        console.error('[API Query Error]', error);
        return NextResponse.json(
            { errorMessage: error.message || 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
