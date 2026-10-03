const bcrypt = require("bcrypt");

const username = process.argv[2]?.trim();
const password = process.argv[3];

(async () => {
	if (!username || !password) {
		console.error('Usage: node scripts/hash-password.js "username" "password"');
		process.exitCode = 1;
		return;
	}

	const passwordHash = await bcrypt.hash(password, 10);
	console.log(JSON.stringify({ username, password_hash: passwordHash }, null, 2));
})();
