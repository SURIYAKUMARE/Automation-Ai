import { NextRequest } from 'next/server';
import { completeSocial } from '@/lib/auth/social-oauth';
export function GET(req: NextRequest) { return completeSocial(req, 'instagram'); }
