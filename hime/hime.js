/*
 *  JSブロック崩し -ひめかべ-  Ver.1.00
 *  Copyright (C)2014.5.27 by みなみせい
 */
var BLOCKSIZE = 16;   // ブロックのピクセル数(変更は非推奨)
var BALLSIZE  = 11;   // ボールのピクセル数
var ANGLE_MIN = 10;   // ボール角度最小値
var PDL_EDGE  = 0.2;  // パドル両端(ボール角度変更エリア)の長さの割合

var stage = [];

/*
 *  その他の関数
 */
function $(nm)
{
	return document.getElementById(nm);
}

function puts(msg, type)
{
	var el = $("msg");

	if (msg) {
		el.innerHTML = msg;
		el.style.marginLeft = -(el.offsetWidth / 2 | 0) + "px";
		el.style.bottom = ("under" == type) ? "16px" : "50%";
		el.style.visibility = "visible";
	}
	else {
		el.style.visibility = "hidden";
	}
}

function putImage(margin, imgs)
{
	var i, wk, str = "", w = h = 0;

	imgs = [].concat.apply([], imgs);  // ２次元配列を１次元化

	for (i = 0; i < imgs.length; i++) {
		wk = imgs[i];
		if (w < wk.width)  w = wk.width;
		if (h < wk.height) h = wk.height;

		str += '<img src="' + wk.src + '" alt="" style="position:absolute; left:0; top:0">\n';
	}

	wk = $("gamebg");
	wk.style.width  = w + "px";
	wk.style.height = h + margin + "px";
	wk.innerHTML = str;

	$("gamecanv").style.visibility = "hidden";
}

function clickDo(func)
{
	var el = $("gamescreen");

	el.onclick = function() {
		el.onclick = null;
		func();
	};
}

function smoothingOff(g)  // スムージングの無効化 (非スケーリング画像をスムージングするブラウザがあるため)
{
	g.msImageSmoothingEnabled = false;
	g.mozImageSmoothingEnabled = false;
	g.webkitImageSmoothingEnabled = false;
	g.imageSmoothingEnabled = false;
}

/*
 *  画像管理
 */
var cache = new function() {
	var tmp = [];

	this.store = function(src) {
		if (-1 == src) return null;

		var wk = tmp[tmp.push(new Image()) -1];
		wk.onload = function(){ this.$state = 1; };
		wk.onerror = wk.onabort = function(){ this.$state = 2; };
		wk.src = src || ".";

		return wk;
	};

	this.compl = function() {
		var wk, ct = 1500;

		(wk = function() {
			var i, err = [];

			for (i = 0; (i < tmp.length) && (0 < ct); i++) {
				if (2 == tmp[i].$state) err.push(tmp[i].src);

				if (!(tmp[i].complete || tmp[i].$state)) {
					ct--;
					setTimeout(wk, 200);
					return;
				}
			}

			/*** Firefox で稀に drawImage() でエラーが発生するのでインターバルを長めにする ***/
			setTimeout((err.length) ? function(){ cache.onerror(err); } : cache.oncompl, 500);
		})();
	};

	this.oncompl = function(){};
	this.onerror = function(){};
};

/*
 *  ブロック管理
 */
var block = new function() {
	this.create = function(img) {
		var sz = BLOCKSIZE, blk = [], g, el;
		var x, xl, y, yl, w, h, d, b;

		w = img.width;
		h = img.height;

		el = document.createElement("canvas");
		el.width  = w;
		el.height = h;

		g = el.getContext("2d");
		smoothingOff(g);

		g.drawImage(img, 0, 0);
		d = g.getImageData(0, 0, w, h).data;

		/*
		 *  16測定点の不透明度を調べる
		 *  →全て透明:ブロックなし, その他:ブロックあり
		 */
		var y1 =  0 * w * 4,  // Ｙ軸の測定点: (X,0) (X,5) (X,10) (X,15)
			y2 =  5 * w * 4,
			y3 = 10 * w * 4,
			y4 = 15 * w * 4;

		var x1 =  0 * 4 + 3,  // Ｘ軸の測定点: (0,Y) (5,Y) (10,Y) (15,Y)
			x2 =  5 * 4 + 3,
			x3 = 10 * 4 + 3,
			x4 = 15 * 4 + 3;

		xl = w / sz | 0;
		yl = h / sz | 0;

		for (y = 0; y < yl; y++) {
			for (x = 0; x < xl; x++) {
				b = ((x * sz) + (y * sz) * w) * 4;

				blk.push(!!(
					d[b + y1 + x1] | d[b + y1 + x2] | d[b + y1 + x3] | d[b + y1 + x4] |
					d[b + y2 + x1] | d[b + y2 + x2] | d[b + y2 + x3] | d[b + y2 + x4] |
					d[b + y3 + x1] | d[b + y3 + x2] | d[b + y3 + x3] | d[b + y3 + x4] |
					d[b + y4 + x1] | d[b + y4 + x2] | d[b + y4 + x3] | d[b + y4 + x4] ));
			}
		}

		return blk;
	};

	this.suu = function(blk) {
		var i, ct = 0;

		for (i = 0; i < blk.length; i++) {
			if (blk[i]) ct++;
		}

		return ct;
	};

	this.copy = function(s) {
		var i, d = [];

		for (i = 0; i < s.length; i++) d[i] = s[i];
		return d;
	};
};

