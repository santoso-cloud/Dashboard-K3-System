const crypto = require("node:crypto");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

exports.hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

exports.verifyPassword = async (password, storedHash) => {
	if (typeof password !== "string" || typeof storedHash !== "string") {
		return { matches: false, needsRehash: false };
	}

	if (BCRYPT_HASH.test(storedHash)) {
		try {
			const matches = await bcrypt.compare(password, storedHash);
			return {
				matches,
				needsRehash: matches && bcrypt.getRounds(storedHash) < SALT_ROUNDS
			};
		} catch {
			return { matches: false, needsRehash: false };
		}
	}

	if (storedHash.startsWith("$")) {
		return { matches: false, needsRehash: false };
	}

	const passwordBytes = Buffer.from(password, "utf8");
	const storedBytes = Buffer.from(storedHash, "utf8");
	const matches = passwordBytes.length === storedBytes.length
		&& crypto.timingSafeEqual(passwordBytes, storedBytes);

	return { matches, needsRehash: matches };
};

exports.comparePassword = async (password, storedHash) =>
	(await exports.verifyPassword(password, storedHash)).matches;
