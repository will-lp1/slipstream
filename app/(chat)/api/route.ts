import { NextRequest } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  noStore();
  
  // Forward the request directly to the chat endpoint
  const url = new URL(request.url);
  url.pathname = '/api/chat';
  
  // Forward the original request stream
  return await fetch(url, {
    method: request.method,
    headers: request.headers,
    // @ts-ignore - duplex is needed for Node.js but not in RequestInit type
    duplex: 'half',
    body: request.body
  });
}

export async function DELETE(request: Request) {
  // Forward the request directly to the chat endpoint
  const url = new URL(request.url);
  url.pathname = '/api/chat';
  
  // Forward without body for DELETE
  return await fetch(url, {
    method: request.method,
    headers: request.headers,
    // @ts-ignore - duplex is needed for Node.js but not in RequestInit type
    duplex: 'half'
  });
}