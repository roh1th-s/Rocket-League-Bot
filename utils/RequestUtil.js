/* 
	Used the following sites for research on JA3 fingerprinting:
	- https://github.com/cucyber/JA3Transport
	- https://medium.com/cu-cyber/impersonating-ja3-fingerprints-b9f555880e42 

	Repository link for cycleTLS (golang library for impersonation ja3 fingerprints)
	: https://github.com/Danny-Dasilva/CycleTLS
*/
const initCycleTls = require("cycletls");

class RequestError extends Error {
	constructor(resp, req) {
		super(`Status code ${resp.status}`);
		this.request = req;
		this.response = resp;
	}
}
class RequestUtil {
	static cycleTLS = null;
	static ja3 =
		"771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0";
	static userAgent = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0";
	static async initialize() {
		if (!this.cycleTLS) {
			this.cycleTLS = await initCycleTls();
			console.log("[RequestUtil] Initialized cycleTLS");
		}
		return this;
	}

	static isError(code) {
		if (code >= 400 && code < 600) return true;
		return false;
	}

	static async get(url, params) {
		if (!this.cycleTLS) await this.initialize();

		return new Promise(async (resolve, reject) => {
			try {
				const response = await this.cycleTLS(
					url,
					{
						ja3: this.ja3,
						userAgent: this.userAgent,
						Cookies: [
							{
								name: "X-Mapping-Server",
								value: "s14",
								path: "/",
								domain: "rocketleague.tracker.network",
							},
						],
						headers: {
							Origin: "https://rocketleague.tracker.network",
							Referer: "https://rocketleague.tracker.network/",
						},
						...params,
					},
					"get"
				);

				if (this.isError(response.status)) throw response;

				resolve(response);
			} catch (err) {
				reject(new RequestError(err, { url, params }));
			}
		});
	}

	static async post(url, params) {
		if (!this.cycleTLS) await this.initialize();

		return new Promise(async (resolve, reject) => {
			try {
				const response = await this.cycleTLS(
					url,
					{
						ja3: this.ja3,
						userAgent: this.userAgent,
						...params,
					},
					"post"
				);

				if (this.isError(response.status)) throw response;

				resolve(response);
			} catch (err) {
				reject(new RequestError(err, { url, params }));
			}
		});
	}
}

module.exports = RequestUtil;