/*
 *  各シーンの処理
 */
var scene = new function() {
	var si, life;

	function ready() {
		var s;

		if (!(si < stage.length)) {
			ending();
			return;
		}

		s = stage[si];
		putImage(conf.margin, [s.imgbg]);
		game.init(s, clear, miss);

		puts("Life " + life);
		game.run();
	}

	function clear() {
		si++;
		puts("Stage Clear!", "under");
		clickDo(ready);
	}

	function miss() {
		if (0 >= --life) {
			puts("GAME OVER");
			clickDo(scene.title);
		}
		else {
			puts("Life " + life);
			game.run();
		}
	}

	function ending() {
		if (cache.bonus) putImage(0, [cache.bonus]);

		if (conf.next) {
			puts("Go next page", "under");
			clickDo(function(){ location.href = conf.next; });
		}
		else {
			puts("Congratulations!", "under");
		}
	}

	this.title = function() {
		var s;

		si = 0;
		life = conf.life;

		if (cache.title) {
			s = stage[si];
			putImage(conf.margin, [s.imgbg, s.imgfuku, cache.title]);
			puts();
			clickDo(ready);
		}
		else {
			ready();
		}
	};
};

/*
 *  ブロック崩しメイン処理
 */
var game = new function() {
	var DISTMAX = 2, DEG1 = 0.0174533;

	var tmh, clearfunc, missfunc;
	var blk, suu, line;
	var g, gx, gy, gw, gh;
	var pdl, px, pw, ph, pW, edge;
	var ball, bx, by, brad, bmx, bmy;
	var deg, dx, dy, dist, rept, fast;

	var kantuu = new function() {
		this.enabled;
		this.range;

		this.use = function(mode) {
			this.enabled = !!mode;
			ball.src = (mode) ? conf.ballK : conf.ball;
		};

		this.check = function() {
			var x = px + pW;
			return ((x - this.range) < bx && bx < (x + this.range));
		};
	};

	function normDeg(n) {
		n %= 360;
		return (0 > n) ? n + 360 : n;
	}

	function calcDeg(mode) {
		if (1 == mode) deg = 180 - deg;
		if (2 == mode) deg = 360 - deg;
		deg = normDeg(deg);

		var r = -DEG1 * deg;
		dx = Math.cos(r) * dist;
		dy = Math.sin(r) * dist;
	}

	function sprite(mode) {
		var v = (mode) ? "visible" : "hidden";

		ball.style.visibility = v;
		pdl.style.visibility = v;
	}

	function shotReady(func) {
		function pos() {
			bx = px + pW;
			by = gh - ph - BALLSIZE;

			ball.style.left = (bx - brad | 0) + "px";
			ball.style.top  = (by - brad | 0) + "px";
		}

		if (func) return function(e) {
			var rc = func(e);
			pos();
			return rc;
		};

		pos();
	}

	function pdlMove(e) {
		px = e.pageX - gx - pW;

		if (px < -pW) px = -pW;
		if (px > gw - pW) px = gw - pW;

		pdl.style.left = px + "px";
		return false;
	}

	function pdlTouchMove(e) {
		var wk = e.touches[0], x = wk.pageX, y = wk.pageY;

		if (!((gx < x) && (x < gx + gw) && (gy < y) && (y < gy + gh + 150))) return true;

		px = x - gx - pW;

		if (px < -pW) px = -pW;
		if (px > gw - pW) px = gw - pW;

		pdl.style.left = px + "px";
		return false;
	}

	function keyDown(e) {
		var c = String.fromCharCode((e) ? e.which : event.keyCode);

		if ('S' == c) {
			fast = !fast;
			return false;
		}
		return true;
	}

	function getCanvPos() {
		var wk = $("gamecanv").getBoundingClientRect();
		gx = window.pageXOffset + (wk.left | 0);
		gy = window.pageYOffset + (wk.top  | 0);
	}

	function detach() {
		sprite(0);
		clearInterval(tmh);
		document.onmousemove = null;
		document.ontouchmove = null;
		document.onkeydown   = null;
	}

	function frame(e) {
		var i, l = (fast) ? rept * 2 : rept;

		for (i = 0; i < l; i++) {
			if (!motion()) break;
		}
	}

	function motion() {
		var i, wk, x, y, sz = BLOCKSIZE;

		if (bx < brad) {
			bx = brad;
			calcDeg(1);
		}
		else if (bx > bmx) {
			bx = bmx;
			calcDeg(1);
		}

		if (by < brad) {
			by = brad;
			calcDeg(2);
		}
		else if (by > bmy) {
			by = bmy;
			calcDeg(2);

			if ((px <= bx) && (bx <= px + pw)) {
				kantuu.use(kantuu.check());

				if (edge > (wk = bx - px)) {
					deg = Math.round((180 - ANGLE_MIN) - Math.sin(wk / edge * 1.5708) * (85 - ANGLE_MIN));
					calcDeg();
				}
				else if (edge > (wk = px + pw - bx)) {
					deg = Math.round(ANGLE_MIN + Math.sin(wk / edge * 1.5708) * (85 - ANGLE_MIN));
					calcDeg();
				}
			}
			else if (!conf.debug) {
				detach();
				setTimeout(missfunc, 1);
				return false;
			}
		}

		x = bx / sz | 0;
		y = by / sz | 0;
		i = y * line + x;

		if (blk[i]) {
			blk[i] = false;
			suu--;
			g.clearRect(x * sz, y * sz, sz, sz);

			if (!kantuu.enabled) {
				calcDeg((function(x, y) {
					var atan2 = function(x, y){ return normDeg(Math.atan2(y, x) / DEG1); }, X, Y;

					x += 1;
					y =  sz - y;
					X = -sz + x - 1;
					Y = -sz + y - 1;

					if ( 90 > deg) return (deg < atan2(x, y)) ? 1 : 2;
					if (180 > deg) return (deg < atan2(X, y)) ? 2 : 1;
					if (270 > deg) return (deg < atan2(X, Y)) ? 1 : 2;
					if (360 > deg) return (deg < atan2(x, Y)) ? 2 : 1;
				})(bx % sz, by % sz));
			}
		}

		if (0 >= suu) {
			detach();
			setTimeout(clearfunc, 1);
			return false;
		}

		bx += dx;
		by += dy;

		ball.style.left = (bx - brad | 0) + "px";
		ball.style.top  = (by - brad | 0) + "px";

		return true;
	}

	this.init = function(s, clear, miss) {
		function draw(img) {
			var el;

			gw = img.width;
			gh = img.height + conf.margin;

			el = $("gamebg");
			el.style.width  = gw + "px";
			el.style.height = gh + "px";

			el = $("gamecanv");
			el.width  = gw;
			el.height = gh;
			el.style.visibility = "visible";

			g = el.getContext("2d");
			smoothingOff(g);

			g.clearRect(0, 0, gw, gh);
			g.drawImage(img, 0, 0);
		}

		draw(s.imgfuku);

		pw = s.imgpdl.width;
		ph = s.imgpdl.height;
		pW = pw / 2 | 0;
		px = gw / 2 - pW | 0;
		edge = pw * PDL_EDGE;
		pdl = $("pdl");
		pdl.src = s.pdl;
		pdl.style.left = px + "px";

		brad = BALLSIZE / 2 | 0;
		bmx = gw - brad;
		bmy = gh - brad - ph + 2;
		ball = $("ball");

		blk = block.copy(s.blkmap);
		suu = s.blksuu;
		line = gw / BLOCKSIZE | 0;

		rept = Math.ceil(s.speed / DISTMAX);
		dist = s.speed / rept;

		kantuu.range = s.kantuu;

		clearfunc = clear;
		missfunc  = miss;
	};

	this.run = function() {
		deg = 45;
		calcDeg();

		sprite(1);
		kantuu.use(0);

		getCanvPos();
		window.onresize = getCanvPos;

		shotReady();
		document.onmousemove = shotReady(pdlMove);
		document.ontouchmove = shotReady(pdlTouchMove);
		document.onkeydown   = keyDown;

		clickDo(function() {
			puts();
			document.onmousemove = pdlMove;
			document.ontouchmove = pdlTouchMove;
			tmh = setInterval(frame, 16);
		});
	};
};

