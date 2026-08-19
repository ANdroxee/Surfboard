const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["icon-192.png","icon-512.png","manifest.webmanifest","sw.js"]),
	mimeTypes: {".png":"image/png",".webmanifest":"application/manifest+json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.DdNVGbB3.js",app:"_app/immutable/entry/app.CotBoBth.js",imports:["_app/immutable/entry/start.DdNVGbB3.js","_app/immutable/chunks/ByPtr1p9.js","_app/immutable/chunks/CdS4ET9r.js","_app/immutable/entry/app.CotBoBth.js","_app/immutable/chunks/CdS4ET9r.js","_app/immutable/chunks/hctw6l1t.js","_app/immutable/chunks/j3UsZxKk.js","_app/immutable/chunks/tq6I4H7l.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-BNzOkqtI.js')),
			__memo(() => import('./nodes/1.js-CcKmUKkg.js')),
			__memo(() => import('./nodes/2.js-6MuAxbWI.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/cam-proxy/cam",
				pattern: /^\/cam-proxy\/cam\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/cam-proxy/cam/_server.js-BbjUYN2S.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-CWOJ4sS-.js.map
