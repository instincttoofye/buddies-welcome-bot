import "dotenv/config";

//import processCommand from "./commandProccessor.js";

import { registerStrike } from "./strikeManager.js";

import {
    Client,
    GatewayIntentBits,
} from "discord.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const recentMessages = new Map();
const moderatingUsers = new Set();

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

    const moderationKey = `${message.guild.id}:${userId}`;

    const lastModeration = moderationCooldowns.get(moderationKey);
    
    if (
        lastModeration !== undefined &&
        Date.now() - lastModeration < MODERATION_COOLDOWN
    ) {
        return;
    }
    
    if (moderatingUsers.has(moderationKey)) {
        return;
    }
    
    moderatingUsers.add(moderationKey);

    console.log(
        `SCAM/SPAM DETECTED GET THIS MF OUTTA HERE: ${message.author.tag}`
    );

    try {
        // Delete all suspicious messages
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

        // Make sure the bot can enforce moderation
        const member = message.member;

        if (!member?.moderatable && !member?.kickable) {
            console.error(
                `Cannot moderate ${message.author.tag}: insufficient permissions.`
            );
            return;
        }

        const strikeCount = registerStrike(
            message.guild.id,
            userId
        );

        if (strikeCount === 1) {
            // First strike: one-hour timeout
            if (!member.moderatable) {
                console.error(
                    `Cannot timeout ${message.author.tag}.`
                );
                return;
            }

            await member.timeout(
                TIMEOUT_DURATION,
                "First strike: automatic anti-scam detection"
            );
            
            moderationCooldowns.set(moderationKey, Date.now());
            
            console.log(
                `First strike: timed out ${message.author.tag} for one hour.`
            );

        } else {
            // Second strike: kick
            if (!member.kickable) {
                console.error(
                    `Cannot kick ${message.author.tag}.`
                );
                return;
            }

            await member.kick(
                "Second strike: repeated scam/spam activity"
            );

            console.log(
                `Second strike: kicked ${message.author.tag}.`
            );
        }

    } catch (error) {
        console.error(
            `Failed to moderate ${message.author.tag}:`,
            error
        );

    } finally {
        // Always clear history and release the lock
        recentMessages.delete(userId);
        moderatingUsers.delete(moderationKey);
    }
});


client.login(process.env.DISCORD_BOT_TOKEN);