/*
 *  blockmap デコード処理
 */
var blockmap = new function() {
	var si = 0, asc = (function() {
		var i, wk = [], chr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_";
		for (i = 0; i < chr.length; i++) wk[chr.charAt(i)] = i;
		return wk;
	})();

	this.add = function(str) {
		var i, v, data = [];

		str = str.replace(/([\x28-\x2F])/g, function(s, p){ return new Array((p.charCodeAt(0) - 38) +1).join("A"); });
		str = str.replace(/([\x3A-\x40])/g, function(s, p){ return new Array((p.charCodeAt(0) - 56) +1).join("_"); });
		str = str.replace(/[^$\w]/g, "");

		for (i = 0; i < str.length; i++) {
			v = asc[str.charAt(i)];
			data.push(!!(v & 32), !!(v & 16), !!(v & 8), !!(v & 4), !!(v & 2), !!(v & 1));
		}

		if (si < stage.length) stage[si++].blkmap = data;
	};
};

/*
 *  スタートアップ
 */
function oncompl()
{
	var i, wk, msg = function(s){ $("bootmsg").innerHTML += s; };

	function suu(suu, ok) {
		return Math.round((1 > ok) ? suu - suu * ok : suu - ok);
	}

	try {
		for (i = 0; i < stage.length; i++) {
			wk = stage[i];
			if (!wk.blkmap) wk.blkmap = block.create(wk.imgfuku);
			wk.blksuu = suu(block.suu(wk.blkmap), wk.ok);
		}
	}
	catch (ex) {
		msg("生成に失敗しました:\n" + wk.fuku);
		return;
	}

	msg("完了しました\n");

	setTimeout(function() {
		$("gamescreen").innerHTML = '\n\
<div id="gamebg" style="position:relative">&nbsp;</div>\n\
<canvas id="gamecanv" style="position:absolute; visibility:hidden; left:0; top:0"></canvas>\n\
<img id="ball" style="position:absolute; visibility:hidden; left:0; bottom:0" src="' + conf.ball + '" width="' + BALLSIZE + '" height="' + BALLSIZE + '">\n\
<img id="pdl"  style="position:absolute; visibility:hidden; left:0; bottom:0" src="' + conf.ball + '">\n\
<span id="msg" style="position:absolute; visibility:hidden; white-space:nowrap; left:50%; bottom:50%">&nbsp;</span>\n';

		scene.title();
	}, 500);
}

