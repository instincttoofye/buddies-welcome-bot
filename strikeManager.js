import fs from "node:fs";
import path from "node:path";

const FILE_PATH = path.join(process.cwd(), "data", "strikes.json");

const STRIKE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

const getStrikes = () => {
    if (!fs.existsSync(FILE_PATH)) {
        return {};
    }

    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
};

const saveStrikes = (strikes) => {
    fs.writeFileSync(
        FILE_PATH,
        JSON.stringify(strikes, null, 2)
    );
};

export const registerStrike = (guildId, userId) => {
    const strikes = getStrikes();

    if (!strikes[guildId]) {
        strikes[guildId] = {};
    }

    const previous = strikes[guildId][userId];

    const now = Date.now();

    const isExpired =
        !previous ||
        now - new Date(previous.lastOffense).getTime() >= STRIKE_EXPIRATION;

    const strikeCount = isExpired
        ? 1
        : previous.strikes + 1;

    strikes[guildId][userId] = {
        strikes: strikeCount,
        lastOffense: new Date(now).toISOString()
    };

    saveStrikes(strikes);

    return strikeCount;
};