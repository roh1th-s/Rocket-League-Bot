class EmojiUtil {
	static client = null;
	static emojiGuild = null;
	static initialized = false;

	static async initialize(client) {
		if (!client) throw "Client not provided";

		this.client = client;

		if (!this.emojiGuild) {
			this.emojiGuild = await client.guilds.fetch(client.config.mainGuildId || "849218716922544138");
			await this.emojiGuild.emojis.fetch();
		}

		this.initialized = true;

		console.log("[EmojiUtil] Initialized");
		
		return this;
	}

	static formatted(emojiName) {
		const emoji = this.emojiGuild.emojis.cache.find((emoji) => emoji.name.toLowerCase() === emojiName);

		if (!emoji) return "";

		return `${emoji}`;
	}

	static fromRank(rank) {
		if (!rank) throw "Rank not provided!";

		rank = rank.toLowerCase();

		let splitRank = rank.split(/\s+/);
		let lastSplit = splitRank.pop();
		let no = 0;

		if (!lastSplit.search(/^[Ii]/))
			//if the last split is a roman numeral and not a word
			no = (lastSplit.match(/[iI]/g) || []).length;
		//add the word back in since its not a number
		else splitRank.push(lastSplit);

		rank = splitRank.join("");

		if (!(rank === "unranked" || rank === "supersoniclegend")) rank += no != 0 ? no : "3";

		return this.formatted(rank);
	}
}

module.exports = EmojiUtil;
