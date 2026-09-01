require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once("ready", () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on("guildMemberAdd", async (member) => {
    try {
        const memberRole = member.guild.roles.cache.find(
            (role) => role.name.toLowerCase() === "member"
        );

        if (!memberRole) {
            console.error('Could not find a role named "member".');
            return;
        }

        await member.roles.add(memberRole);

        console.log(
            `Assigned "${memberRole.name}" role to ${member.user.tag}`
        );

        const welcomeChannel = member.guild.channels.cache.find(
            (channel) => channel.name === "new-buddies-welcoming"
        );

        const friendCodesChannel = member.guild.channels.cache.find(
            (channel) => channel.name === "friend-codes"
        );

        if (!welcomeChannel) {
            console.error(
                'Could not find channel "#new-buddies-welcoming".'
            );
            return;
        }

        if (!friendCodesChannel) {
            console.error(
                'Could not find channel "#friend-codes".'
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

client.login(process.env.DISCORD_BOT_TOKEN);