import { NextRequest } from 'next/server';
import { publishPlatform } from '@/lib/publishing/legacy-route';
export function POST(req: NextRequest) { return publishPlatform(req, 'linkedin'); }
