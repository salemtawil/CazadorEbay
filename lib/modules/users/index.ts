import type { User } from "@/lib/modules/contracts";

export function getPrimaryUser(users: User[]): User {
  if (users.length === 0) {
    throw new Error("Expected at least one user");
  }

  return users[0];
}