window.onload = function()
{
	var i, wk, msg = function(s){ $("bootmsg").innerHTML += s; };

	function capability() {
		try {
			document.createElement("canvas").getContext("2d");
			document.getElementsByTagName("body")[0].getBoundingClientRect();
		}
		catch (ex) {
			return false;
		}

		return true;
	}

	if (!capability()) {
		$("gamescreen").innerHTML = '<p>非対応のブラウザです。動作には HTML5 Canvas に対応したブラウザが必要です。</p>';
		return;
	}

	$("gamescreen").innerHTML = '<pre id="bootmsg"></pre>';

	msg("JSブロック崩し -ひめかべ-  Ver.1.00\n\n");
	msg("画像を読み込んでいます... ");

	cache.store(conf.ball);
	cache.store(conf.ballK);
	cache.title = cache.store(conf.title || -1);
	cache.bonus = cache.store(conf.bonus || -1);

	for (i = 0; i < stage.length; i++) {
		wk = stage[i];

		wk.imgbg = (function(wk) {
			for (var i = 0; i < wk.length; i++) wk[i] = cache.store(wk[i]);
			return wk;
		})(wk.bg.replace(/\s/g, "").split(";"));

		wk.imgfuku = cache.store(wk.fuku);
		wk.imgpdl  = cache.store(wk.pdl);
	}

	cache.onerror = function(list) {
		msg("読み込みできません:\n" + list.join("\n"));
	};

	cache.oncompl = function() {
		msg("完了しました\nブロックマップを生成しています... ");
		setTimeout(oncompl, 1);
	};

	cache.compl();
};
