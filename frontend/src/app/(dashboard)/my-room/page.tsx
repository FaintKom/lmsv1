import { redirect } from "next/navigation";

/**
 * My Room moved to a tab inside /achievements. Old direct links and
 * bookmarks land here and redirect cleanly.
 */
export default function MyRoomLegacyRedirect() {
  redirect("/achievements?tab=room");
}
