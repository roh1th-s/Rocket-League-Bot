let DatabaseUtil;

const fs = require('fs')

beforeAll(async () => {
	DatabaseUtil = await require("../utils/DatabaseUtil").initialize();
	DatabaseUtil.dbFile = "./test.db.json"
	return fs.writeFileSync(DatabaseUtil.dbFile, "{}")
});

afterAll(() => {
	return fs.unlinkSync(DatabaseUtil.dbFile)
});

test("Setting data", async () => {
	for (let i = 1; i <= 100; i++) {
		await DatabaseUtil.setData(`Test${i}`, { username: "xXRSTCXx", platform: "epic" });
	}

	for (let i = 1; i <= 100; i++) {
		expect(await DatabaseUtil.getData(`Test${i}`)).toStrictEqual({ username: "xXRSTCXx", platform: "epic" });
	}
});
