import "dotenv/config";

import processCommand from "./commandProcessor.js";

const {
    Client,
    GatewayIntentBits,
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const recentMessages = new Map();

const SPAM_WINDOW = 15_000; // 15 seconds
const CHANNEL_THRESHOLD = 3;
const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour

client.once("ready", () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on("guildMemberAdd", async (member) => {
    try {
        const welcomeChannel = member.guild.channels.cache.find(
            (channel) => channel.name === "🩵new-buddies-welcoming"
        );

        const friendCodesChannel = member.guild.channels.cache.find(
            (channel) => channel.name === "🫂friend-codes"
        );

        if (!welcomeChannel) {
            console.error(
                'Could not find channel "#🩵new-buddies-welcoming".'
            );
            return;
        }

        if (!friendCodesChannel) {
            console.error(
                'Could not find channel "🫂#friend-codes".'
            );
            return;
        }

        await welcomeChannel.send(
            `YERRRRR ${member} welcome to the buddies! click around, tap into our weekend events, drop your code in ${friendCodesChannel}, and never don't ask questions!`
        );

        console.log(
            `Welcomed ${member.user.tag} in #new-buddies-welcoming`
        );
    } catch (error) {
        console.error(
            `Failed to process new member ${member.user.tag}:`,
            error
        );
    }
});

client.on("messageCreate", async (message) => {
    // Ignore Bots
    if (message.author.bot) return;

    // Ignore DMs
    if(!message.guild) return;

    if (message.content.startsWith("!")) {
        const command = message.content.slice(0);
        processCommand(message, command);
    }

    const userId = message.author.id;
    const now = Date.now();

    const hasAttachment = message.attachments.size > 0;

    const hasMassMention = 
        message.mentions.everyone ||
        message.content.includes("@everyone") ||
        message.content.includes("@here");

    // Get this user's recent messages
    let history = recentMessages.get(userId) || [];

    // Remove messages older than spam window
    history = history.filter(
        (entry) => now - entry.timestamp < SPAM_WINDOW
    );

    // Add current message
    history.push({
        message,
        channelId: message.channel.id,
        timestamp: now,
        hasAttachment,
        hasMassMention,
    });

    recentMessages.set(userId, history);

     // Look specifically at suspicious messages
    const suspiciousMessages = history.filter(
        (entry) =>
            entry.hasAttachment &&
            entry.hasMassMention
    );

    // How many channels did they post in?
    const uniqueChannels = new Set(
        suspiciousMessages.map(
            (entry) => entry.channelId
        )
    );

    if (uniqueChannels.size < CHANNEL_THRESHOLD) {
        return;
    }

    console.log(
        `SCAM/SPAM DETECTED GET THIS MF OUTTA HERE: ${message.author.tag}`
    );

    try {
        // Delete all the suspicious messages we tracked
        for (const entry of suspiciousMessages) {
            try {
                if (entry.message.deletable) {
                    await entry.message.delete();
                }
            } catch (error) {
                console.error(
                    "Could not delete spam message:",
                    error
                );
            }
        }

        // Timeout the user
        if (message.member?.moderatable) {
            await message.member.timeout(
                TIMEOUT_DURATION,
                "Automatic anti-scam detection: mass mention + attachments across multiple channels"
            );

            console.log(
                `Timed out ${message.author.tag} for suspected scam spam.`
            );
        }

        // Clear their tracked history
        recentMessages.delete(userId);

    } catch (error) {
        console.error(
            `Failed to moderate ${message.author.tag}:`,
            error
        );
    }
})

client.login(process.env.DISCORD_BOT_TOKEN);