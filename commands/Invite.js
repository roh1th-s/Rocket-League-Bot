const { MessageEmbed } = require("discord.js");

class Invite {
	constructor(client) {
		this.client = client;
		this.name = "invite";
		this.aliases = ["inv"];
		this.description = "Obtain an invite link for the bot";
		this.usage = `${this.name}`;
	}

	async execute(msg, args) {
		msg.reply({
			embeds: [
				new MessageEmbed()
					.setTitle("Invite")
					.setDescription(
						`[Click here](https://discord.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot)` +
							" to invite the bot to your server."
					),
			],
		});
	}
}

module.exports = Invite;
