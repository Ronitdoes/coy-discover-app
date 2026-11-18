import { handleMatches } from "@/lib/api";

export async function GET() {
  return handleMatches();
}