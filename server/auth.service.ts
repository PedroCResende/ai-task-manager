import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db/db";
import { users } from "./db/schema";

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
  });
}

export async function loginUser(
  email: string,
  password: string
) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
