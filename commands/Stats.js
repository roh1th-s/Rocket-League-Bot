const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

const StatsUtil = require("../utils/StatsUtil");
const EmojiUtil = require("../utils/EmojiUtil");
const EmbedUtil = require("../utils/EmbedUtil");
const DbUtil = require("../utils/DatabaseUtil");

module.exports = class Stats {
	constructor(client) {
		this.client = client;
		this.name = "stats";
		this.aliases = ["s"];
		this.description = "See a player's stats";
		this.usage = "stats <username> <platform (epic, steam, psn, xbl, switch)>";
	}

	async execute(msg, args) {
		const emojis = EmojiUtil;
		const prefix = msg.prefix;
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

			if (!data) {
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
			embeds: [EmbedUtil.LoadingEmbed("Hold on!", "Fetching data..")],
		});

		StatsUtil.getStats(username, platform)
			.then((playerData) => {
				if (!playerData)
					return tempMsg.edit({
						embeds: [EmbedUtil.ErrorEmbed("Error", "No data found!")],
					});

				const playerName = playerData.playerName;
				const currentSeason = playerData.currentSeason;

				let currentPage = 1;
				let totalPages = 2;

				const pages = [];

				const StatsEmbed = new MessageEmbed().setTitle(`${playerName}'s Rocket League stats:`);

				pages.push(StatsEmbed);

				for (let [statName, statData] of Object.entries(playerData.stats)) {
					const rankName = statData.metadata && statData.metadata.rankName;
					const value = statData.value;

					/* if (statName === "seasonrewardlevel") {
						console.log(platform + " - Platform");
						console.log(statData.percentile);
					} */

					//sometimes, percentile (maybe only for steam and switch)can be directly put into Top {percentile}%
					//rest of the times, it needs to be calculated (100 - percentile)%
					//TODO: Figure out why this is happening
					StatsEmbed.addField(
						statData.displayName,
						statName === "seasonrewardlevel"
							? rankName.toLowerCase() !== "none"
								? `${emojis.fromRank(rankName)} ${rankName}` 
									// + (["steam", "switch"].includes(platform)
									// 	? ""
									// 	: ` | Top ${(100 - statData.percentile).toFixed(2)} %`)
								: "None"
							: `${!Number.isInteger(value) ? value.toFixed(2) : value}`,
						true
					);
				}

				const RanksEmbed = new MessageEmbed()
					.setTitle(`${playerName}'s rankings for season ${currentSeason}:`)
					.setDescription("[Only playlists that this player has played before are displayed.]");

				pages.push(RanksEmbed);

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

				const BackButton = new MessageButton({
					label: "< Back",
					customId: "previous",
					style: "SECONDARY",
					disabled: true,
				});
				const ForwardButton = new MessageButton({
					label: "Next >",
					customId: "next",
					style: "SECONDARY",
				});

				const PaginationRow = new MessageActionRow().addComponents([BackButton, ForwardButton]);

				tempMsg.edit({
					embeds: [pages[currentPage - 1].setFooter(`Page ${currentPage} of ${totalPages}`)],
					components: [PaginationRow],
				});

				const filter = (i) => ["previous", "next"].includes(i.customId) && !i.user.bot;

				const collector = tempMsg.createMessageComponentCollector({ filter, idle: 60_000, dispose: true });
				collector.on("collect", (i) => {
					let newComponentRow;

					if (i.customId === "next") {
						if (currentPage == totalPages) currentPage = totalPages - 1;

						if (++currentPage == totalPages) {
							newComponentRow = new MessageActionRow().addComponents([
								BackButton.setDisabled(false),
								ForwardButton.setDisabled(true),
							]);
						}
					} else if (i.customId === "previous") {
						if (currentPage == 1) currentPage = 2;

						if (--currentPage == 1) {
							newComponentRow = new MessageActionRow().addComponents([
								BackButton.setDisabled(true),
								ForwardButton.setDisabled(false),
							]);
						}
					}

					i.update({
						embeds: [pages[currentPage - 1].setFooter(`Page ${currentPage} of ${totalPages}`)],
						components: newComponentRow ? [newComponentRow] : undefined,
					});
				});

				collector.on("end", () => {
					tempMsg.edit({
						content: "This interaction has ended.",
						components: [
							new MessageActionRow().addComponents([
								BackButton.setDisabled(true),
								ForwardButton.setDisabled(true),
							]),
						],
					});
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
};
