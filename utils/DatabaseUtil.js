const fs = require("fs");
const { promisify } = require("util");
const {createClient} = require("redis");

const wait = promisify(setTimeout);

class DatabaseUtil {
	static initialized = false;
	static dbFile = "./db.json";
	static queue = [];
	static cache = {};

	static maxCache = 100;
	static isSaving = false;

	static async initialize(client) {
		//if (!client) throw "Client not provided";
		this.client = client;

		if (process.env.NODE_ENV == "production" && process.env.REDIS_URL) {
			try {
				this.redisClient = createClient({
					url : process.env.REDIS_URL
				});

				this.redisClient.on("error", (err) => {
					console.log("[Database] Redis error: " + err);
				});

				await this.redisClient.connect()
				console.log("[Database] Connected to Redis.");

				this.initialized = true;
				return this;
			}
			catch(err) {
				console.log(err);
			}
		}

		//if not in production environment or redis is not available, use local file
		if (!fs.existsSync(this.dbFile)) {
			fs.writeFileSync(this.dbFile, "{}");
		}

		this.initialized = true;

		console.log("[Database] Using local file.");
		
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
		return new Promise(async (resolve, reject) => {
			if (this.redisClient) {
				let data = await this.redisClient.hGet("users", key);
				if (data) {
					if (typeof(data) == "string") {
						data = JSON.parse(data);
					}
					resolve(data);
					return;
				} else {
					reject("No data!");
					return;
				}
			}
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
					//if (Object.keys(result).length === 0) reject("No data!");

					this.updateCache(key, result);
					resolve(result);
				} else {
					reject("No data!");
				}
			});
		});
	}

	static async setData(key, value) {
		if (this.redisClient) {
			if (typeof(value) == "object") {
				value = JSON.stringify(value);
			}
			return new Promise(async (resolve, reject) => {
				try {
					await this.redisClient.hSet("users", key, value);
					resolve("OK");
					return;
				} catch(err) {
					console.log(`[Database] Error: ${err}`);
					reject(err);
					return;
				}
				
			})
		}

		this.addToQueue(key, value);
		this.updateCache(key, value);

		this.doSave();
	}
}

module.exports = DatabaseUtil;
