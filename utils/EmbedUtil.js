const { MessageEmbed } = require("discord.js");

const EmojiUtil = require("./EmojiUtil");

class EmbedUtil {
	static initialized = EmojiUtil.initialized;

	static async initialize(client) {
		if (!client) throw "Client not provided";

		if (!EmojiUtil.initialized) EmojiUtil.initialize(client);
		
		this.initialized = true;
		return this;
	}

	static SimpleEmbed(title, description) {
		const embed = new MessageEmbed().setColor("0x#0373fc").setTitle(`${title}`);
		if (description) embed.setDescription(`${description}`);

		return embed;
	}

	static SuccessEmbed(title, description) {
		let success = EmojiUtil.formatted("animtick");

		const embed = new MessageEmbed().setColor("0x#469b2e").setTitle(`${success} ${title}`);
		if (description) embed.setDescription(`${description}`);

		return embed;
	}

	static ErrorEmbed(title, description) {
		let error = EmojiUtil.formatted("animcross");

		const embed = new MessageEmbed().setColor("0x#c73232").setTitle(`${error} ${title}`);
		if (description) embed.setDescription(`${description}`);

		return embed;
	}

	static LoadingEmbed(title, description) {
		const emoji = EmojiUtil.formatted("loadingdots");

		const embed = new MessageEmbed().setColor("0x#469b2e").setTitle(`${title}`);
		if (description) embed.setDescription(`${emoji} ${description}`);

		return embed;
	}
}

module.exports = EmbedUtil;
