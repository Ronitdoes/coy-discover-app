import { handleFeed } from "@/lib/api";

export async function GET(request: Request) {
  return handleFeed(request);
}