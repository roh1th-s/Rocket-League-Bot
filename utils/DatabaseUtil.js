const fs = require("fs");
const { promisify } = require("util");

const wait = promisify(setTimeout);

class DatabaseUtil {
	static initialized = false;
	static dbFile = "./db.json";
	static queue = [];
	static cache = {};

	static maxCache = 100;
	static isSaving = false;

	static initialize(client) {
		//if (!client) throw "Client not provided";

		this.client = client;

		if (!fs.existsSync(this.dbFile)) {
			fs.writeFileSync(this.dbFile, "");
		}

		this.initialized = true;

		return this;
	}

	static updateCache(key, value) {
		const keys = Object.keys(this.cache);
		if (keys.length >= this.maxCache) {
			delete this.cache[keys.shift()];
		}

		this.cache[key] = value;
	}

	static async addToQueue(key, value) {
		this.queue.push({ key, value });
	}

	static doSave() {
		if (!this.isSaving) {
			this.isSaving = true;
			let item = this.queue.shift();
			while (item) {
				let data = fs.readFileSync(this.dbFile, { encoding: "utf8" });
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log("[Database] The db file couldn't be parsed as JSON.");
					data = {};
				}

				const key = item.key;
				const value = item.value;

				if (!data) data = {};

				fs.writeFileSync(this.dbFile, JSON.stringify({ ...data, [key]: value }));

				item = this.queue.shift();
			}
			this.isSaving = false;
		}
	}

	static async getData(key) {
		return new Promise((resolve, reject) => {
			let cachedItem = this.cache[key];
			if (cachedItem) {
				resolve(cachedItem);
			}

			fs.readFile(this.dbFile, { encoding: "utf8" }, (err, data) => {
				if (err) reject(err);

				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log("[Database] The db file couldn't be parsed as JSON.");
					data = {};
				}

				let result = data ? data[key] : null;

				if (result) {
					if (Object.keys(result).length === 0) reject("No data!");

					this.updateCache(key, result);
					resolve(result);
				} else {
					reject("No data!");
				}
			});
		});
	}

	static setData(key, value) {
		this.addToQueue(key, value);
		this.updateCache(key, value);

		this.doSave();
	}
}

module.exports = DatabaseUtil;
