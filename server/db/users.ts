import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

type UpsertUserInput = {
  openId: string;
  name: string | null;
  email: string | null;
};

export async function upsertUser(data: UpsertUserInput) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.openId, data.openId))
    .get();

  if (existing) {
    await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
      })
      .where(eq(users.openId, data.openId));
    return existing.id;
  }

  const result = await db
    .insert(users)
    .values({
      openId: data.openId,
      name: data.name,
      email: data.email,
    })
    .returning();

  return result[0].id;
}
