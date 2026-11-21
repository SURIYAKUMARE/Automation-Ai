import { NextRequest } from 'next/server';
import { authorizeSocial } from '@/lib/auth/social-oauth';
export function GET(req: NextRequest) { return authorizeSocial(req, 'instagram'); }
