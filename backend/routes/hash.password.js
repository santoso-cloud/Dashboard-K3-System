const bcrypt = require("bcrypt");

// ==========================================
// KONFIGURASI
// ==========================================

// Isi password yang ingin di-hash
const password = "";

// Jumlah salt rounds bcrypt
const saltRounds = 10;

// ==========================================
// HASH PASSWORD
// ==========================================

async function hashPassword() {
  try {
    if (!password) {
      console.log("❌ Password masih kosong!");
      console.log('Silakan isi: const password = "PasswordKamu";');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("\n==============================");
    console.log("   BCRYPT PASSWORD GENERATOR");
    console.log("==============================");
    console.log("Password :", password);
    console.log("Hash     :", hashedPassword);
    console.log("==============================\n");

  } catch (error) {
    console.error("❌ Gagal membuat hash:", error.message);
  }
}

hashPassword();