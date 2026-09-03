import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-CFdVRolN.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var roles = [
	"customer",
	"merchant",
	"admin"
];
function asRole(role) {
	return roles.includes(role) ? role : "customer";
}
var getWorld_createServerFn_handler = createServerRpc({
	id: "3ffdc9d24aff19e98014627b26cd136c007714096cd4a530d1819595a8ff2f6a",
	name: "getWorld",
	filename: "src/lib/vnd/api.ts"
}, (opts) => getWorld.__executeServer(opts));
var getWorld = createServerFn({ method: "GET" }).validator((data) => ({ role: asRole(data?.role) })).handler(getWorld_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { worldFor } = await import("./engine.server-CyuHX9RF.mjs");
	return worldFor(sql, data.role);
});
var buyItem_createServerFn_handler = createServerRpc({
	id: "fb01c996e696138603064c797de1e654bee7c74f616c49e9e11546efb28c9dfc",
	name: "buyItem",
	filename: "src/lib/vnd/api.ts"
}, (opts) => buyItem.__executeServer(opts));
var buyItem = createServerFn({ method: "POST" }).validator((data) => data).handler(buyItem_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { buySku } = await import("./engine.server-CyuHX9RF.mjs");
	return buySku(sql, data.sku, data.qty);
});
var sendHaggle_createServerFn_handler = createServerRpc({
	id: "d7335b4c6c0aafa80b7dcc884a5c457706ad7aeffb91c41a3ec72be7fa26f45d",
	name: "sendHaggle",
	filename: "src/lib/vnd/api.ts"
}, (opts) => sendHaggle.__executeServer(opts));
var sendHaggle = createServerFn({ method: "POST" }).validator((data) => data).handler(sendHaggle_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { messageShop } = await import("./engine.server-CyuHX9RF.mjs");
	return messageShop(sql, data.body);
});
var restockSku_createServerFn_handler = createServerRpc({
	id: "301d8e90a687bc8c68466afc2e858277c180ab627bc2bd75b7b1de738f12c297",
	name: "restockSku",
	filename: "src/lib/vnd/api.ts"
}, (opts) => restockSku.__executeServer(opts));
var restockSku = createServerFn({ method: "POST" }).validator((data) => data).handler(restockSku_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { placeWholesale } = await import("./engine.server-CyuHX9RF.mjs");
	return placeWholesale(sql, data.sku, data.qty);
});
var priceSku_createServerFn_handler = createServerRpc({
	id: "09704baf5acdbc2d802529ca746fb1666e1feae4b20365e2d97910340b01be42",
	name: "priceSku",
	filename: "src/lib/vnd/api.ts"
}, (opts) => priceSku.__executeServer(opts));
var priceSku = createServerFn({ method: "POST" }).validator((data) => data).handler(priceSku_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { setPrice } = await import("./engine.server-CyuHX9RF.mjs");
	return setPrice(sql, data.sku, data.price);
});
var replyCustomer_createServerFn_handler = createServerRpc({
	id: "34c8a57eaae35b4b68912f356000bc815cd68adf5b75ca5a016aaa371c758969",
	name: "replyCustomer",
	filename: "src/lib/vnd/api.ts"
}, (opts) => replyCustomer.__executeServer(opts));
var replyCustomer = createServerFn({ method: "POST" }).validator((data) => data).handler(replyCustomer_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { replyShop } = await import("./engine.server-CyuHX9RF.mjs");
	return replyShop(sql, data.toId, data.body);
});
var runDummy_createServerFn_handler = createServerRpc({
	id: "98a77df801803675381c8255c4fcaf0554a2de0f59d2f6a4e08d1e4129633ff2",
	name: "runDummy",
	filename: "src/lib/vnd/api.ts"
}, (opts) => runDummy.__executeServer(opts));
var runDummy = createServerFn({ method: "POST" }).handler(runDummy_createServerFn_handler, async () => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { dummyStep } = await import("./engine.server-CyuHX9RF.mjs");
	return dummyStep(sql);
});
var advanceDay_createServerFn_handler = createServerRpc({
	id: "56dada28921e1fcd5e168752e1b81aba365f6488f359f6f6f8e5d4b9f1b5078e",
	name: "advanceDay",
	filename: "src/lib/vnd/api.ts"
}, (opts) => advanceDay.__executeServer(opts));
var advanceDay = createServerFn({ method: "POST" }).handler(advanceDay_createServerFn_handler, async () => {
	const { getSql } = await import("./db-APJWdHG7.mjs");
	const sql = await getSql();
	const { tickDay } = await import("./engine.server-CyuHX9RF.mjs");
	return tickDay(sql);
});
//#endregion
export { advanceDay_createServerFn_handler, buyItem_createServerFn_handler, getWorld_createServerFn_handler, priceSku_createServerFn_handler, replyCustomer_createServerFn_handler, restockSku_createServerFn_handler, runDummy_createServerFn_handler, sendHaggle_createServerFn_handler };
