const { MessageEmbed } = require("discord.js");

const EmbedUtil = require("../utils/EmbedUtil");

class Snipe {
	constructor(client) {
		this.client = client;
		this.name = "snipe";
		this.aliases = ["sn"];
		this.description = "View the last deleted message";
		this.usage = `${this.name}`;
		this.lastMessages = {};

		client.on("messageDelete", (msg) => {
			this.lastMessages[msg.channel.id] = {
				tag: msg.author.tag,
				pfp: msg.author.displayAvatarURL(true),
				content: msg.content,
				embeds: msg.embeds,
				attachments: msg.attachments,
				timestamp: msg.editedTimestamp ?? msg.createdTimestamp,
				edited: msg.editedTimestamp ? true : false,
			};
		});
	}

	async execute(msg, args) {
		if (!EmbedUtil.initialized) await EmbedUtil.initialize(this.client);

		const last = this.lastMessages[msg.channel.id];

		if (last) {
			let footer = "";
			if (last.embeds.length > 0) footer += "Deleted message had embeds which are displayed below. ";

			let attachments = last.attachments.filter((a) => a.size < 8388608).map((a) => a);

			if (attachments.length > 0) footer += "Files are displayed above. ";

			if (last.attachments.size != attachments.length)
				footer += "Certain files were not sent due to size limits.";

			msg.reply({
				embeds: [
					new MessageEmbed()
						.setColor("0x#0373fc")
						.setAuthor(last.tag, last.pfp)
						.setDescription(last.content + (last.edited ? " *(edited)*" : ""))
						.setFooter(footer == "" ? "Get sniped lol" : footer)
						.setTimestamp(last.timestamp),
					...last.embeds,
				],
				files: [...attachments],
			}).catch((err) => {
				msg.reply({
					embeds: [EmbedUtil.ErrorEmbed("Error", "Something went wrong.")],
				});
				console.log(err);
			});
		} else {
			msg.reply({
				embeds: [EmbedUtil.ErrorEmbed("Nothing to snipe", "No one deleted anything recently.")],
			});
		}
	}
}

module.exports = Snipe;
