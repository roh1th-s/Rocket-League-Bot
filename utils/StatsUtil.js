const axios = require("axios").default;

class StatsUtils {
	static trackerApiUrl = "https://api.tracker.gg/api/v2/rocket-league/standard/profile";
	static redundantStats = ["trnrating", "seasonrewardwins", "score"];
	static redundantPlaylists = ["un-ranked"];
	static availableSegments = ["overview", "playlist"];

	static parsePlatform(platform) {
		if (!platform) return false;
		platform = platform.toLowerCase();

		if (platform.includes("epic")) {
			return "epic";
		} else if (platform.includes("psn")) {
			return "psn";
		} else if (platform.includes("steam")) {
			return "steam";
		} else {
			return false;
		}
	}

	static toProperName(playlistName) {
		playlistName = playlistName.toLowerCase();

		if (playlistName === "ranked duel 1v1") {
			return "1v1";
		} else if (playlistName === "ranked doubles 2v2") {
			return "2v2";
		} else if (playlistName === "ranked standard 3v3") {
			return "3v3";
		} else {
			return playlistName;
		}
	}

	static parseOverviewData(rawJsonData, requiredStats) {
		const segments = rawJsonData.segments;

		let data = {};

		for (let segment of segments) {
			if (segment.type === "overview") {
				for (let [statName, stats] of Object.entries(segment.stats)) {
					statName = statName.toLowerCase();

					if (requiredStats ? !requiredStats.includes(statName) : this.redundantStats.includes(statName))
						continue;

					data[statName] = stats;
				}

				break; // exit after getting overview
			}
		}

		return data;
	}

	static async getPlaylistData(username, platform, currentSeason, requiredPlaylists) {
		let data;

		try {
			const res = await axios.get(
				`${this.trackerApiUrl}/${platform}/${username}/segments/playlist?season=${currentSeason}`
			);
			data = res.data.data;
		} catch (err) {
			throw err;
		}

		let playlistData = {};

		for (let segment of data) {
			const playlistName = this.toProperName(segment.metadata.name);
			const rankName = segment.stats.tier.metadata.name.toLowerCase().replace(/\s+/, "");
			
			if (rankName == "unranked" || rankName === "supersoniclegend") {
				segment.stats.division.metadata.name = ""; //no division for these ranks
			}

			if (
				requiredPlaylists
					? !requiredPlaylists.includes(playlistName)
					: this.redundantPlaylists.includes(playlistName)
			)
				continue;

			playlistData[playlistName] = { ...segment.stats, ...segment.metadata };
		}

		return playlistData;
	}

	static async getStats(username, platform, options) {
		options ??= {};

		const requiredStats = options.requiredStats;
		const requiredPlaylists = options.requiredPlaylists;

		let rawJsonData;

		try {
			const res = await axios.get(`${this.trackerApiUrl}/${platform}/${username}?`);
			rawJsonData = res.data.data;
		} catch (err) {
			throw err;
		}

		if (!rawJsonData) return false;

		const playerData = {
			playerName: rawJsonData.platformInfo.platformUserHandle,
			currentSeason: rawJsonData.metadata.currentSeason,
		};
		
		const statData = requiredStats != [] ? this.parseOverviewData(rawJsonData, requiredStats) : {};
		const currentSeason = playerData.currentSeason;

		const playlistData =
			requiredPlaylists != []
				? await this.getPlaylistData(username, platform, currentSeason, requiredPlaylists)
				: {};

		return { ...playerData, stats: statData, playlists: playlistData };
	}
}

module.exports = StatsUtils;
