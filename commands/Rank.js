const { MessageEmbed } = require("discord.js");

const StatsUtil = require("../utils/StatsUtil");
const EmojiUtil = require("../utils/EmojiUtil");
const EmbedUtil = require("../utils/EmbedUtil");
const DbUtil = require("../utils/DatabaseUtil");

class Rank {
	constructor(client) {
		this.client = client;
		this.name = "rank";
		this.aliases = ["r", "ranks"];
		this.description = "See a player's rank.";
		this.usage = "rank <username> <platform (epic, steam, psn, xbl, switch)>";
	}

	async execute(msg, args) {
		const prefix = msg.prefix;
		const emojis = EmojiUtil;
		const correctUsage = `\`${prefix}${this.usage}\``;

		if (!emojis.initialized) await emojis.initialize(this.client);
		if (!EmbedUtil.initialized) await EmbedUtil.initialize(this.client);
		if (!DbUtil.initialized) await DbUtil.initialize(this.client);

		let username;
		let platform;

		if (!args[0]) {
			let data;

			try {
				data = await DbUtil.getData(msg.author.id);
			} catch (e) {
				console.log(e);
			}

			if (!data || data == {}) {
				return msg.reply({
					embeds: [
						EmbedUtil.ErrorEmbed(
							"No profile set",
							`Set a profile using \`${prefix}set <username> <platform>\``
						),
					],
				});
			} else {
				username = data.username;
				platform = data.platform;
			}
		} else if (args.length == 1) {
			// might be a mention
			const user = msg.mentions.users.first();

			if (user) {
				let data;
				try {
					data = await DbUtil.getData(user.id);
				} catch (e) {
					console.log(e);
				}

				if (data && Object.keys(data).length > 0) {
					username = data.username;
					platform = data.platform;
				} else {
					return msg.reply({
						embeds: [
							EmbedUtil.ErrorEmbed(
								"No profile set",
								`This user has not set a profile. They can do this using \`${prefix}set <username> <platform>\``
							),
						],
					});
				}
			}
		}

		if (!(username && platform)) {
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
							`Accepted platforms are \`epic, steam, psn, xbl, switch\`.\nCorrect usage : ${correctUsage}`
						),
					],
				});
			}
		}

		const tempMsg = await msg.reply({
			embeds: [EmbedUtil.LoadingEmbed("Hold on!", "Fetching ranks..")],
		});

		StatsUtil.getStats(username, platform, { requiredStats: [] })
			.then((playerData) => {
				if (!playerData)
					return tempMsg.edit({
						embeds: [EmbedUtil.ErrorEmbed("Error", "No data found!")],
					});

				const playerName = playerData.playerName;
				const currentSeason = playerData.currentSeason;

				const RanksEmbed = new MessageEmbed()
					.setTitle(`${playerName}'s rankings for season ${currentSeason}:`)
					.setDescription("[Only playlists that this player has played before are displayed.]");

				for (let [playlistName, playlistData] of Object.entries(playerData.playlists)) {
					const playlistDisplayName = playlistData.name;
					const rankDisplayName = playlistData.tier.metadata.name;
					const divisionDisplayName = playlistData.division.metadata.name;
					const mmr = playlistData.rating.value;

					RanksEmbed.addField(
						playlistDisplayName,
						`${emojis.fromRank(rankDisplayName)} ${rankDisplayName} ${divisionDisplayName}\n` +
							`\`MMR : ${mmr}\``,
						true
					);
				}

				if (RanksEmbed.fields.length == 0) {
					RanksEmbed.setDescription("No playlists played!");
				}

				return tempMsg.edit({
					embeds: [RanksEmbed],
				});
			})
			.catch((err) => {
				console.log(err);

				if (err.response && err.response.status == 404)
					return tempMsg.edit({
						embeds: [EmbedUtil.ErrorEmbed("Error", "No data found!")],
					});

				tempMsg.edit({
					embeds: [EmbedUtil.ErrorEmbed("Error", "Something went wrong!")],
				});
			});
	}
}

module.exports = Rank;
