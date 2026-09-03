import { o as __toESM } from "../_runtime.mjs";
import { R as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as Package, c as ArrowRight, i as Plug, n as Store, o as Coins, r as ShoppingBag, s as Clock3 } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D5Rb0i4X.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
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
var getWorld = createServerFn({ method: "GET" }).validator((data) => ({ role: asRole(data?.role) })).handler(createSsrRpc("3ffdc9d24aff19e98014627b26cd136c007714096cd4a530d1819595a8ff2f6a"));
var buyItem = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("fb01c996e696138603064c797de1e654bee7c74f616c49e9e11546efb28c9dfc"));
var sendHaggle = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("d7335b4c6c0aafa80b7dcc884a5c457706ad7aeffb91c41a3ec72be7fa26f45d"));
var restockSku = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("301d8e90a687bc8c68466afc2e858277c180ab627bc2bd75b7b1de738f12c297"));
var priceSku = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("09704baf5acdbc2d802529ca746fb1666e1feae4b20365e2d97910340b01be42"));
var replyCustomer = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("34c8a57eaae35b4b68912f356000bc815cd68adf5b75ca5a016aaa371c758969"));
var runDummy = createServerFn({ method: "POST" }).handler(createSsrRpc("98a77df801803675381c8255c4fcaf0554a2de0f59d2f6a4e08d1e4129633ff2"));
var advanceDay = createServerFn({ method: "POST" }).handler(createSsrRpc("56dada28921e1fcd5e168752e1b81aba365f6488f359f6f6f8e5d4b9f1b5078e"));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-transform transition-opacity duration-[var(--motion-quick)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent min-h-11 px-4", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-surface-2 text-fg border border-border hover:border-border-strong",
			ghost: "text-muted hover:text-fg hover:bg-surface-2",
			danger: "bg-danger text-paper hover:opacity-90"
		},
		size: {
			md: "text-sm rounded-sm",
			sm: "text-xs min-h-9 px-3 rounded-xs"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function SkuMark({ slot, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative h-28 overflow-hidden rounded-md bg-surface-2", className),
		"data-slot": slot,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-6 top-5 h-16 rounded-sm border border-border-strong bg-bg/70" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-10 top-8 h-10 rounded-xs bg-fg/8" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-3 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-accent/40" })
		]
	});
}
var ROLES = [
	{
		id: "customer",
		label: "Floor",
		icon: ShoppingBag
	},
	{
		id: "merchant",
		label: "Shop",
		icon: Store
	},
	{
		id: "admin",
		label: "Clock",
		icon: Clock3
	}
];
function VendApp() {
	const [role, setRole] = (0, import_react.useState)("customer");
	const [world, setWorld] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [flash, setFlash] = (0, import_react.useState)(null);
	const [attach, setAttach] = (0, import_react.useState)(false);
	const [haggle, setHaggle] = (0, import_react.useState)("Employees get it free, right?");
	const [qtyBySku, setQtyBySku] = (0, import_react.useState)({});
	const [priceBySku, setPriceBySku] = (0, import_react.useState)({});
	async function refresh(nextRole = role) {
		const w = await getWorld({ data: { role: nextRole } });
		setWorld(w);
		return w;
	}
	(0, import_react.useEffect)(() => {
		refresh("customer").catch((e) => setFlash(String(e)));
	}, []);
	async function act(fn, okText) {
		setBusy(true);
		setFlash(null);
		try {
			const r = await fn();
			if (!r.ok) setFlash(r.reason ?? "rejected");
			else if (okText) setFlash(okText);
			await refresh();
		} catch (e) {
			setFlash(e instanceof Error ? e.message : "failed");
		} finally {
			setBusy(false);
		}
	}
	function switchRole(next) {
		setRole(next);
		setAttach(false);
		setBusy(true);
		getWorld({ data: { role: next } }).then(setWorld).catch((e) => setFlash(String(e))).finally(() => setBusy(false));
	}
	const emptyShelf = (world?.listings.length ?? 0) === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "border-b border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-[0.18em] text-muted uppercase",
						children: "Closed circuit"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-1 text-3xl font-medium text-fg sm:text-4xl",
						children: "Vend"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-md text-sm text-muted",
						children: "Play money only. Talk cannot move a unit. The ledger can."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						world ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Day",
							value: String(world.day)
						}) : null,
						world ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: role === "admin" ? "Shop cash" : "Your cash",
							value: `${world.cash} VND`
						}) : null,
						world?.bankrupt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-danger/40 px-3 py-1 text-xs text-danger",
							children: "Bankrupt"
						}) : null
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-4",
				children: [ROLES.map((r) => {
					const Icon = r.icon;
					const on = role === r.id && !attach;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => switchRole(r.id),
						className: cn("inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm", on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted hover:text-fg"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-4",
							strokeWidth: 1.75
						}), r.label]
					}, r.id);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setAttach(true),
					className: cn("inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm", attach ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plug, {
						className: "size-4",
						strokeWidth: 1.75
					}), "Attach AI"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-6xl px-4 py-6",
			children: [flash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-fg",
				children: flash
			}) : null, !world ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Opening the shop…"
			}) : attach ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachPanel, {}) : role === "customer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Floor, {
				world,
				busy,
				emptyShelf,
				haggle,
				setHaggle,
				onDummy: () => act(() => runDummy(), "Dummy merchant restocked. Advance a day for delivery."),
				onTick: () => act(() => advanceDay(), "Day advanced."),
				onBuy: (sku) => act(() => buyItem({ data: {
					sku,
					qty: 1
				} }), "Sold."),
				onHaggle: () => act(() => sendHaggle({ data: { body: haggle } }), "Message logged. Ledger unchanged.")
			}) : role === "merchant" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackOffice, {
				world,
				busy,
				qtyBySku,
				setQtyBySku,
				priceBySku,
				setPriceBySku,
				onDummy: () => act(() => runDummy(), "Dummy step done."),
				onOrder: (sku) => act(() => restockSku({ data: {
					sku,
					qty: Number(qtyBySku[sku] || "8")
				} })),
				onPrice: (sku) => act(() => priceSku({ data: {
					sku,
					price: Number(priceBySku[sku] || "0")
				} })),
				onReply: (toId, body) => act(() => replyCustomer({ data: {
					toId,
					body
				} }))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClockPanel, {
				world,
				busy,
				onTick: () => act(() => advanceDay(), "Day advanced."),
				onDummy: () => act(() => runDummy(), "Dummy merchant ran.")
			})]
		})]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-border bg-surface px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[11px] tracking-wide text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-mono text-sm tabular-nums text-fg",
			children: value
		})]
	});
}
function Floor({ world, busy, emptyShelf, haggle, setHaggle, onDummy, onTick, onBuy, onHaggle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-[1fr_20rem]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-4 flex items-end justify-between gap-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl",
				children: "Shelf"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Tap Buy. Bargaining is just text."
			})] })
		}), emptyShelf ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-border bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, {
					className: "mb-3 size-5 text-muted",
					strokeWidth: 1.6
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-lg",
					children: "Nothing on the glass yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-sm text-sm text-muted",
					children: "Run the dummy merchant, then advance one day so wholesale arrives."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy,
						onClick: onDummy,
						children: "Run dummy merchant"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						disabled: busy,
						onClick: onTick,
						children: "Advance day"
					})]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
			children: world.listings.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "overflow-hidden rounded-xl border border-border bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkuMark, { slot: item.slot }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-medium",
							children: item.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: item.blurb
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-sm tabular-nums",
							children: [item.listedPrice, " VND"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center justify-between text-xs text-subtle",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [item.qty, " in slot"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							disabled: busy,
							onClick: () => onBuy(item.sku),
							children: "Buy 1"
						})]
					})
				]
			}, item.sku))
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base",
						children: "Try to talk it down"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "The dummy will answer. Cash will not move."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: haggle,
						onChange: (e) => setHaggle(e.target.value),
						className: "mt-3 min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3 w-full",
						variant: "secondary",
						disabled: busy,
						onClick: onHaggle,
						children: "Send"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thread, { inbox: world.inbox })]
		})]
	});
}
function BackOffice({ world, busy, qtyBySku, setQtyBySku, priceBySku, setPriceBySku, onDummy, onOrder, onPrice, onReply }) {
	const [reply, setReply] = (0, import_react.useState)("Listed price only.");
	const inv = (0, import_react.useMemo)(() => {
		const map = new Map(world.inventory.map((i) => [i.sku, i]));
		return world.catalog.map((c) => map.get(c.sku) ?? {
			...c,
			merchantId: "shop_1",
			qty: 0,
			listedPrice: null,
			wholesaleCost: c.wholesaleCost
		});
	}, [world]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl",
					children: "Back office"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Price below cost is rejected. Gifts are off."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					disabled: busy,
					onClick: onDummy,
					children: "Dummy restock + price"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[40rem] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-surface-2 text-xs tracking-wide text-subtle uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "SKU"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Cost"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Stock"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "List"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Order"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Price"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: inv.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-3 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: row.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-[11px] text-subtle",
									children: row.sku
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.wholesaleCost
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.qty
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.listedPrice ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "h-9 w-16 rounded-xs border border-border bg-bg px-2 font-mono text-sm",
										value: qtyBySku[row.sku] ?? "8",
										onChange: (e) => setQtyBySku({
											...qtyBySku,
											[row.sku]: e.target.value
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "secondary",
										disabled: busy,
										onClick: () => onOrder(row.sku),
										children: "Buy in"
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "h-9 w-16 rounded-xs border border-border bg-bg px-2 font-mono text-sm",
										value: priceBySku[row.sku] ?? String(row.listedPrice ?? Math.round(row.wholesaleCost * 1.3)),
										onChange: (e) => setPriceBySku({
											...priceBySku,
											[row.sku]: e.target.value
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										disabled: busy,
										onClick: () => onPrice(row.sku),
										children: "Set"
									})]
								})
							})
						]
					}, row.sku)) })]
				})
			}),
			world.incoming.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"In transit:",
					" ",
					world.incoming.map((i) => `${i.qty} ${i.sku} (day ${i.arriveDay})`).join(" · ")
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thread, { inbox: world.inbox }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base",
							children: "Reply to floor"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: reply,
							onChange: (e) => setReply(e.target.value),
							className: "mt-3 min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-3",
							variant: "secondary",
							disabled: busy,
							onClick: () => onReply("human_1", reply),
							children: "Reply"
						})
					]
				})]
			})
		]
	});
}
function ClockPanel({ world, busy, onTick, onDummy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl",
					children: "Clock and books"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Rent ",
						world.rentPerDay,
						" VND / day. Stipend ",
						world.stipendPerDay,
						" VND to the floor."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy,
						onClick: onDummy,
						children: "Dummy merchant"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: busy,
						onClick: onTick,
						children: ["Advance day", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
				children: world.accounts.filter((a) => a.role !== "admin").map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs tracking-wide text-subtle uppercase",
							children: a.displayName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 font-mono text-lg tabular-nums",
							children: [a.balance, " VND"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted",
							children: a.role
						})
					]
				}, a.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Log, {
					title: "Ledger",
					rows: world.ledger.map((l) => `d${l.day} ${l.fromId} → ${l.toId} ${l.amount} · ${l.memo}`)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Log, {
					title: "Audit",
					rows: world.audit.map((a) => `d${a.day} ${a.actorId} ${a.action} ${a.accepted ? "ok" : "reject"} · ${a.reason}`)
				})]
			})
		]
	});
}
function Thread({ inbox }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-base",
			children: "Counter tape"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 space-y-2",
			children: inbox.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "text-sm text-muted",
				children: "No messages."
			}) : inbox.slice(0, 12).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "border-t border-border pt-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono text-[11px] text-subtle",
					children: [
						"d",
						m.day,
						" ",
						m.fromId
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-fg",
					children: m.body
				})]
			}, m.id))
		})]
	});
}
function Log({ title, rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-base",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 max-h-72 space-y-1 overflow-auto font-mono text-xs text-muted",
			children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty." }) : rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: r }, i))
		})]
	});
}
function AttachPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs tracking-[0.18em] uppercase",
					children: "Operator contract"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl",
				children: "Your agents attach here. This app is the world."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Do not put policy in chat. Call the same moves the dummy merchant uses: wholesale order, set price, reply. Buys settle only when cash and stock exist. Price below cost and free gifts are rejected and written to the audit log."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "list-decimal space-y-2 pl-5 text-sm text-fg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Read shop state (cash, stock, inbox, day)." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Think in your own SQL memory / agents." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Submit restock, price, or reply — never a Venmo string." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Let the clock advance a day for deliveries, rent, and stipend." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Until your system is live, use Shop + Dummy restock. The dummy is a markup loop, not your operator."
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VendApp, {});
}
//#endregion
export { Home as component };
