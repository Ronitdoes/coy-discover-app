/**
 * The single logged-in user. There is no auth in this demo, so the identity is
 * a shared constant used by both the match overlay (to show "you") and any
 * future server-side personalisation.
 */
export const CURRENT_USER = {
  id: "me",
  name: "Alex",
  age: 28,
  photo: "/photos/alex.jpg",
  city: "San Francisco",
} as const;