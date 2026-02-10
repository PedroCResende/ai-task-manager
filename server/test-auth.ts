import { registerUser, loginUser } from "./auth.service";

async function test() {
  console.log("👉 Registrando usuário...");
  await registerUser("Pedro", "pedro@email.com", "123456");

  console.log("👉 Tentando login...");
  const user = await loginUser("pedro@email.com", "123456");

  if (!user) {
    console.log("❌ Login falhou");
  } else {
    console.log("✅ Login OK:", user);
  }
}

test();
