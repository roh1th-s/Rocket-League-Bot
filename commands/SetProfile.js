const EmbedUtil = require("../utils/EmbedUtil");
const StatsUtil = require("../utils/StatsUtil");
const DbUtil = require("../utils/DatabaseUtil");

class SetProfile {
	constructor(client) {
		this.client = client;
		this.name = "setprofile";
		this.aliases = ["set"];
		this.description = "Set your username and platform to view stats.";
		this.usage = "setprofile <username> <platform (epic, steam, psn)>";
	}

	async execute(msg, args) {
		const prefix = msg.prefix;
		const correctUsage = `\`${prefix}${this.usage}\``;

		if (!DbUtil.initialized) await DbUtil.initialize(this.client);
		if (!EmbedUtil.initialized) await EmbedUtil.initialize(this.client);

		let username;
		let platform;

		if (args[0] && args[0].toLowerCase() == "reset") {
			try {
				DbUtil.setData(msg.author.id, {});
			} catch (err) {
				console.log(err);
				return msg.reply({
					embeds: [EmbedUtil.ErrorEmbed("Database error", `Something went wrong, try again!`)],
				});
			}

			return msg.reply({
				embeds: [
					EmbedUtil.SuccessEmbed("Profile reset", `Your data was reset.`).setFooter(
						"Use this command again to set new data."
					),
				],
			});
		} else {
			if (args.length < 3) {
				username = args[0];
				platform = args[1];
			} else {
				args = msg.content.slice(prefix.length).split(" ");
				args.shift();

				args.forEach((arg) => {
					if (!StatsUtil.parsePlatform(arg))
						username = typeof username === "string" ? username + " " + arg : arg;
					else platform = arg;
				});
			}

			if (!username) {
				return msg.reply({
					embeds: [
						EmbedUtil.ErrorEmbed(
							"Invalid arguments",
							`Please enter a username!\nCorrect usage : ${correctUsage}`
						),
					],
				});
			}

			if (!platform) {
				return msg.reply({
					embeds: [
						EmbedUtil.ErrorEmbed(
							"Invalid arguments",
							`Please enter a platform!\nCorrect usage : ${correctUsage}`
						),
					],
				});
			}

			platform = StatsUtil.parsePlatform(platform);
			if (platform === false) {
				return msg.reply({
					embeds: [
						EmbedUtil.ErrorEmbed(
							"Invalid platform",
							`Accepted platforms are \`epic, steam, psn\`.\nCorrect usage : ${correctUsage}`
						),
					],
				});
			}
		}

		DbUtil.setData(msg.author.id, { username, platform });

		return msg.reply({
			embeds: [
				EmbedUtil.SuccessEmbed(
					"Profile updated",
					`Your data was saved.\nUsername : \`${username}\`\nPlatform : \`${platform}\``
				).setFooter("Use this command again to change the data or reset it ."),
			],
		});
	}
}

module.exports = SetProfile;
