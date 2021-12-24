require("dotenv").config(); //add env to global process variable
//https://rr.noordstar.me/data/293544e4 lol

const fs = require("fs");
const Config = require("./config.json");
const Discord = require("discord.js");
const Client = new Discord.Client({
	intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_EMOJIS_AND_STICKERS"],
});

const EmbedUtil = require("./utils/EmbedUtil");

Client.config = Config;

Client.commands = new Discord.Collection();
Client.aliases = new Discord.Collection();
Client.cooldowns = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
	let command = require(`./commands/${file}`);
	if (command.prototype && command.prototype.constructor) {
		command = new command(Client);
		Client.commands.set(command.name, command);
		if (command.aliases.length > 0) {
			for (let alias of command.aliases) {
				Client.aliases.set(alias, command);
			}
		}
	}
}

Client.once("ready", () => {
	console.log("Logged in.");
});

Client.on("messageCreate", (msg) => {
	if (msg.author.bot) return;

	const prefix = Client.config.prefix;
	if (msg.type != "REPLY" && msg.mentions.users.has(Client.user.id)) {
		msg.channel.send({
			embeds: [
				EmbedUtil.SimpleEmbed(
					"Basic info",
					`My prefix is \`${prefix}\`.\nUse \`${prefix}stats\` to see a player's stats` +
						` and \`${prefix}rank\` for rankings. You can also use \`${prefix}setprofile\` to store your user data.` +
						`\n\n\`${prefix}inv\` will get you the invite link.`
				),
			],
		});
	}

    //Yoad business - 740062244058038283
    try {
        if (msg.type != "REPLY" && msg.author.id == "740062244058038283" && msg.mentions.users.has("621324161914109952")) {
            let timeout = Client.cooldowns.get(msg.author.id)
            if (timeout) {
                
                let role= msg.member.guild.roles.cache.find(role => role.name === "Muted");

                if(role) {
                    msg.reply("stop spam pinging him nub. get muted")
                    msg.member.roles.add(role);
                    clearTimeout(timeout);
                    return Client.cooldowns.set(msg.author.id, null)
                }
            }
        
            Client.cooldowns.set(msg.author.id, setTimeout(() => {
                Client.cooldowns.set(msg.author.id, null);
            }, 30000));
        }
    } catch(err) {
        console.log(err);
    }

	if (!msg.content.startsWith(prefix)) return;

	if (!msg.guild) {
		return msg.reply({
			embeds: [EmbedUtil.ErrorEmbed("Invalid usage", "You can only use the bot in a server!")],
		});
	}

	msg.prefix = prefix;
	const args = msg.content.slice(prefix.length).split(/\s+/);
	const cmdName = args.shift().toLowerCase();

	let cmd = Client.commands.has(cmdName) && Client.commands.get(cmdName);
	cmd = cmd ||( Client.aliases.has(cmdName) && Client.aliases.get(cmdName)); //assign if cmd is falsy 

	if (cmd) {
		try {
           /*  return msg.reply(new Discord.MessageEmbed()
            .setColor("0x#c73232")
            .setTitle(`Server down`)
            .setDescription("The service is currently inoperational. Sorry for the inconvenience :|.\n[Click here for a cookie](https://rr.noordstar.me/rlbot-dashboard-293544e4) :cookie:")); */

			cmd.execute(msg, args);
		} catch (err) {
			console.log(err);

			msg.reply({
				embeds: [EmbedUtil.ErrorEmbed("Error", "Something went wrong!")],
			});
		}
	}
});

Client.on("invalidated", () => {
    console.log("invalidated")
     process.exit(0);
})

Client.login(process.env.TOKEN);