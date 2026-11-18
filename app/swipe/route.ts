import { handleSwipe } from "@/lib/api";

export async function POST(request: Request) {
  return handleSwipe(request);
}