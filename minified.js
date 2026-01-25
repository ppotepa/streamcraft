"use strict";
luxon.Duration.prototype.toLargestUnitString = function () {
    let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 3;
    const t = this.shiftTo("years", "month", "days", "hours", "minutes", "seconds", "milliseconds").toObject()
        , a = Object.entries(t).find(e => e[1] > 0);
    return a ? a[1] + " " + a[0].substring(0, Math.min(e, a[0].length)) : "recent"
}
    ;
class IntervalExecutor {
    constructor(e, t, a, r) {
        this.runnable = e,
            this.shouldRun = t,
            this.interval = a,
            this.maxFails = r,
            this.failCount = 0
    }
    execute() {
        !0 === this.shouldRun() ? this.runnable() : this.failCount += 1,
            this.failCount >= this.maxFails && this.stop()
    }
    stop() {
        this.intervalId && (window.clearInterval(this.intervalId),
            this.intervalId = null,
            this.failCount = 0)
    }
    schedule() {
        this.intervalId = window.setInterval(this.execute.bind(this), this.interval)
    }
    executeAndReschedule() {
        this.stop(),
            this.execute(),
            this.schedule()
    }
}
function _classPrivateFieldInitSpec(e, t, a) {
    _checkPrivateRedeclaration(e, t),
        t.set(e, a)
}
function _checkPrivateRedeclaration(e, t) {
    if (t.has(e))
        throw new TypeError("Cannot initialize the same private elements twice on an object")
}
function _defineProperty(e, t, a) {
    return (t = _toPropertyKey(t)) in e ? Object.defineProperty(e, t, {
        value: a,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : e[t] = a,
        e
}
function _toPropertyKey(e) {
    var t = _toPrimitive(e, "string");
    return "symbol" == typeof t ? t : t + ""
}
function _toPrimitive(e, t) {
    if ("object" != typeof e || !e)
        return e;
    var a = e[Symbol.toPrimitive];
    if (void 0 !== a) {
        var r = a.call(e, t || "default");
        if ("object" != typeof r)
            return r;
        throw new TypeError("@@toPrimitive must return a primitive value.")
    }
    return ("string" === t ? String : Number)(e)
}
function _classPrivateFieldGet(e, t) {
    return e.get(_assertClassBrand(e, t))
}
function _classPrivateFieldSet(e, t, a) {
    return e.set(_assertClassBrand(e, t), a),
        a
}
function _assertClassBrand(e, t, a) {
    if ("function" == typeof e ? e === t : e.has(t))
        return arguments.length < 3 ? t : a;
    throw new TypeError("Private element is not present on this object")
}
var _field = new WeakMap
    , _order = new WeakMap;
class SortParameter {
    constructor(e, t) {
        _classPrivateFieldInitSpec(this, _field, void 0),
            _classPrivateFieldInitSpec(this, _order, void 0),
            _classPrivateFieldSet(_field, this, e),
            _classPrivateFieldSet(_order, this, t)
    }
    static fromPrefixedString(e) {
        let t = e
            , a = SORTING_ORDER.ASC;
        return e.charAt(0) == SortParameter.DESC_PREFIX ? (a = SORTING_ORDER.DESC,
            t = e.substring(1, e.length)) : e.charAt(0) == SortParameter.ASC_PREFIX && (t = e.substring(1, e.length)),
            new SortParameter(t, a)
    }
    toPrefixedString() {
        return (this.order == SORTING_ORDER.ASC ? "" : SortParameter.DESC_PREFIX) + this.field
    }
    get field() {
        return _classPrivateFieldGet(_field, this)
    }
    get order() {
        return _classPrivateFieldGet(_order, this)
    }
}
function _classPrivateFieldInitSpec(e, t, a) {
    _checkPrivateRedeclaration(e, t),
        t.set(e, a)
}
function _checkPrivateRedeclaration(e, t) {
    if (t.has(e))
        throw new TypeError("Cannot initialize the same private elements twice on an object")
}
function _classPrivateFieldGet(e, t) {
    return e.get(_assertClassBrand(e, t))
}
function _classPrivateFieldSet(e, t, a) {
    return e.set(_assertClassBrand(e, t), a),
        a
}
function _assertClassBrand(e, t, a) {
    if ("function" == typeof e ? e === t : e.has(t))
        return arguments.length < 3 ? t : a;
    throw new TypeError("Private element is not present on this object")
}
_defineProperty(SortParameter, "DESC_PREFIX", "-"),
    _defineProperty(SortParameter, "ASC_PREFIX", "+");
var _token = new WeakMap
    , _direction = new WeakMap;
class Cursor {
    constructor(e, t) {
        _classPrivateFieldInitSpec(this, _token, void 0),
            _classPrivateFieldInitSpec(this, _direction, void 0),
            _classPrivateFieldSet(_token, this, e),
            _classPrivateFieldSet(_direction, this, t)
    }
    static fromUrlSearchParams(e) {
        for (const t of Object.values(NAVIGATION_DIRECTION)) {
            const a = e.get(t.relativePosition);
            if (null != a)
                return new Cursor(a, t)
        }
        return null
    }
    static fromElementAttributes(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "";
        for (const a of Object.values(NAVIGATION_DIRECTION)) {
            const r = e.getAttribute(t + a.relativePosition);
            if (null != r)
                return new Cursor(r, a)
        }
        return null
    }
    get token() {
        return _classPrivateFieldGet(_token, this)
    }
    get direction() {
        return _classPrivateFieldGet(_direction, this)
    }
}
class Util {
    static urlencodeFormData(e) {
        let t = "";
        for (const a of e.entries())
            "string" == typeof a[1] && (t += (t ? "&" : "") + Util.encodeSpace(a[0]) + "=" + Util.encodeSpace(a[1]));
        return t
    }
    static getFormData(e) {
        e || (e = document.getElementById("form-ladder"));
        return new FormData(e)
    }
    static getFormParameters(e) {
        return Util.urlencodeFormData(Util.getFormData(e))
    }
    static mapToUrlSearchParams(e) {
        const t = new URLSearchParams;
        for (const [a, r] of e instanceof Map ? e.entries() : Object.entries(e))
            for (const e of r)
                t.append(a, e);
        return t
    }
    static setGeneratingStatus(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "Error"
            , a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null;
        switch (e) {
            case STATUS.BEGIN:
                if (Session.currentRequests++,
                    Session.currentRequests > 1)
                    return;
                ElementUtil.setElementsVisibility(document.getElementsByClassName("status-generating-begin"), !0),
                    ElementUtil.setElementsVisibility(document.getElementsByClassName("status-generating-success"), !1),
                    ElementUtil.setElementsVisibility(document.getElementsByClassName("status-generating-error"), !1);
                break;
            case STATUS.SUCCESS:
            case STATUS.ERROR:
                if (Session.currentRequests--,
                    e === STATUS.ERROR && Util.showGlobalError(null != a ? a : {
                        message: t
                    }),
                    Session.currentRequests > 0)
                    return;
                ElementUtil.setElementsVisibility(document.getElementsByClassName("status-generating-begin"), !1),
                    ElementUtil.setElementsVisibility(document.getElementsByClassName("status-generating-" + e.name), !0),
                    Session.isHistorical = !1
        }
    }
    static showGlobalError(e) {
        1 == DEBUG && console.log(e),
            document.body.classList.add("js-error-detected"),
            document.getElementById("error-generation-text").textContent = Util.ERROR_MESSAGES.get(e.message.trim()) || e.message,
            Session.isSilent || $("#error-generation").modal()
    }
    static successStatusPromise(e) {
        return Util.setGeneratingStatus(STATUS.SUCCESS),
            Promise.resolve(e)
    }
    static getCookie(e) {
        for (var t = e + "=", a = decodeURIComponent(document.cookie).split(";"), r = 0; r < a.length; r++) {
            for (var n = a[r]; " " == n.charAt(0);)
                n = n.substring(1);
            if (0 == n.indexOf(t))
                return n.substring(t.length, n.length)
        }
        return ""
    }
    static compareValueArrays(e, t) {
        for (var a = 0, r = 0; r < e.length; r++)
            if (0 !== (a = Util.compareValues(e[r], t[r])))
                return a;
        return a
    }
    static compareValues(e, t) {
        return "" === e || "" === t || isNaN(e) || isNaN(t) ? e.toString().localeCompare(t) : e - t
    }
    static scrollIntoViewById(e) {
        document.getElementById(e).scrollIntoView()
    }
    static calculatePercentage(e, t) {
        return Math.round(e / t * 100)
    }
    static calculateProgress(e, t, a) {
        return Math.abs(a - e) / Math.abs(t - e) * 100
    }
    static stDev(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const a = e.reduce((e, t) => e + t, 0) / e.length;
        return Math.sqrt(e.reduce((e, t) => e.concat((t - a) ** 2), []).reduce((e, t) => e + t, 0) / (e.length - (t ? 0 : 1)))
    }
    static hasNonZeroValues(e) {
        for (let t = 0; t < e.length; t++) {
            const a = e[t];
            if (!isNaN(a) && 0 != a)
                return !0
        }
        return !1
    }
    static encodeSpace(e) {
        return encodeURIComponent(e).replace(/%20/g, "+")
    }
    static kebabCaseToCamelCase(e) {
        return e.toLowerCase().replace(/([-][a-z])/g, e => e.toUpperCase().replace("-", ""))
    }
    static camelCaseToKebabCase(e) {
        return e.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (e, t) => (t ? "-" : "") + e.toLowerCase())
    }
    static snakeCaseToCamelCase(e) {
        return e.toLowerCase().replace(/[-_][a-z]/g, e => e.slice(-1).toUpperCase())
    }
    static calculateRank(e, t) {
        return (e.meta.page - 1) * e.meta.perPage + t + 1
    }
    static translateUnderscore(e) {
        return e.replace(/_/g, " ").trim()
    }
    static addStringTail(e, t, a) {
        const r = Math.max(...t.map(e => e.length));
        return e + Array(r - e.length).fill(a).join("")
    }
    static needToUnmaskName(e, t, a) {
        return null != t || Util.BARCODE_REGEX.test(e) && !Util.isFakeBattleTag(a)
    }
    static unmaskName(e) {
        const t = e.character.name.substring(0, e.character.name.indexOf("#"))
            , a = e.clan ? e.clan.tag : null;
        return null != e.proNickname ? {
            maskedName: t,
            maskedTeam: a,
            unmaskedName: e.proNickname,
            unmaskedTeam: e.proTeam ? e.proTeam : a
        } : {
            maskedName: t,
            maskedTeam: a,
            unmaskedName: Util.needToUnmaskName(t, e.proNickname, e.account.battleTag) ? e.account.battleTag.substring(0, e.account.battleTag.indexOf("#")) : t,
            unmaskedTeam: a
        }
    }
    static isUndefinedRank(e) {
        return !e
    }
    static isFakeBattleTag(e) {
        return e.startsWith("f#")
    }
    static escapeHtml(e) {
        return String(e).replace(/[&<>"'`=\/]/g, function (e) {
            return entityMap[e]
        })
    }
    static parseIsoDate(e) {
        const t = e.split("-");
        return new Date(t[0], t[1] - 1, t[2])
    }
    static parseIsoDateTime(e) {
        return new Date(e)
    }
    static parseIsoDateOrDateTime(e) {
        return e.length == Util.ISO_DATE_STRING_LENGTH ? Util.parseIsoDate(e) : Util.parseIsoDateTime(e)
    }
    static currentISODateString() {
        return (new Date).toISOString().substring(0, 10)
    }
    static currentISODateTimeString() {
        return (new Date).toISOString()
    }
    static forObjectValues(e, t) {
        for (const [a, r] of Object.entries(e))
            null != r && ("object" != typeof r ? e[a] = t(r) : Util.forObjectValues(e[a], t));
        return e
    }
    static getCurrentPathInContext() {
        return "/" + window.location.pathname.substring(ROOT_CONTEXT_PATH.length)
    }
    static groupBy(e, t) {
        const a = new Map;
        return e.forEach(e => {
            const r = t(e)
                , n = a.get(r);
            n ? n.push(e) : a.set(r, [e])
        }
        ),
            a
    }
    static groupByObject(e, t) {
        const a = {};
        return e.forEach(e => {
            const r = t(e);
            let n = a;
            r.forEach(e => {
                let t = n[e];
                t || (t = {},
                    n[e] = t),
                    n = t
            }
            ),
                null == n.values && (n.values = []),
                n.values.push(e)
        }
        ),
            a
    }
    static emptyClone(e) {
        const t = {};
        for (const a of Object.keys(e))
            t[a] = null;
        return t
    }
    static addObjects(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        null == t && (t = Array.from(Object.keys(e[0])));
        const a = {};
        return t.forEach(e => a[e] = null),
            e.forEach(e => t.forEach(t => a[t] += e[t])),
            a
    }
    static addObjectColumns(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        if (0 == e.length)
            return [];
        null == t && (t = Array.from(Object.keys(e[0][0])));
        const a = {};
        t.forEach(e => a[e] = null);
        const r = new Array(e[0].length);
        for (let n = 0; n < r.length; n++) {
            const o = e.map(e => e[n] ? e[n] : a);
            r[n] = Util.addObjects(o, t)
        }
        return r
    }
    static mergeObjects(e, t, a) {
        const r = new Array(Math.ceil(e.length / a));
        for (let n = 0; n < r.length; n++)
            r[n] = Util.addObjects(e.slice(n * a, Math.min(n * a + a, e.length)), t);
        return r
    }
    static concatObject(e, t) {
        for (const [a, r] of Object.entries(e))
            if (Array.isArray(r))
                null == t[a] && (t[a] = []),
                    t[a] = t[a].concat(r);
            else if ("object" == typeof r) {
                null == t[a] && (t[a] = {});
                for (const [e, n] of Object.entries(r))
                    t[a][e] = n
            } else
                t[a] = r
    }
    static toMap(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : e => e;
        const r = new Map;
        return e.forEach(e => {
            r.set(t(e), a(e))
        }
        ),
            r
    }
    static addAllCollections(e, t) {
        for (const [a, r] of Object.entries(e))
            if (r instanceof Map) {
                t[a] || (t[a] = new Map);
                for (const [e, n] of r.entries())
                    t[a].set(e, n)
            } else
                r instanceof Array && (t[a] || (t[a] = []),
                    t[a] = t[a].concat(r));
        return t
    }
    static getRandomRgbColorString() {
        return "rgb(" + Math.floor(255 * Math.random()) + "," + Math.floor(255 * Math.random()) + "," + Math.floor(255 * Math.random()) + ")"
    }
    static getTeamFormatAndTeamTypeString(e, t) {
        return e.name + (e == TEAM_FORMAT._1V1 ? "" : " " + t.secondaryName)
    }
    static isMobile() {
        return navigator.maxTouchPoints || "ontouchstart" in document.documentElement
    }
    static formatDateTimes() {
        document.querySelectorAll(".datetime-iso").forEach(e => {
            e.textContent = Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e.textContent)),
                e.classList.remove("datetime-iso")
        }
        )
    }
    static changeFullRgbaAlpha(e, t) {
        return e.startsWith("rgba") ? e.replace("1)", t + ")") : e
    }
    static divideColor(e, t) {
        const a = e.substring(e.indexOf("(") + 1, e.length - 1).split(",");
        for (let e = 0; e < 3; e++)
            a[e] = Math.round(a[e].trim() / t);
        return (4 == a.length ? "rgba(" : "rgb(") + a.join() + ")"
    }
    static addCsrfHeader(e) {
        return e.headers || (e.headers = {}),
            e.headers["X-XSRF-TOKEN"] = Util.getCookie("XSRF-TOKEN"),
            e
    }
    static matchUpComparator(e, t) {
        const a = e.split("v");
        a[0] = EnumUtil.enumOfNamePrefix(a[0], RACE),
            a[1] = EnumUtil.enumOfNamePrefix(a[1], RACE);
        const r = t.split("v");
        r[0] = EnumUtil.enumOfNamePrefix(r[0], RACE),
            r[1] = EnumUtil.enumOfNamePrefix(r[1], RACE);
        const n = a[0].order - r[0].order;
        return 0 != n ? n : a[1].order - r[1].order
    }
    static cloneObject(e) {
        return Object.assign({}, e)
    }
    static addParams(e, t, a) {
        if (a)
            for (const r of a)
                e.append(t, r)
    }
    static convertFakeName(e, t) {
        return t == FAKE_NAME ? e.character.id : t
    }
    static reload(e) {
        let t = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        ElementUtil.INPUT_TIMEOUTS.set(e, window.setTimeout(a => {
            !t || Session.currentRequests < 1 ? document.location.reload() : Util.reload(e)
        }
            , SC2Restful.REDIRECT_PAGE_TIMEOUT_MILLIS))
    }
    static rectContains(e, t, a) {
        return e.x <= t && t <= e.x + e.width && e.y <= a && a <= e.y + e.height
    }
    static countryCodeToEmoji(e) {
        const t = [...e].map(e => e.codePointAt() + 127397);
        return String.fromCodePoint(...t)
    }
    static load(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        return ElementUtil.executeTask(e.id, () => Util.doLoad(e, t, a))
    }
    static doLoad(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        return e.classList.contains(LOADING_STATUS.COMPLETE.className) || e.classList.contains(LOADING_STATUS.IN_PROGRESS.className) ? Promise.resolve() : (ElementUtil.setLoadingIndicator(e, LOADING_STATUS.IN_PROGRESS),
            t().then(r => {
                if (ElementUtil.setLoadingIndicator(e, r.status),
                    r.status != LOADING_STATUS.COMPLETE && r.status != LOADING_STATUS.ERROR) {
                    const r = e.querySelector(":scope .indicator-loading-scroll-infinite");
                    if (r && ElementUtil.isElementVisible(r) && ElementUtil.rectContainsRect(ElementUtil.getInfiniteScrollViewportRect(), r.getBoundingClientRect()))
                        return Util.doLoad(e, t, a)
                }
                return r
            }
            ).catch(t => {
                ElementUtil.setLoadingIndicator(e, LOADING_STATUS.ERROR),
                    1 != DEBUG || a || console.log(t),
                    a && Util.showGlobalError(t)
            }
            ))
    }
    static resetLoadingIndicatorTree(e) {
        return Promise.allSettled([Util.resetLoadingIndicator(e), Util.resetNestedLoadingIndicators(e)])
    }
    static resetNestedLoadingIndicators(e) {
        return Promise.allSettled(Array.from(e.querySelectorAll(".container-loading")).map(Util.resetLoadingIndicator))
    }
    static resetLoadingIndicator(e) {
        return ElementUtil.executeTask(e.id, () => ElementUtil.setLoadingIndicator(e, LOADING_STATUS.NONE))
    }
    static getAllSettledLoadingStatus(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : LOADING_STATUS.COMPLETE;
        return e.some(e => "rejected" === e.status) ? LOADING_STATUS.ERROR : t
    }
    static throwFirstSettledError(e) {
        const t = e.map(e => e.reason).find(e => null != e);
        if (null != t)
            throw 1 == DEBUG && console.log(t),
            new Error(t)
    }
    static getHrefUrlSearchParams(e) {
        const t = e.getAttribute("href")
            , a = t.indexOf("?");
        if (-1 == a)
            return new URLSearchParams;
        const r = t.indexOf("#");
        return new URLSearchParams(t.substring(a, r > 0 ? r : t.length))
    }
    static deleteSearchParams(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : ["type", "m"];
        for (const a of t)
            e.delete(a);
        return e
    }
    static getPreferredLanguages() {
        return window.navigator.languages || [window.navigator.language || window.navigator.userLanguage]
    }
    static parseMatchUp(e) {
        const t = e.split("v");
        return [EnumUtil.enumOfNamePrefix(t[0], RACE), EnumUtil.enumOfNamePrefix(t[1], RACE)]
    }
    static isErrorDetails(e) {
        return null != e && null != e.status && null != e.type
    }
    static getLeagueRange(e, t) {
        if (e <= SC2Restful.GM_COUNT)
            return {
                league: LEAGUE.GRANDMASTER,
                tierType: 0
            };
        const a = e / t * 100;
        return Object.values(TIER_RANGE).find(e => a <= e.bottomThreshold)
    }
}
Util.HTML_ENTITY_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;"
},
    Util.BARCODE_REGEX = new RegExp("^[lI]+$"),
    Util.SECURE_URI_REGEX = new RegExp(/^(?!.*[%;/\\])(?!^(\.)\1*$).*$/),
    Util.NUMBER_FORMAT = new Intl.NumberFormat(navigator.language),
    Util.NUMBER_FORMAT_DIFF = new Intl.NumberFormat(navigator.language, {
        signDisplay: "exceptZero"
    }),
    Util.DECIMAL_FORMAT = new Intl.NumberFormat(navigator.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }),
    Util.MONTH_DATE_FORMAT = new Intl.DateTimeFormat(navigator.language, {
        month: "2-digit",
        year: "numeric"
    }),
    Util.DATE_OPTIONS = Object.freeze({
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }),
    Util.DATE_FORMAT = new Intl.DateTimeFormat(navigator.language, Util.DATE_OPTIONS),
    Util.DATE_TIME_OPTIONS = Object.freeze({
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }),
    Util.DATE_TIME_FORMAT = new Intl.DateTimeFormat(navigator.language, Util.DATE_TIME_OPTIONS),
    Util.DAY_MILLIS = 864e5,
    Util.ISO_DATE_STRING_LENGTH = 10,
    Util.ERROR_MESSAGES = new Map([["409", "409 Conflict. The entity has already been modified by someone else. Please reload the entity and verify changes."]]),
    Util.LANGUAGE_NAMES = new Intl.DisplayNames([], {
        type: "language"
    });
class BootstrapUtil {
    static init() {
        $.fn.popover.Constructor.Default.whiteList.table = [],
            $.fn.popover.Constructor.Default.whiteList.tr = [],
            $.fn.popover.Constructor.Default.whiteList.th = [],
            $.fn.popover.Constructor.Default.whiteList.td = [],
            $.fn.popover.Constructor.Default.whiteList.div = [],
            $.fn.popover.Constructor.Default.whiteList.tbody = [],
            $.fn.popover.Constructor.Default.whiteList.thead = [],
            document.querySelectorAll(".stop-propagation *").forEach(e => e.addEventListener("click", e => e.stopPropagation())),
            document.querySelectorAll(".dropdown-menu .close").forEach(e => e.addEventListener("click", e => $(e.currentTarget.closest(".btn-group").querySelector(":scope .dropdown-toggle")).dropdown("toggle")))
    }
    static enhanceTabs() {
        $(".nav-pills a").on("show.bs.tab", BootstrapUtil.onTabShow).on("shown.bs.tab", BootstrapUtil.onTabShown);
        for (const e of document.querySelectorAll("#stats .nav-pills a"))
            ElementUtil.TITLE_CONSTRUCTORS.set(e.getAttribute("data-target"), ElementUtil.generateLadderTitle),
                ElementUtil.DESCRIPTION_CONSTRUCTORS.set(e.getAttribute("data-target"), ElementUtil.generateLadderDescription);
        for (const e of document.querySelectorAll("#player-info .nav-pills a"))
            ElementUtil.TITLE_CONSTRUCTORS.set(e.getAttribute("data-target"), ElementUtil.generateCharacterTitle),
                ElementUtil.DESCRIPTION_CONSTRUCTORS.set(e.getAttribute("data-target"), ElementUtil.generateCharacterDescription);
        for (const e of document.querySelectorAll("#group .nav-pills a"))
            ElementUtil.TITLE_CONSTRUCTORS.set(e.getAttribute("data-target"), GroupUtil.generatePageTitle);
        ElementUtil.TITLE_CONSTRUCTORS.set("#online", ElementUtil.generateOnlineTitle),
            ElementUtil.TITLE_CONSTRUCTORS.set("#team-mmr-history", TeamUtil.generateTeamMmrTitle),
            ElementUtil.DESCRIPTION_CONSTRUCTORS.set("#team-mmr-history", TeamUtil.generateTeamMmrDescription),
            ElementUtil.TITLE_CONSTRUCTORS.set("#team-mmr-teams", TeamUtil.generateTeamMmrTitle),
            ElementUtil.TITLE_CONSTRUCTORS.set("#versus", VersusUtil.generateVersusTitle)
    }
    static renderTabContent(e) {
        ChartUtil.updateChartableTab(e)
    }
    static showTab(e) {
        const t = document.getElementById(e);
        if (t.classList.contains("active"))
            return Promise.resolve();
        if (!ElementUtil.isElementVisible(t))
            return $(t).tab("show"),
                Promise.resolve();
        const a = new Promise((e, a) => ElementUtil.ELEMENT_RESOLVERS.set(t.getAttribute("data-target").substring(1), e));
        return $(t).tab("show"),
            a
    }
    static onTabShow(e) {
        BootstrapUtil.renderTabContent(e.target)
    }
    static onTabShown(e) {
        const t = e.target.getAttribute("data-target");
        if (ElementUtil.resolveElementPromise(t.substring(1)),
            Session.isHistorical)
            return;
        e.target.closest(".modal") || (Session.isHistorical = !0,
            Session.lastNonModalScroll = 0,
            BootstrapUtil.hideActiveModal(),
            Session.isHistorical = !1);
        const a = new URLSearchParams
            , r = e.target.closest(".modal")
            , n = null != r ? "#" + r.id : "body";
        for (const e of document.querySelectorAll(n + " .nav-pills a.active"))
            (e.getAttribute("data-ignore-visibility") || ElementUtil.isElementVisible(e)) && a.append("t", e.getAttribute("data-target").substring(1));
        const o = a.getAll("t");
        if (0 == o.length)
            return;
        const l = null != r ? "#" + r.id : document.querySelector(t).classList.contains("root") ? t : 1 == o.length ? "#" + o[0] : "#" + o[o.length - 2]
            , s = "#" + o[o.length - 1];
        ElementUtil.setMainContent(s),
            document.querySelectorAll(t + " .c-autofocus").forEach(e => FormUtil.selectAndFocusOnInput(e, !0));
        const i = Session.sectionParams.get(l)
            , c = new URLSearchParams(null == i ? "" : i)
            , d = HistoryUtil.getDeepestTabId(document.querySelector(null != r ? "#" + r.id : "body"));
        ElementUtil.updateTitleAndDescription(c, "#" + d, s),
            HistoryUtil.pushState({}, document.title, HistoryUtil.formatSearchString(c.toString(), d))
    }
    static deactivateInvalidTabs(e) {
        e.querySelectorAll(':scope .nav-link.active[aria-selected="false"]').forEach(e => e.classList.remove("active"))
    }
    static hideCollapsible(e) {
        return new Promise((t, a) => {
            const r = document.getElementById(e);
            ElementUtil.isElementVisible(r) ? (ElementUtil.ELEMENT_RESOLVERS.set(ElementUtil.NEGATION_PREFIX + e, t),
                $(r).collapse("hide")) : ($(r).collapse("hide"),
                    t())
        }
        )
    }
    static showGenericModal(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : ""
            , a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = document.querySelector("#modal-generic");
        return r.querySelector(":scope .modal-title .title-text").textContent = e,
            a ? r.querySelector(":scope .modal-title .spinner-border").classList.remove("d-none") : r.querySelector(":scope .modal-title .spinner-border").classList.add("d-none"),
            r.querySelector(":scope .modal-body").textContent = t,
            r.setAttribute("data-view-title", e),
            BootstrapUtil.showModal("modal-generic")
    }
    static showModal(e) {
        const t = document.getElementById(e)
            , a = []
            , r = [];
        if (t.classList.contains("no-popup")) {
            const n = document.querySelector(".modal.no-popup.show");
            n && n.id != e && (Session.nonPopupSwitch = !0,
                a.push(BootstrapUtil.hideActiveModal())),
                r.push(a => new Promise((a, r) => {
                    Session.lastNonModalScroll = window.pageYOffset,
                        document.body.classList.add("modal-open-no-popup"),
                        document.getElementById(e).classList.remove("d-none"),
                        document.querySelectorAll(".no-popup-hide").forEach(e => e.classList.add("d-none")),
                        t.scrollIntoView(),
                        a()
                }
                ))
        }
        return Promise.all(a).then(e => {
            const t = [];
            for (const e of r)
                t.push(e());
            return Promise.all(t)
        }
        ).then(a => new Promise((a, r) => {
            t.classList.contains("show") ? (BootstrapUtil.onModalShow(t),
                BootstrapUtil.onModalShown(t),
                a()) : (ElementUtil.ELEMENT_RESOLVERS.set(e, a),
                    $(t).modal())
        }
        ))
    }
    static hideActiveModal() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
        return new Promise((t, a) => {
            const r = document.querySelector(".modal.show");
            null != r ? e.includes(r.id) ? t() : (ElementUtil.ELEMENT_RESOLVERS.set(r.id, t),
                $(r).modal("hide")) : t()
        }
        )
    }
    static enhanceEmbedBackdropCloseControls() {
        const e = document.querySelector("#embed-backdrop-close");
        e && e.addEventListener("click", e => window.setTimeout(BootstrapUtil.updateEmbedBackdropClose, 1))
    }
    static updateEmbedBackdropClose() {
        const e = "true" == localStorage.getItem("embed-backdrop-close");
        document.querySelectorAll(".section-side").forEach(t => {
            e ? (t.addEventListener("click", BootstrapUtil.onModalBackdropClose),
                t.classList.add("backdrop")) : (t.removeEventListener("click", BootstrapUtil.onModalBackdropClose),
                    t.classList.remove("backdrop"))
        }
        )
    }
    static onModalBackdropClose(e) {
        BootstrapUtil.hideActiveModal()
    }
    static enhanceModals() {
        document.querySelectorAll(".modal.no-popup").forEach(e => {
            e.classList.add("d-none", "mb-3"),
                e.classList.remove("fade"),
                e.setAttribute("data-backdrop", "false")
        }
        ),
            BootstrapUtil.updateEmbedBackdropClose(),
            $(".modal").on("hidden.bs.modal", e => {
                if (ElementUtil.resolveElementPromise(e.target.id),
                    !Session.isHistorical && !e.target.classList.contains("c-no-history")) {
                    if (Session.nonPopupSwitch) {
                        const e = Session.titleAndUrlHistory[Session.titleAndUrlHistory.length - 1];
                        HistoryUtil.pushState({}, e[0], e[1]),
                            document.title = e[0]
                    } else
                        HistoryUtil.pushState({}, Session.lastNonModalTitle, Session.lastNonModalParams),
                            document.title = Session.lastNonModalTitle;
                    e.target.classList.contains("no-popup") && HistoryUtil.showAnchoredTabs(!0),
                        Util.isMobile() || document.querySelectorAll(".tab-pane.active.show .c-autofocus").forEach(e => FormUtil.selectAndFocusOnInput(e, !0))
                }
                Session.nonPopupSwitch = !1
            }
            ).on("hide.bs.modal", e => {
                e.target.classList.contains("no-popup") && (document.querySelectorAll(".no-popup-hide").forEach(e => e.classList.remove("d-none")),
                    document.body.classList.remove("modal-open-no-popup"),
                    document.querySelectorAll(".backdrop").forEach(e => e.classList.remove("backdrop-active")),
                    e.target.classList.add("d-none"),
                    window.scrollBy(0, Session.lastNonModalScroll))
            }
            ).on("show.bs.modal", e => {
                BootstrapUtil.onModalShow(e.currentTarget)
            }
            ).on("shown.bs.modal", e => {
                BootstrapUtil.onModalShown(e.currentTarget)
            }
            ),
            $("#error-session").on("shown.bs.modal", e => window.setTimeout(Session.doRenewBlizzardRegistration, 3500)),
            $("#application-version-update").on("shown.bs.modal", e => Util.reload("application-version-update")),
            document.querySelectorAll(".modal .modal-header .close-left").forEach(e => e.addEventListener("click", e => history.back())),
            BootstrapUtil.enhanceConfirmationModal()
    }
    static onModalShow(e) { }
    static onModalShown(e) {
        if (!e.classList.contains("c-no-history")) {
            Session.isHistorical || null == e.getAttribute("data-modal-singleton") || HistoryUtil.pushState({}, e.getAttribute("data-view-title"), "?type=modal&id=" + e.id + "&m=1"),
                Session.isHistorical || HistoryUtil.updateActiveTabs(),
                e.classList.contains("no-popup") && (document.querySelectorAll("#main-tabs .nav-link.active").forEach(e => e.classList.remove("active")),
                    "true" == localStorage.getItem("embed-backdrop-close") && document.querySelectorAll(".backdrop").forEach(e => e.classList.add("backdrop-active")));
            const t = HistoryUtil.previousTitleAndUrl();
            t[1].includes("m=1") || (Session.lastNonModalTitle = t[0],
                Session.lastNonModalParams = t[1])
        }
        e.querySelectorAll(":scope nav").forEach(BootstrapUtil.deactivateInvalidTabs),
            ElementUtil.autofocus(e),
            ElementUtil.resolveElementPromise(e.id)
    }
    static enhanceCollapsibles() {
        $(".collapse").on("hidden.bs.collapse", e => ElementUtil.resolveElementPromise(ElementUtil.NEGATION_PREFIX + e.target.id))
    }
    static collapseOnCondition() {
        const e = Util.isMobile();
        document.querySelectorAll(".collapse[data-collapse-on]").forEach(t => {
            const a = t.getAttribute("data-collapse-on");
            ("mobile" == a && e || "desktop" == a && !e) && BootstrapUtil.hideCollapsible(t.id)
        }
        )
    }
    static setFormCollapsibleScroll(e) {
        $(document.getElementById(e)).on("show.bs.collapse", function (e) {
            const t = e.currentTarget.getAttribute("data-scroll-to");
            null != t && Util.scrollIntoViewById(t)
        })
    }
    static enhanceTabSelect(e, t) {
        return e.addEventListener("change", e => $(document.getElementById(e.target.options[e.target.selectedIndex].getAttribute("data-tab"))).tab("show")),
            e
    }
    static enhanceTooltips() {
        $("body").tooltip({
            html: !1,
            boundary: "body",
            placement: "auto",
            trigger: "hover",
            selector: '[data-toggle="tooltip"]',
            content: function () {
                return $(this).attr("title")
            }
        })
    }
    static addTooltip(e, t) {
        e.setAttribute("title", t),
            e.setAttribute("data-toggle", "tooltip")
    }
    static enhancePopovers() {
        $((arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "body") + ' [data-toggle="popover"]').popover()
    }
    static enhanceConfirmationModal() {
        const e = document.querySelector("#modal-confirmation")
            , t = $(e);
        t.on("hide.bs.modal", t => {
            BootstrapUtil.resetConfirmationModal(e)
        }
        ),
            t.on("shown.bs.modal", e => {
                document.querySelector("#modal-confirmation-input").focus()
            }
            ),
            e.querySelector("#modal-confirmation-form").addEventListener("submit", e => {
                e.preventDefault(),
                    Session.confirmAction && Session.confirmAction(!0),
                    $(document.querySelector("#modal-confirmation")).modal("hide")
            }
            ),
            e.querySelector("#modal-confirmation-input").addEventListener("input", e => {
                const t = document.querySelector("#modal-confirmation .btn-action");
                e.target.value == Session.confirmActionText ? t.removeAttribute("disabled") : t.setAttribute("disabled", "disabled")
            }
            )
    }
    static resetConfirmationModal(e) {
        Session.confirmAction && Session.confirmAction(!1),
            Session.confirmAction = null,
            Session.confirmActionText = null,
            document.querySelector("#modal-confirmation #modal-confirmation-input").value = null,
            document.querySelector("#modal-confirmation .btn-action").setAttribute("disabled", "disabled")
    }
    static showConfirmationModal(e, t, a, r) {
        const n = document.querySelector("#modal-confirmation");
        n.querySelector(":scope .description").textContent = t;
        const o = n.querySelector(":scope .btn-action");
        o.textContent = a,
            o.setAttribute("class", ""),
            o.classList.add("btn", "btn-action", r),
            n.querySelector(":scope .requirement").textContent = e,
            Session.confirmActionText = e;
        const l = new Promise((e, t) => {
            Session.confirmAction = e
        }
        );
        return $(n).modal(),
            l
    }
    static enhanceTabLinks() {
        document.querySelectorAll(".link-tab").forEach(BootstrapUtil.enhanceTabLink)
    }
    static enhanceTabLink(e) {
        e.addEventListener("click", BootstrapUtil.onTabLinkClick)
    }
    static onTabLinkClick(e) {
        const t = e.target.closest("[href]").getAttribute("href");
        if (!t)
            return;
        const a = t.substring(t.indexOf("#"));
        document.querySelector(a) && (e.preventDefault(),
            HistoryUtil.showAnchoredTabs(!1, a))
    }
    static appendDefaultInputValueTooltip(e, t) {
        const a = document.querySelector('label[for="' + e + '"] img[data-toggle="tooltip"]');
        a.setAttribute("title", a.getAttribute("title") + " Default: " + t)
    }
}
class ElementUtil {
    static resolveElementPromise(e) {
        const t = ElementUtil.ELEMENT_RESOLVERS.get(e);
        return null != t && (t(e),
            ElementUtil.ELEMENT_RESOLVERS.delete(e),
            !0)
    }
    static createTabList(e, t, a) {
        let r = arguments.length > 3 && void 0 !== arguments[3] && arguments[3];
        const n = document.createElement("nav")
            , o = document.createElement("div");
        o.classList.add("tab-content");
        const l = document.createElement("ul");
        l.classList.add("nav", "nav-pills", "mb-3", "justify-content-center"),
            l.setAttribute("role", "tablist"),
            n.appendChild(l),
            n.setAttribute("id", t + "-nav");
        for (let n = 0; n < e; n++) {
            const e = document.createElement("li");
            e.classList.add("nav-item");
            const s = document.createElement("a")
                , i = t + "-" + n;
            s.classList.add("nav-link"),
                s.setAttribute("id", i + "-link"),
                s.setAttribute("data-toggle", "pill"),
                s.setAttribute("href", "#" + i),
                s.setAttribute("data-target", "#" + i),
                s.setAttribute("role", "tab"),
                s.setAttribute("aria-controls", i),
                s.setAttribute("aria-selected", "false"),
                $(s).on("click", function (e) {
                    e.preventDefault(),
                        $(this).tab("show")
                }),
                e.appendChild(s),
                l.appendChild(e);
            const c = document.createElement("section");
            c.setAttribute("id", i),
                c.classList.add("tab-pane"),
                r && c.classList.add("fade");
            const d = document.createElement("h" + a);
            c.appendChild(d),
                o.appendChild(c)
        }
        return {
            nav: n,
            pane: o
        }
    }
    static updateTabSelect(e, t) {
        ElementUtil.removeChildren(e);
        for (const a of t)
            if (!a.classList.contains("d-none")) {
                const t = a.getElementsByClassName("nav-link")[0]
                    , r = document.createElement("option");
                r.textContent = t.textContent,
                    r.value = t.textContent,
                    r.setAttribute("data-tab", t.getAttribute("id")),
                    e.appendChild(r),
                    "true" == t.getAttribute("aria-selected") && (e.value = r.value)
            }
    }
    static createImage(e, t, a, r) {
        let n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : r
            , o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : "svg";
        const l = document.createElement("img");
        return l.setAttribute("src", "".concat(RESOURCE_PATH, "icon/").concat(e).concat(t, ".").concat(o)),
            ElementUtil.setImageAttributes(l, t, a, r, n),
            l
    }
    static createCustomImage(e, t, a, r, n) {
        let o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : n;
        const l = document.createElement("img");
        return l.setAttribute("src", "".concat(RESOURCE_PATH, "icon/").concat(e).concat(t, ".").concat(a)),
            ElementUtil.setImageAttributes(l, t, r, n, o),
            l
    }
    static setImageAttributes(e, t, a, r) {
        let n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : r;
        return e.setAttribute("alt", t),
            e.setAttribute("title", t),
            e.setAttribute("class", a),
            r && (e.width = r,
                e.height = n),
            e
    }
    static createNoRaceImage() {
        const e = document.createElement("span");
        return e.classList.add("race-percentage", "race-percentage-none", "text-secondary", "table-image", "table-image-square"),
            e.setAttribute("title", "no specific race"),
            e
    }
    static createRaceImage(e) {
        return null != e ? SC2Restful.IMAGES.get(e.name.toLowerCase()).cloneNode() : ElementUtil.createNoRaceImage()
    }
    static createIcoFontElement(e, t, a, r) {
        const n = document.createElement("span");
        if (null != a && n.setAttribute("class", a),
            n.classList.add("icofont-" + e),
            n.setAttribute("title", t || e),
            null != r)
            for (const [e, t] of r)
                n.setAttribute(e, t);
        return n
    }
    static createTagButton(e, t) {
        const a = document.createElement(e);
        return a.setAttribute("role", "button"),
            a.setAttribute("class", t),
            a
    }
    static setElementsVisibility(e, t) {
        for (const a of e) {
            const e = "hide" === a.getAttribute("data-hide-mode") ? "invisible" : "d-none";
            t ? a.classList.remove(e) : a.classList.add(e)
        }
    }
    static disableElements(e, t) {
        for (var a = 0; a < e.length; a++)
            t ? e[a].setAttribute("disabled", "disabled") : e[a].removeAttribute("disabled")
    }
    static removeChildren(e) {
        for (; e.hasChildNodes();)
            e.removeChild(e.lastChild)
    }
    static createPlayerStatsCards(e) {
        for (const t of Object.values(TEAM_FORMAT))
            for (const a of Object.values(TEAM_TYPE))
                e.appendChild(ElementUtil.createPlayerStatsCard(t, a))
    }
    static createPlayerStatsCard(e, t) {
        const a = document.createElement("div");
        a.classList.add("card", "card-equal", "player-stats-section", "player-stats-dynamic", "mb-3"),
            a.setAttribute("id", "player-stats-" + e.name + "-" + t.name);
        const r = document.createElement("div");
        r.classList.add("card-body"),
            a.appendChild(r);
        const n = document.createElement("h4");
        n.textContent = Util.getTeamFormatAndTeamTypeString(e, t),
            n.classList.add("card-title");
        const o = TableUtil.createTable(["Race", "Best League", "Best MMR", "Total Games", "Last MMR", "Last Games"], !0);
        o.classList.add("player-stats-table");
        const l = document.createElement("caption");
        l.appendChild(n),
            o.querySelector(":scope table").prepend(l);
        const s = o.getElementsByTagName("tbody")[0];
        for (const e of Object.values(RACE))
            s.appendChild(ElementUtil.createPlayerStatsRaceRow(e.name));
        return s.appendChild(ElementUtil.createPlayerStatsRaceRow("all")),
            r.appendChild(o),
            a
    }
    static createPlayerStatsRaceRow(e) {
        const t = document.createElement("tr");
        t.classList.add("player-stats-" + e, "player-stats-dynamic");
        const a = TableUtil.createRowTh(t);
        return a.classList.add("player-stats-race", "player-stats-" + e + "-race"),
            "all" === e ? a.appendChild(ElementUtil.createNoRaceImage()) : a.appendChild(ElementUtil.createImage("race/", e, "table-image table-image-square")),
            t.insertCell().classList.add("player-stats-league", "player-stats-" + e + "-league"),
            t.insertCell().classList.add("player-stats-mmr", "player-stats-" + e + "-mmr"),
            t.insertCell().classList.add("player-stats-games", "player-stats-" + e + "-games"),
            t.insertCell().classList.add("player-stats-mmr", "player-stats-" + e + "-mmr-current"),
            t.insertCell().classList.add("player-stats-games", "player-stats-" + e + "-games-current"),
            t
    }
    static getTabTitle(e) {
        return null == e ? "" : document.querySelector(e).getAttribute("data-view-title")
    }
    static generateLadderTitle(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        return "".concat(Util.getTeamFormatAndTeamTypeString(Session.currentTeamFormat, Session.currentTeamType), " ").concat(ElementUtil.getTabTitle(t)).concat(a ? ", " + Session.currentSeasons.find(e => e.battlenetId == Session.currentSeason).descriptiveName : "")
    }
    static generateCharacterTitle(e, t) {
        const a = document.querySelector("#player-info-title-clan")
            , r = document.querySelector("#player-info-title-team")
            , n = document.querySelector("#player-info-title-clan-additional")
            , o = document.querySelector("#player-info-title-name").textContent
            , l = a.classList.contains("d-none") ? "" : "[" + a.textContent + "]"
            , s = r.classList.contains("d-none") ? "" : "[" + r.textContent + "]"
            , i = n.classList.contains("d-none") ? "" : "[" + n.textContent + "]"
            , c = document.querySelector("#player-info-title-name-additional").textContent;
        return "".concat(l).concat(s).concat(o, "(").concat(i).concat(c, ") ").concat(ElementUtil.getTabTitle(t))
    }
    static generateOnlineTitle(e, t) {
        if (!e.get("to") || !e.get("period"))
            return "Online";
        const a = new Date(parseInt(e.get("to")))
            , r = EnumUtil.enumOfName(e.get("period"), PERIOD);
        var n = new Date(a.getTime());
        switch (r) {
            case PERIOD.DAY:
                n.setDate(a.getDate() - 1);
                break;
            case PERIOD.WEEK:
                n.setDate(a.getDate() - 7);
                break;
            case PERIOD.MONTH:
                n.setMonth(a.getMonth() - 1)
        }
        return "Online ".concat(n.toISOString(), " - ").concat(a.toISOString())
    }
    static generateLadderDescription(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]
            , r = ElementUtil.getTabTitle(t);
        if ("MMR Ladder" == r) {
            const t = 100 * (e.get("page") + e.get("count") - 1) + 1;
            r += ", rank " + t + "-" + (t + 99)
        }
        r += ". Regions: ";
        let n = !1;
        for (const t of Object.values(REGION))
            e.get(t.name) && (n && (r += ", "),
                r += t.name,
                n = !0);
        let o = !1;
        r += ". Leagues: ";
        for (const t of Object.values(LEAGUE))
            e.get(t.name.substring(0, 3)) && (o && (r += ", "),
                r += t.name,
                o = !0);
        return r += ". " + Session.currentTeamType.secondaryName + " " + Session.currentTeamFormat.name + (a ? ", " + Session.currentSeasons.find(e => e.battlenetId == Session.currentSeason).descriptiveName : "") + ".",
            r
    }
    static generateCharacterDescription(e, t) {
        const a = document.querySelector("#player-info-title-name").textContent
            , r = document.querySelector("#link-battletag span").textContent;
        return "".concat(a, "/").concat(r, " career best MMR for all brackets/races, all seasons teams, mmr history, profile links. Social media links, match history, personal info for pro players")
    }
    static generateGenericTitle(e, t, a, r, n) {
        const o = e.get(r);
        return null != o ? o(t, a) : document.querySelector(r).getAttribute("data-view-" + n) || document.querySelector(r).getAttribute("data-view-title")
    }
    static updateTitleAndDescription(e, t, a) {
        const r = ElementUtil.generateGenericTitle(ElementUtil.TITLE_CONSTRUCTORS, e, t, a, "title");
        document.title = r ? r + " - " + SC2Restful.SITE_NAME : SC2Restful.SITE_NAME,
            document.querySelector('meta[name="description"]').setAttribute("content", ElementUtil.generateGenericTitle(ElementUtil.DESCRIPTION_CONSTRUCTORS, e, t, a, "description"))
    }
    static setMainContent(e) {
        for (const e of document.querySelectorAll('*[role="main"]'))
            e.removeAttribute("role");
        document.querySelector(e).setAttribute("role", "main")
    }
    static removeNofollowRels(e) {
        for (const t of document.getElementById(e).querySelectorAll(':scope a[rel~="nofollow"]'))
            t.relList.remove("nofollow")
    }
    static removeParentAndChildrenAttributes(e, t) {
        for (const a of t) {
            e.removeAttribute(a);
            for (const t of e.querySelectorAll(":scope [" + a + "]"))
                t.removeAttribute(a)
        }
    }
    static enhanceFullscreenToggles() {
        for (const e of document.querySelectorAll(".fullscreen-toggle"))
            e.addEventListener("click", ElementUtil.onFullScreenToggle)
    }
    static onFullScreenToggle(e) {
        if (null == document.fullscreenElement) {
            const t = document.getElementById(e.target.getAttribute("data-target"));
            for (const e of document.querySelectorAll(".fullscreen-required"))
                t.prepend(e);
            t.requestFullscreen()
        } else {
            for (const e of document.querySelectorAll(".fullscreen-required"))
                document.querySelector(e.getAttribute("data-original-parent")).appendChild(e);
            document.exitFullscreen()
        }
    }
    static changeInputValue(e, t) {
        let a = !1;
        switch (e.getAttribute("type")) {
            case "date":
                if (t.indexOf("-") > 0)
                    e.value = t;
                else {
                    const r = new Date(parseInt(t));
                    e.getAttribute("data-exclusive") && r.setDate(r.getDate() - 1);
                    const n = r.getTime() - 60 * (new Date).getTimezoneOffset() * 1e3;
                    e.valueAsNumber != n && (e.valueAsNumber = n,
                        a = !0)
                }
                break;
            case "checkbox":
            case "radio":
                e.checked != t && (e.checked = t,
                    a = !0);
                break;
            default:
                String(e.value) !== String(t) && (e.value = t,
                    a = !0)
        }
        a && e.dispatchEvent(new Event("change"))
    }
    static createCheaterFlag(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const a = document.createElement(t ? "button" : "span");
        return a.classList.add("player-flag", "player-flag-class-cheater", "player-flag-" + e.name),
            a.textContent = e.name.toUpperCase(),
            a.title = e.description,
            t && (a.classList.add("btn", "btn-outline-" + e.cssClass),
                ElementUtil.addPlayerReportFlagAttributes(a)),
            a
    }
    static addPlayerReportFlagAttributes(e) {
        return e.setAttribute("data-toggle", "collapse"),
            e.setAttribute("data-target", "#character-reports"),
            e.setAttribute("aria-expanded", "false"),
            e.setAttribute("aria-controls", "character-reports"),
            e
    }
    static createProFlag() {
        const e = document.createElement("span");
        return e.classList.add("player-flag", "player-flag-pro"),
            e.textContent = "revealed",
            e.title = "This player has been identified by sc2revealed.com or pulse.",
            e
    }
    static createElement(e, t, a) {
        let r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : null
            , n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : [];
        const o = document.createElement(e);
        t && (o.id = t),
            a && o.setAttribute("class", a),
            null != r && (o.textContent = r);
        for (const [e, t] of n)
            o.setAttribute(e, t);
        return o
    }
    static createDataList(e) {
        const t = document.createElement("datalist");
        return e.forEach(e => {
            const a = document.createElement("option");
            a.setAttribute("value", e),
                t.appendChild(a)
        }
        ),
            t
    }
    static clearInputTimeout(e) {
        const t = ElementUtil.INPUT_TIMEOUTS.get(e);
        t && (window.clearTimeout(t),
            ElementUtil.INPUT_TIMEOUTS.delete(e))
    }
    static clearAndSetInputTimeout(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : ElementUtil.INPUT_TIMEOUT;
        ElementUtil.clearInputTimeout(e),
            ElementUtil.INPUT_TIMEOUTS.set(e, window.setTimeout(t, a))
    }
    static enhanceCopyToClipboard() {
        document.querySelectorAll(".copy-to-clipboard").forEach(e => e.addEventListener("click", ElementUtil.copyToClipboard))
    }
    static copyToClipboard(e) {
        const t = e.target.textContent;
        return navigator.clipboard.writeText(t).then(a => {
            ElementUtil.clearInputTimeout(e.target);
            const r = $(e.target);
            return r.data("bs.tooltip") || r.tooltip({
                trigger: "manual",
                title: "Copied!"
            }),
                r.tooltip("show"),
                ElementUtil.INPUT_TIMEOUTS.set(e.target, window.setTimeout(t => $(e.target).tooltip("hide"), ElementUtil.MANUAL_TOOLTIP_TIMEOUT)),
                Promise.resolve(t)
        }
        )
    }
    static createProgressBar(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0
            , a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 100;
        const r = Util.calculateProgress(t, a, e)
            , n = document.createElement("div");
        n.classList.add("progress"),
            n.setAttribute("data-toggle", "tooltip"),
            n.setAttribute("title", "range: " + Util.DECIMAL_FORMAT.format(t) + "-" + Util.DECIMAL_FORMAT.format(a) + ", val: " + Util.DECIMAL_FORMAT.format(e) + ", progress: " + Util.DECIMAL_FORMAT.format(r) + "%");
        const o = ElementUtil.createElement("div", null, "progress-bar", null, [["role", "progressbar"], ["style", "width: " + r + "%;"], ["aria-valuenow", e], ["aria-valuemin", t], ["aria-valuemax", a]]);
        return n.appendChild(o),
            n
    }
    static createFilteredInputGroup(e, t, a) {
        const r = document.createElement("div");
        return r.classList.add("form-check", "mb-3", "d-none", "filtered-input-container"),
            r.innerHTML = '<input\n            id="'.concat(e, '"\n            type="radio"\n            name="').concat(t, '"\n            value="').concat(a, '"\n        />\n        <label\n            class="form-check-label"\n            for="').concat(e, '"\n        >\n        </label>'),
            r
    }
    static autofocus(e) {
        if (!(arguments.length > 1 && void 0 !== arguments[1] && arguments[1]) && Util.isMobile())
            return;
        const t = e.querySelector(":scope *[autofocus]");
        t && t.focus()
    }
    static setLoadingIndicator(e, t) {
        for (const t of Object.values(LOADING_STATUS))
            e.classList.remove(t.className);
        e.classList.add(t.className)
    }
    static executeActiveTabTask() {
        if (!window.location.hash)
            return;
        const e = ElementUtil.ELEMENT_TASKS.get(window.location.hash.substring(1) + "-tab");
        e && e()
    }
    static executeTask(e, t) {
        const a = ElementUtil.ELEMENT_TASK_QUEUE.get(e);
        let r = a ? a.then(t) : t();
        return r && r instanceof Promise || (r = Promise.resolve()),
            ElementUtil.ELEMENT_TASK_QUEUE.set(e, r),
            r
    }
    static getViewportRect() {
        const e = {
            x: 0,
            y: 0,
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight,
            top: 0,
            left: 0
        };
        return e.bottom = e.y + e.height,
            e.right = e.x + e.width,
            Object.freeze(e),
            e
    }
    static getInfiniteScrollViewportRect() {
        const e = ElementUtil.getViewportRect()
            , t = {
                x: e.x,
                y: e.height * ElementUtil.INFINITE_SCROLL_VIEWPORT_Y_MARGIN * -1,
                width: e.width,
                height: e.height + e.height * ElementUtil.INFINITE_SCROLL_VIEWPORT_Y_MARGIN * 2,
                left: 0,
                right: e.right
            };
        return t.top = t.y,
            t.bottom = t.y + t.height,
            Object.freeze(t),
            t
    }
    static rectContainsRect(e, t) {
        return t.top >= e.top && t.left >= e.left && t.bottom <= e.bottom && t.right <= e.right
    }
    static isElementInViewport(e) {
        const t = ElementUtil.getViewportRect()
            , a = e.getBoundingClientRect();
        return ElementUtil.rectContainsRect(t, a)
    }
    static isElementVisible(e) {
        return null !== e.offsetParent
    }
    static onCloneElement(e) {
        ElementUtil.cloneElement(e.target)
    }
    static cloneElement(e) {
        const t = document.getElementById(e.getAttribute("data-clone-source"))
            , a = document.getElementById(e.getAttribute("data-clone-destination"))
            , r = e.getAttribute("data-clone-class")
            , n = r + "-" + a.querySelectorAll(":scope ." + r).length
            , o = t.cloneNode(!0);
        o.id = n,
            a.appendChild(o);
        const l = ElementUtil.AFTER_CLONE_ELEMENT.get(r);
        return null != l && l(o),
            o
    }
    static enhanceCloneCtl() {
        document.querySelectorAll(".clone-ctl").forEach(e => e.addEventListener("click", ElementUtil.onCloneElement))
    }
    static processDynamicClone(e) {
        e.querySelectorAll("[disabled]").forEach(e => e.disabled = !1),
            e.querySelectorAll(':scope [data-action="remove-element"]').forEach(t => {
                null == t.getAttribute("data-target") && t.setAttribute("data-target", e.id)
            }
            ),
            ElementUtil.enhanceRemoveCtl(e),
            e.classList.remove("d-none");
        const t = e.querySelector("[autofocus]");
        t && t.focus()
    }
    static onRemoveElement(e) {
        document.getElementById(e.target.getAttribute("data-target")).remove()
    }
    static enhanceRemoveCtl(e) {
        e.querySelectorAll(':scope [data-action="remove-element"]').forEach(e => e.addEventListener("click", ElementUtil.onRemoveElement))
    }
    static enhanceDocumentVisibilityTasks() {
        document.addEventListener("visibilitychange", ElementUtil.executeDocumentVisibilityTask)
    }
    static executeDocumentVisibilityTask() {
        const e = ElementUtil.DOCUMENT_VISIBILITY_TASKS.get(window.location.hash);
        e && e("visible" == document.visibilityState)
    }
    static enhanceClassCtl() {
        document.querySelectorAll(".class-ctl").forEach(e => e.addEventListener("change", ElementUtil.onChangeClassCtl))
    }
    static onChangeClassCtl(e) {
        ElementUtil.applyClassCtl(e.target)
    }
    static applyClassCtl(e) {
        const t = ElementUtil.getClassCtlValue(e);
        document.querySelectorAll(e.getAttribute("data-class-ctl-target")).forEach(e => {
            e.classList.add(...t.add),
                e.classList.remove(...t.remove)
        }
        )
    }
    static getClassCtlValue(e) {
        let t = {};
        if ("SELECT" == e.tagName) {
            const a = e.options[e.selectedIndex];
            t.add = a.getAttribute("data-class-ctl-class"),
                t.add = null != t.add ? t.add.split(" ") : [],
                t.remove = Array.from(e.options).filter(e => e.value != a.value).map(e => e.getAttribute("data-class-ctl-class")).filter(e => null != e).map(e => e.split(" ")).reduce((e, t) => e.concat(t), [])
        } else
            t = {
                add: [],
                remove: []
            };
        return t
    }
    static addLoadClassWatcher(e) {
        return e.addEventListener("load", ElementUtil.onLoad),
            e
    }
    static onLoad(e) {
        e.target.classList.add("loaded")
    }
    static processFlags() {
        Array.from(document.querySelectorAll("[data-feature-timestamp]")).filter(e => Date.now() - e.getAttribute("data-feature-timestamp") <= ElementUtil.NEW_FLAG_DURATION).forEach(e => e.classList.add("new", e.getAttribute("data-feature-timestamp-class")))
    }
    static updateGenericContainer(e, t) {
        (!(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]) && ElementUtil.removeChildren(e),
            t.forEach(t => e.appendChild(t))
    }
    static infiniteScroll(e, t) {
        const a = new IntersectionObserver(e => {
            e.some(e => e.isIntersecting) && t()
        }
            , ElementUtil.INFINITE_SCROLL_OPTIONS);
        return a.observe(e),
            a
    }
}
ElementUtil.ELEMENT_RESOLVERS = new Map,
    ElementUtil.ELEMENT_TASKS = new Map,
    ElementUtil.DOCUMENT_VISIBILITY_TASKS = new Map,
    ElementUtil.ELEMENT_TASK_QUEUE = new Map,
    ElementUtil.INPUT_TIMEOUTS = new Map,
    ElementUtil.INPUT_TIMESTAMPS = new Map,
    ElementUtil.TITLE_CONSTRUCTORS = new Map,
    ElementUtil.DESCRIPTION_CONSTRUCTORS = new Map,
    ElementUtil.AFTER_CLONE_ELEMENT = new Map([["dynamic-clone-element", ElementUtil.processDynamicClone]]),
    ElementUtil.NEGATION_PREFIX = "neg-",
    ElementUtil.INPUT_TIMEOUT = 1e3,
    ElementUtil.MANUAL_TOOLTIP_TIMEOUT = 1e3,
    ElementUtil.INFINITE_SCROLL_VIEWPORT_Y_MARGIN = .1,
    ElementUtil.INFINITE_SCROLL_OPTIONS = {
        rootMargin: 100 * ElementUtil.INFINITE_SCROLL_VIEWPORT_Y_MARGIN + "% 0px"
    },
    ElementUtil.NEW_FLAG_DURATION = 12096e5;
const REGION = Object.freeze({
    US: {
        code: 1,
        name: "us",
        fullName: "US",
        order: 1
    },
    EU: {
        code: 2,
        name: "eu",
        fullName: "EU",
        order: 2
    },
    KR: {
        code: 3,
        name: "kr",
        fullName: "KR",
        order: 3
    },
    CN: {
        code: 5,
        name: "cn",
        fullName: "CN",
        order: 4
    }
})
    , RACE = Object.freeze({
        TERRAN: {
            code: 1,
            name: "terran",
            fullName: "TERRAN",
            order: 1
        },
        PROTOSS: {
            code: 2,
            name: "protoss",
            fullName: "PROTOSS",
            order: 2
        },
        ZERG: {
            code: 3,
            name: "zerg",
            fullName: "ZERG",
            order: 3
        },
        RANDOM: {
            code: 4,
            name: "random",
            fullName: "RANDOM",
            order: 4
        }
    })
    , LEAGUE = Object.freeze({
        BRONZE: {
            code: 0,
            name: "bronze",
            shortName: "bro",
            fullName: "BRONZE",
            order: 1
        },
        SILVER: {
            code: 1,
            name: "silver",
            shortName: "sil",
            fullName: "SILVER",
            order: 2
        },
        GOLD: {
            code: 2,
            name: "gold",
            shortName: "gol",
            fullName: "GOLD",
            order: 3
        },
        PLATINUM: {
            code: 3,
            name: "platinum",
            shortName: "pla",
            fullName: "PLATINUM",
            order: 4
        },
        DIAMOND: {
            code: 4,
            name: "diamond",
            shortName: "dia",
            fullName: "DIAMOND",
            order: 5
        },
        MASTER: {
            code: 5,
            name: "master",
            shortName: "mas",
            fullName: "MASTER",
            order: 6
        },
        GRANDMASTER: {
            code: 6,
            name: "grandmaster",
            shortName: "gra",
            fullName: "GRANDMASTER",
            order: 7
        }
    })
    , LEAGUE_TIER = Object.freeze({
        FIRST: {
            code: 0,
            name: "1",
            fullName: "FIRST",
            order: 1
        },
        SECOND: {
            code: 1,
            name: "2",
            fullName: "SECOND",
            order: 2
        },
        THIRD: {
            code: 2,
            name: "3",
            fullName: "THIRD",
            order: 3
        }
    })
    , TEAM_FORMAT = Object.freeze({
        _1V1: {
            code: 201,
            name: "1V1",
            fullName: "LOTV_1V1",
            formatName: "_1V1",
            memberCount: 1,
            order: 1
        },
        _2V2: {
            code: 202,
            name: "2V2",
            fullName: "LOTV_2V2",
            formatName: "_2V2",
            memberCount: 2,
            order: 2
        },
        _3V3: {
            code: 203,
            name: "3V3",
            fullName: "LOTV_3V3",
            formatName: "_3V3",
            memberCount: 3,
            order: 3
        },
        _4V4: {
            code: 204,
            name: "4V4",
            fullName: "LOTV_4V4",
            formatName: "_4V4",
            memberCount: 4,
            order: 4
        },
        ARCHON: {
            code: 206,
            name: "Archon",
            fullName: "LOTV_ARCHON",
            formatName: "ARCHON",
            memberCount: 2,
            order: 5
        }
    })
    , TEAM_FORMAT_TYPE = Object.freeze({
        _1V1: {
            name: "1V1",
            fullName: "_1V1",
            teamFormats: [TEAM_FORMAT._1V1],
            order: 1
        },
        TEAM: {
            name: "Team",
            fullName: "TEAM",
            teamFormats: Object.values(TEAM_FORMAT).filter(e => e.memberCount > 1),
            order: 2
        }
    })
    , TEAM_TYPE = Object.freeze({
        ARRANGED: {
            code: 0,
            name: "Arranged",
            fullName: "ARRANGED",
            secondaryName: "Team",
            order: 1
        },
        RANDOM: {
            code: 1,
            name: "Random",
            fullName: "RANDOM",
            secondaryName: "Solo",
            order: 2
        }
    })
    , PERIOD = Object.freeze({
        DAY: {
            name: "day",
            timeUnit: "hour",
            order: 1
        },
        WEEK: {
            name: "week",
            timeUnit: "day",
            order: 2
        },
        MONTH: {
            name: "month",
            timeUnit: "day",
            order: 3
        }
    })
    , PAGE_TYPE = Object.freeze({
        FIRST: {},
        LAST: {},
        GENERAL: {}
    })
    , AGE_DISTRIBUTION = Object.freeze({
        GLOBAL: {
            name: "global",
            order: 1
        },
        OLD: {
            name: "old",
            order: 2
        },
        NEW: {
            name: "new",
            order: 3
        }
    })
    , INTENSITY = Object.freeze({
        LOW: {
            name: "low",
            order: 1
        },
        MEDIUM: {
            name: "medium",
            order: 2
        },
        HIGH: {
            name: "high",
            order: 3
        }
    })
    , VIEW = Object.freeze({
        GLOBAL: {
            name: "global",
            order: 1
        },
        LADDER: {
            name: "ladder",
            order: 2
        },
        FOLLOWING_LADDER: {
            name: "following-ladder",
            order: 3
        },
        CHARACTER: {
            name: "character",
            order: 4
        },
        CHARACTER_SEARCH: {
            name: "character-search",
            order: 5
        },
        PERSONAL_CHARACTERS: {
            name: "personal-characters",
            order: 6
        },
        ONLINE: {
            name: "online",
            order: 7
        },
        TEAM_BUFFER: {
            name: "team-buffer",
            order: 8
        },
        TEAM_MMR: {
            name: "team-mmr",
            order: 9
        },
        CHARACTER_REPORTS: {
            name: "all-character-reports",
            order: 10
        },
        FOLLOWING_CHARACTERS: {
            name: "following-characters",
            order: 11
        },
        CLAN_SEARCH: {
            name: "clan-search",
            order: 12
        },
        CLAN_BUFFER: {
            name: "clan-buffer",
            order: 13
        },
        VERSUS: {
            name: "versus",
            order: 14
        },
        VOD_SEARCH: {
            name: "vod-search",
            order: 15
        },
        GROUP: {
            name: "group",
            order: 16
        },
        STREAM_SEARCH: {
            name: "stream-search",
            order: 17
        },
        TEAM_SEARCH: {
            name: "team-search",
            order: 18
        }
    })
    , VIEW_DATA = Object.freeze({
        SEARCH: {
            name: "search",
            order: 1
        },
        LADDER_STATS: {
            name: "ladder-stats",
            order: 2
        },
        QUEUE_STATS: {
            name: "queue-stats",
            order: 3
        },
        LEAGUE_BOUNDS: {
            name: "league-bounds",
            order: 4
        },
        BUNDLE: {
            name: "bundle",
            order: 5
        },
        CHARACTER_STATS: {
            name: "character-stats",
            order: 6
        },
        VAR: {
            name: "var",
            order: 7
        },
        TEAMS: {
            name: "teams",
            order: 8
        }
    })
    , STATUS = Object.freeze({
        BEGIN: {
            name: "begin",
            order: 1
        },
        SUCCESS: {
            name: "success",
            order: 2
        },
        ERROR: {
            name: "error",
            order: 3
        }
    })
    , LOADING_STATUS = Object.freeze({
        NONE: {
            name: "none",
            className: "loading-none",
            order: 1
        },
        IN_PROGRESS: {
            name: "in-progress",
            className: "loading-in-progress",
            order: 2
        },
        COMPLETE: {
            name: "complete",
            className: "loading-complete",
            order: 3
        },
        ERROR: {
            name: "error",
            className: "loading-error",
            order: 4
        }
    })
    , THEME = Object.freeze({
        LIGHT: {
            name: "light",
            order: 1
        },
        DARK: {
            name: "dark",
            order: 2
        }
    })
    , START_MODE = Object.freeze({
        FULL: {
            name: "full",
            order: 1
        },
        MINIMAL: {
            name: "minimal",
            order: 2
        },
        ESSENTIAL: {
            name: "essential",
            order: 3
        },
        BARE: {
            name: "bare",
            order: 4
        }
    })
    , LADDER_RACE_STATS_TYPE = Object.freeze({
        GAMES_PLAYED: {
            name: "games-played",
            description: "Games played by race",
            parameterSuffix: "GamesPlayed",
            order: 1
        },
        TEAM_COUNT: {
            name: "team-count",
            description: "Team count by race",
            parameterSuffix: "TeamCount",
            order: 2
        }
    })
    , TIER_RANGE = Object.freeze({
        1: {
            bottomThreshold: 1.333,
            league: LEAGUE.MASTER,
            tierType: 0,
            order: 1
        },
        2: {
            bottomThreshold: 2.666,
            league: LEAGUE.MASTER,
            tierType: 1,
            order: 2
        },
        3: {
            bottomThreshold: 4,
            league: LEAGUE.MASTER,
            tierType: 2,
            order: 3
        },
        4: {
            bottomThreshold: 11.666,
            league: LEAGUE.DIAMOND,
            tierType: 0,
            order: 4
        },
        5: {
            bottomThreshold: 19.333,
            league: LEAGUE.DIAMOND,
            tierType: 1,
            order: 5
        },
        6: {
            bottomThreshold: 27,
            league: LEAGUE.DIAMOND,
            tierType: 2,
            order: 6
        },
        7: {
            bottomThreshold: 34.666,
            league: LEAGUE.PLATINUM,
            tierType: 0,
            order: 7
        },
        8: {
            bottomThreshold: 42.333,
            league: LEAGUE.PLATINUM,
            tierType: 1,
            order: 8
        },
        9: {
            bottomThreshold: 50,
            league: LEAGUE.PLATINUM,
            tierType: 2,
            order: 9
        },
        10: {
            bottomThreshold: 57.666,
            league: LEAGUE.GOLD,
            tierType: 0,
            order: 10
        },
        11: {
            bottomThreshold: 65.333,
            league: LEAGUE.GOLD,
            tierType: 1,
            order: 11
        },
        12: {
            bottomThreshold: 73,
            league: LEAGUE.GOLD,
            tierType: 2,
            order: 12
        },
        13: {
            bottomThreshold: 80.666,
            league: LEAGUE.SILVER,
            tierType: 0,
            order: 13
        },
        14: {
            bottomThreshold: 88.333,
            league: LEAGUE.SILVER,
            tierType: 1,
            order: 14
        },
        15: {
            bottomThreshold: 96,
            league: LEAGUE.SILVER,
            tierType: 2,
            order: 15
        },
        16: {
            bottomThreshold: 97.333,
            league: LEAGUE.BRONZE,
            tierType: 0,
            order: 16
        },
        17: {
            bottomThreshold: 98.666,
            league: LEAGUE.BRONZE,
            tierType: 1,
            order: 17
        },
        18: {
            bottomThreshold: 100,
            league: LEAGUE.BRONZE,
            tierType: 2,
            order: 18
        }
    })
    , CLAN_CURSOR = Object.freeze({
        ACTIVE_MEMBERS: {
            name: "active-members",
            fullName: "ACTIVE_MEMBERS",
            field: "activeMembers",
            getter: e => e.activeMembers,
            minParamName: "minActiveMembers",
            maxParamName: "maxActiveMembers",
            order: 1
        },
        AVG_RATING: {
            name: "average-rating",
            fullName: "AVG_RATING",
            field: "avgRating",
            getter: e => e.avgRating,
            minParamName: "minAverageRating",
            maxParamName: "maxAverageRating",
            order: 2
        },
        GAMES_PER_ACTIVE_MEMBER_PER_DAY: {
            name: "games-per-active-member-per-day",
            fullName: "GAMES_PER_ACTIVE_MEMBER_PER_DAY",
            field: "gamesPerActiveMemberPerDay",
            getter: e => e.games / e.activeMembers / CLAN_STATS_DEPTH_DAYS,
            minParamName: "minGamesPerActiveMemberPerDay",
            maxParamName: "maxGamesPerActiveMemberPerDay",
            order: 3
        },
        MEMBERS: {
            name: "members",
            fullName: "MEMBERS",
            field: "members",
            getter: e => e.members,
            minParamName: "minMembers",
            maxParamName: "maxMembers",
            order: 4
        }
    })
    , CHEATER_FLAG = Object.freeze({
        REPORTED: {
            name: "reported",
            description: "This player has been reported, but report has not yet been confirmed by the moderators",
            cssClass: "info",
            order: 1
        },
        SUSPICIOUS: {
            name: "suspicious",
            description: "This player or one of their linked characters has a confirmed evidence of suspicious activity.",
            cssClass: "warning",
            order: 2
        },
        CHEATER: {
            name: "cheater",
            description: "This player or one of their linked characters has a confirmed evidence of cheating.",
            cssClass: "danger",
            order: 3
        }
    })
    , CLAN_MEMBER_EVENT_TYPE = Object.freeze({
        JOIN: {
            name: "join",
            description: "Joined",
            element: ElementUtil.createIcoFontElement("arrow-right", "Joined", "text-success"),
            order: 1
        },
        LEAVE: {
            name: "leave",
            description: "Left",
            element: ElementUtil.createIcoFontElement("arrow-left", "Left", "text-danger"),
            order: 2
        }
    })
    , AUDIT_LOG_ACTION = Object.freeze({
        INSERT: {
            name: "I",
            fullName: "INSERT",
            order: 1
        },
        UPDATE: {
            name: "U",
            fullName: "UPDATE",
            order: 2
        },
        DELETE: {
            name: "D",
            fullName: "DELETE",
            order: 3
        },
        TRUNCATE: {
            name: "T",
            fullName: "TRUNCATE",
            order: 4
        }
    })
    , LADDER_STATS_GLOBAL_VIEW_MODE = Object.freeze({
        MIXED: {
            code: 1,
            name: "mixed",
            fullName: "MIXED",
            sectionIds: new Set(["games-played-day", "team-count-global", "player-count-global", "player-count-daily-activity-tier"]),
            order: 1
        },
        NORMALIZED: {
            code: 2,
            name: "normalized",
            fullName: "NORMALIZED",
            sectionIds: new Set(["games-played-day", "team-count-day", "player-count-day", "player-count-daily-activity-tier-day"]),
            order: 2
        },
        RAW: {
            code: 3,
            name: "raw",
            fullName: "RAW",
            sectionIds: new Set(["games-played-global", "team-count-global", "player-count-global", "player-count-daily-activity-tier"]),
            order: 3
        },
        MAX: {
            code: 4,
            name: "all",
            fullName: "MAX",
            sectionIds: new Set(["games-played-global", "team-count-global", "player-count-global", "player-count-daily-activity-tier", "games-played-day", "team-count-day", "player-count-day", "player-count-daily-activity-tier-day"]),
            order: 4
        }
    })
    , TEAM_HISTORY_GROUP_MODE = Object.freeze({
        TEAM: {
            code: 1,
            name: "team",
            fullName: "TEAM",
            order: 1
        },
        LEGACY_UID: {
            code: 2,
            name: "legacy-uid",
            fullName: "LEGACY_UID",
            order: 2
        }
    })
    , TEAM_HISTORY_STATIC_COLUMN = Object.freeze({
        ID: {
            code: 1,
            name: "id",
            fullName: "ID",
            order: 1
        },
        REGION: {
            code: 2,
            name: "region",
            fullName: "REGION",
            order: 2
        },
        QUEUE_TYPE: {
            code: 3,
            name: "queue",
            fullName: "QUEUE_TYPE",
            order: 3
        },
        TEAM_TYPE: {
            code: 4,
            name: "type",
            fullName: "TEAM_TYPE",
            order: 4
        },
        LEGACY_ID: {
            code: 5,
            name: "legacy-id",
            fullName: "LEGACY_ID",
            order: 5
        },
        SEASON: {
            code: 6,
            name: "season",
            fullName: "SEASON",
            order: 6
        },
        LEGACY_UID: {
            code: 7,
            name: "legacy-uid",
            fullName: "LEGACY_UID",
            order: 7
        }
    })
    , TEAM_HISTORY_HISTORY_COLUMN = Object.freeze({
        TIMESTAMP: {
            code: 1,
            name: "timestamp",
            fullName: "TIMESTAMP",
            order: 1
        },
        RATING: {
            code: 2,
            name: "rating",
            fullName: "RATING",
            order: 2
        },
        GAMES: {
            code: 3,
            name: "games",
            fullName: "GAMES",
            order: 3
        },
        WINS: {
            code: 4,
            name: "wins",
            fullName: "WINS",
            order: 4
        },
        LEAGUE_TYPE: {
            code: 5,
            name: "league",
            fullName: "LEAGUE_TYPE",
            order: 5
        },
        TIER_TYPE: {
            code: 6,
            name: "tier",
            fullName: "TIER_TYPE",
            order: 6
        },
        DIVISION_ID: {
            code: 7,
            name: "division-id",
            fullName: "DIVISION_ID",
            order: 7
        },
        GLOBAL_RANK: {
            code: 8,
            name: "global-rank",
            fullName: "GLOBAL_RANK",
            order: 8
        },
        REGION_RANK: {
            code: 9,
            name: "region-rank",
            fullName: "REGION_RANK",
            order: 9
        },
        LEAGUE_RANK: {
            code: 10,
            name: "league-rank",
            fullName: "LEAGUE_RANK",
            order: 10
        },
        GLOBAL_TEAM_COUNT: {
            code: 11,
            name: "global-team-count",
            fullName: "GLOBAL_TEAM_COUNT",
            order: 11
        },
        REGION_TEAM_COUNT: {
            code: 12,
            name: "region-team-count",
            fullName: "REGION_TEAM_COUNT",
            order: 12
        },
        LEAGUE_TEAM_COUNT: {
            code: 13,
            name: "league-team-count",
            fullName: "LEAGUE_TEAM_COUNT",
            order: 13
        },
        ID: {
            code: 14,
            name: "id",
            fullName: "ID",
            order: 14
        },
        SEASON: {
            code: 15,
            name: "season",
            fullName: "SEASON",
            order: 15
        }
    })
    , TEAM_HISTORY_SUMMARY_COLUMN = Object.freeze({
        GAMES: {
            code: 1,
            name: "games",
            fullName: "GAMES",
            textContent: "Games",
            order: 1
        },
        RATING_MIN: {
            code: 2,
            name: "rating-min",
            fullName: "RATING_MIN",
            textContent: "Min MMR",
            order: 2
        },
        RATING_AVG: {
            code: 3,
            name: "rating-avg",
            fullName: "RATING_AVG",
            textContent: "Avg MMR",
            order: 3
        },
        RATING_MAX: {
            code: 4,
            name: "rating-max",
            fullName: "RATING_MAX",
            textContent: "Max MMR",
            order: 4
        },
        RATING_LAST: {
            code: 5,
            name: "rating-last",
            fullName: "RATING_LAST",
            textContent: "Last MMR",
            order: 5
        },
        REGION_RANK_LAST: {
            code: 6,
            name: "region-rank-last",
            fullName: "REGION_RANK_LAST",
            textContent: "Last rank",
            order: 6
        },
        REGION_TEAM_COUNT_LAST: {
            code: 7,
            name: "region-team-count-last",
            fullName: "REGION_TEAM_COUNT_LAST",
            textContent: "Last teams",
            order: 7
        }
    })
    , SOCIAL_MEDIA = Object.freeze({
        ALIGULAC: Object.freeze({
            code: 1,
            name: "aligulac",
            fullName: "ALIGULAC",
            baseUrl: "http://aligulac.com",
            baseUserUrl: "http://aligulac.com/players",
            order: 1
        }),
        TWITCH: Object.freeze({
            code: 2,
            name: "twitch",
            fullName: "TWITCH",
            baseUrl: "https://www.twitch.tv",
            baseUserUrl: "https://www.twitch.tv",
            order: 2
        }),
        LIQUIPEDIA: Object.freeze({
            code: 3,
            name: "liquipedia",
            fullName: "LIQUIPEDIA",
            baseUrl: "https://liquipedia.net",
            baseUserUrl: "https://liquipedia.net/starcraft2",
            order: 3
        }),
        TWITTER: Object.freeze({
            code: 4,
            name: "twitter",
            fullName: "TWITTER",
            baseUrl: "https://twitter.com",
            baseUserUrl: "https://twitter.com",
            order: 4
        }),
        INSTAGRAM: Object.freeze({
            code: 5,
            name: "instagram",
            fullName: "INSTAGRAM",
            baseUrl: "https://www.instagram.com",
            baseUserUrl: "https://www.instagram.com",
            order: 5
        }),
        DISCORD: Object.freeze({
            code: 6,
            name: "discord",
            fullName: "DISCORD",
            baseUrl: "https://discord.gg",
            baseUserUrl: null,
            order: 6
        }),
        YOUTUBE: Object.freeze({
            code: 7,
            name: "youtube",
            fullName: "YOUTUBE",
            baseUrl: "https://www.youtube.com",
            baseUserUrl: "https://www.youtube.com/channel",
            order: 7
        }),
        UNKNOWN: Object.freeze({
            code: 8,
            name: "",
            fullName: "",
            baseUrl: null,
            baseUserUrl: null,
            order: 8
        }),
        BATTLE_NET: Object.freeze({
            code: 9,
            name: "battlenet",
            fullName: "BATTLE_NET",
            baseUrl: "battlenet:://starcraft",
            baseUserUrl: "battlenet:://starcraft/profile",
            order: 9
        }),
        REPLAY_STATS: Object.freeze({
            code: 10,
            name: "replaystats",
            fullName: "REPLAY_STATS",
            baseUrl: "https://sc2replaystats.com",
            baseUserUrl: "https://sc2replaystats.com/player",
            order: 10
        }),
        BILIBILI: Object.freeze({
            code: 11,
            name: "bilibili",
            fullName: "BILIBILI",
            baseUrl: "https://space.bilibili.com",
            baseUserUrl: "https://space.bilibili.com",
            order: 11
        })
    })
    , SORTING_ORDER = Object.freeze({
        ASC: Object.freeze({
            code: 1,
            name: "ascending",
            fullName: "ASC",
            textContent: "Ascending",
            order: 1
        }),
        DESC: Object.freeze({
            code: 2,
            name: "descending",
            fullName: "DESC",
            textContent: "Descending",
            order: 2
        })
    })
    , NAVIGATION_DIRECTION = Object.freeze({
        FORWARD: Object.freeze({
            code: 1,
            name: "forward",
            fullName: "FORWARD",
            relativePosition: "after",
            order: 1
        }),
        BACKWARD: Object.freeze({
            code: 2,
            name: "backward",
            fullName: "BACKWARD",
            relativePosition: "before",
            order: 2
        })
    });
class EnumUtil {
    static enumOfId(e, t) {
        for (const a of Object.values(t))
            if (a.code == e)
                return a;
        throw new Error("Invalid id")
    }
    static enumOfName(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        e = e.toLowerCase();
        for (const a of Object.values(t))
            if (a.name.toLowerCase() == e)
                return a;
        if (a)
            throw new Error("Invalid name");
        return null
    }
    static enumOfFullName(e, t) {
        e = e.toLowerCase();
        for (const a of Object.values(t))
            if (a.fullName.toLowerCase() == e)
                return a;
        throw new Error("Invalid full name")
    }
    static enumOfStoredFullName(e, t, a) {
        const r = localStorage.getItem(e);
        return null == r ? a : EnumUtil.enumOfFullName(r, t)
    }
    static enumOfNamePrefix(e, t) {
        e = e.toLowerCase();
        for (const a of Object.values(t))
            if (a.name.toLowerCase().startsWith(e))
                return a;
        throw new Error("Invalid name")
    }
    static enumOfProperty(e, t, a) {
        for (const r of Object.values(a))
            if (r[e] == t)
                return r;
        throw new Error("Invalid " + e)
    }
    static getMemberCount(e, t) {
        return t === TEAM_TYPE.RANDOM ? 1 : e.memberCount
    }
}
class CharacterUtil {
    static setCharacterViewTasks() {
        ElementUtil.ELEMENT_TASKS.set("player-stats-characters-tab", e => CharacterUtil.enqueueUpdateCharacterLinkedCharacters()),
            ElementUtil.ELEMENT_TASKS.set("player-stats-summary-tab", e => CharacterUtil.enqueueUpdateCharacterStats()),
            ElementUtil.ELEMENT_TASKS.set("player-stats-player-tab", e => CharacterUtil.enqueueUpdateCharacterLinks()),
            ElementUtil.ELEMENT_TASKS.set("player-stats-matches-tab", e => CharacterUtil.enqueueResetNextMatchesView()),
            ElementUtil.infiniteScroll(document.querySelector("#player-stats-matches .container-indicator-loading-default"), e => CharacterUtil.enqueueUpdateNextMatches()),
            ElementUtil.ELEMENT_TASKS.set("player-stats-history-tab", e => CharacterUtil.enqueueUpdateCharacterTeams()),
            ElementUtil.ELEMENT_TASKS.set("player-stats-mmr-tab", e => CharacterUtil.enqueueUpdateCharacterMmrHistoryAll())
    }
    static showCharacterInfo() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null
            , t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null
            , a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        Util.resetLoadingIndicatorTree(document.querySelector("#player-info")),
            null != e && e.preventDefault();
        const r = t || e.currentTarget.getAttribute("data-character-id")
            , n = []
            , o = new URLSearchParams;
        o.append("type", "character"),
            o.append("id", r);
        const l = o.toString();
        return o.append("m", "1"),
            !0 === a && n.push(BootstrapUtil.hideActiveModal(["versus-modal", "player-info", "error-generation"])),
            n.push(CharacterUtil.updateCharacter(r)),
            Promise.all(n).then(e => {
                Session.isHistorical || !0 !== a || HistoryUtil.pushState({
                    type: "character",
                    id: r
                }, document.title, "?" + o.toString() + "#" + document.querySelector("#player-stats-tabs .nav-link.active").id),
                    Session.currentSearchParams = l
            }
            ).then(e => BootstrapUtil.showModal("player-info"))
    }
    static updateCharacterModel(e) {
        const t = new URLSearchParams;
        return t.append("characterId", e),
            GroupUtil.getCharacters(t).then(e => {
                if (!e)
                    throw Error("Character not found");
                return Model.DATA.get(VIEW.CHARACTER).set(VIEW_DATA.VAR, e[0]),
                    Model.DATA.get(VIEW.CHARACTER).set(VIEW_DATA.SEARCH, {}),
                    e
            }
            )
    }
    static expandMmrHistory(e) {
        if (!e || !e.season || 0 == e.season.length)
            return [];
        const t = new Array(e.season.length);
        for (let a = 0; a < e.season.length; a++)
            t[a] = {
                teamState: {
                    teamId: e.teamId[a],
                    dateTime: e.dateTime[a],
                    games: e.games[a],
                    wins: e.wins[a],
                    rating: e.rating[a],
                    globalRank: e.globalRank[a],
                    globalTeamCount: e.globalTeamCount[a],
                    regionRank: e.regionRank[a],
                    regionTeamCount: e.regionTeamCount[a],
                    leagueRank: e.leagueRank[a],
                    leagueTeamCount: e.leagueTeamCount[a]
                },
                league: {
                    type: e.leagueType[a],
                    queueType: e.queueType[a],
                    teamType: e.teamType[a]
                },
                season: e.season[a],
                tier: e.tier[a],
                race: e.race[a]
            };
        return t
    }
    static getMatchTypePath() {
        let e = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        const t = localStorage.getItem("matches-type");
        return null == t || "all" == t ? "" : e ? "/" + t : t
    }
    static resetCharacterReportsModel() {
        Model.DATA.get(VIEW.CHARACTER).delete("reports")
    }
    static resetCharacterReportsView() {
        ElementUtil.removeChildren(document.querySelector("#character-reports .character-reports"))
    }
    static resetCharacterReportsLoading() {
        Util.resetLoadingIndicator(document.querySelector("#character-reports"))
    }
    static resetCharacterReports() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        CharacterUtil.resetCharacterReportsModel(),
            CharacterUtil.resetCharacterReportsView(),
            e && CharacterUtil.resetCharacterReportsLoading()
    }
    static getCharacterReports(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/character/report/list/").concat(e.map(e => encodeURIComponent(e)).join(","));
        return Session.beforeRequest().then(e => fetch(t)).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static updateCharacterReportsModel() {
        return CharacterUtil.getCharacterReports(Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedDistinctCharacters.map(e => e.members.character.id)).then(e => Model.DATA.get(VIEW.CHARACTER).set("reports", e))
    }
    static updateCharacterReports() {
        return CharacterUtil.resetCharacterReports(),
            CharacterUtil.enqueueUpdateCharacterLinkedCharacters().then(e => CharacterUtil.updateCharacterReportsModel()).then(e => (CharacterUtil.updateCharacterReportsView(),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }))
    }
    static enqueueUpdateCharacterReports() {
        return Util.load(document.querySelector("#character-reports"), e => CharacterUtil.updateCharacterReports())
    }
    static updateAllCharacterReportsModel() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/character/report/list"))).then(Session.verifyJsonResponse).then(t => Model.DATA.get(VIEW.CHARACTER_REPORTS).set("reports", CharacterUtil.filterCharacterReports(t, e)))
    }
    static filterCharacterReports(e) {
        if (!(arguments.length > 1 && void 0 !== arguments[1] && arguments[1]) || !Session.currentAccount)
            return e;
        for (const t of e)
            t.evidence = t.evidence.filter(e => !e.votes.find(e => e.vote.voterAccountId == Session.currentAccount.id));
        return e = e.filter(e => e.evidence.length > 0)
    }
    static updateAllCharacterReports() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return document.querySelector("#all-character-reports") ? (Util.setGeneratingStatus(STATUS.BEGIN),
            CharacterUtil.updateAllCharacterReportsModel(e).then(e => {
                CharacterUtil.updateAllCharacterReportsView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))) : Promise.resolve()
    }
    static resetCharacterTeamsModel() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
        delete e.teams,
            delete e.result
    }
    static resetCharacterTeamsView() {
        ElementUtil.removeChildren(document.querySelector("#character-teams-table tbody"))
    }
    static resetCharacterTeamsLoading() {
        Util.resetLoadingIndicator(document.querySelector("#player-stats-history"))
    }
    static resetCharacterTeams() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        CharacterUtil.resetCharacterTeamsModel(),
            CharacterUtil.resetCharacterTeamsView(),
            e && CharacterUtil.resetCharacterTeamsLoading()
    }
    static updateCharacterTeamsModel(e, t) {
        const a = new URLSearchParams;
        return a.append("characterId", e),
            a.append("season", t),
            GroupUtil.getTeams(a).then(e => {
                const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
                return t.teams = e,
                    t.result = e,
                    e
            }
            )
    }
    static updateCharacterTeams() {
        return CharacterUtil.resetCharacterTeams(),
            CharacterUtil.updateCharacterTeamsModel(Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id, document.querySelector("#teams-season-select").value).then(e => (CharacterUtil.updateCharacterTeamsView(),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }))
    }
    static enqueueUpdateCharacterTeams() {
        return Util.load(document.querySelector("#player-stats-history"), e => CharacterUtil.updateCharacterTeams())
    }
    static updateCharacterTeamsView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
        e.teams && TeamUtil.updateTeamsTable(document.querySelector("#character-teams-table"), e)
    }
    static onCharacterTeamsSeasonChange(e) {
        return CharacterUtil.resetCharacterTeams(!0),
            CharacterUtil.enqueueUpdateCharacterTeams()
    }
    static enhanceCharacterTeamsSeasonCtl() {
        document.querySelector("#teams-season-select").addEventListener("change", CharacterUtil.onCharacterTeamsSeasonChange)
    }
    static getCharacterUpdateTasks() {
        return CharacterUtil.CHARACTER_UPDATE_IDS.map(e => ElementUtil.ELEMENT_TASK_QUEUE.get(e) || Promise.resolve())
    }
    static updateCharacter(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Promise.allSettled(CharacterUtil.getCharacterUpdateTasks()).then(t => CharacterUtil.updateCharacterModel(e)).then(t => {
                const a = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR);
                CharacterUtil.updateCharacterInfoName(a.members, e),
                    CharacterUtil.updateFollowAccountCtl(),
                    CharacterUtil.updateCharacterGroupLink(document.querySelector("#player-info .group-link"), a.members);
                for (const e of document.querySelectorAll(".character-link-follow-only[rel~=nofollow]"))
                    e.relList.remove("nofollow");
                CharacterUtil.enqueueUpdateCharacterReports(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static resetAdditionalLinks() {
        Util.resetLoadingIndicator(document.querySelector("#character-links-section")),
            ElementUtil.executeTask("character-links-section", () => Model.DATA.get(VIEW.CHARACTER).delete("additionalLinks"))
    }
    static enqueueUpdateAdditionalCharacterLinks() {
        return Util.load(document.querySelector("#additional-link-loading"), e => CharacterUtil.updateAdditionalCharacterLinks(Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id))
    }
    static updateAdditionalCharacterLinks(e) {
        return CharacterUtil.resetAdditionalLinks(),
            document.querySelectorAll(".additional-link-container").forEach(e => e.classList.add("d-none")),
            CharacterUtil.updateAdditionalCharacterLinksModel(e).then(e => {
                CharacterUtil.updateAdditionalCharacterLinksView();
                return {
                    data: e,
                    status: 0 == e.failedTypes.length ? LOADING_STATUS.COMPLETE : LOADING_STATUS.ERROR
                }
            }
            ).catch(e => {
                throw CharacterUtil.updateAdditionalCharacterLinksView(),
                e
            }
            )
    }
    static loadAdditionalCharacterLinks(e) {
        return Session.beforeRequest().then(t => fetch("".concat(ROOT_CONTEXT_PATH, "api/character-links?characterId=").concat(encodeURIComponent(e)))).then(e => Session.verifyJsonResponse(e, [200, 500])).then(e => e ? e[0] : e)
    }
    static updateAdditionalCharacterLinksModel(e) {
        return CharacterUtil.loadAdditionalCharacterLinks(e).then(e => (Model.DATA.get(VIEW.CHARACTER).set("additionalLinks", e),
            e))
    }
    static updateAdditionalCharacterLinksView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get("additionalLinks");
        document.querySelectorAll(".additional-link-container").forEach(e => e.classList.add("d-none")),
            e && e.links && 0 != e.links.length && (document.querySelectorAll("#character-links .link-additional").forEach(e => e.classList.add("d-none")),
                e.links.forEach(CharacterUtil.updateAdditionalLink))
    }
    static updateAdditionalLink(e) {
        switch (e.type) {
            case "BATTLE_NET":
                CharacterUtil.updateBattleNetProfileLink(e);
                break;
            case "REPLAY_STATS":
                CharacterUtil.updateReplayStatsProfileLink(e)
        }
    }
    static updateBattleNetProfileLink(e) {
        const t = document.querySelector("#link-sc2-battle-net");
        t.classList.remove("d-none"),
            t.querySelector(":scope span").textContent = e.absoluteUrl,
            t.closest(".additional-link-container").classList.remove("d-none")
    }
    static updateReplayStatsProfileLink(e) {
        const t = document.querySelector("#link-sc2-replay-stats");
        t.classList.remove("d-none"),
            t.setAttribute("href", e.absoluteUrl + "?tab=replays"),
            t.closest(".additional-link-container").classList.remove("d-none")
    }
    static updateFollowAccountCtl() {
        if (null != Session.currentAccount && null != Session.currentFollowing) {
            const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.account;
            document.getElementById("player-info").setAttribute("data-account-id", e.id),
                Object.values(Session.currentFollowing).filter(t => t.followingAccountId == e.id).length > 0 ? (document.querySelector("#follow-button").classList.add("d-none"),
                    document.querySelector("#unfollow-button").classList.remove("d-none")) : (document.querySelector("#follow-button").classList.remove("d-none"),
                        document.querySelector("#unfollow-button").classList.add("d-none"))
        }
    }
    static enqueueUpdateCharacterLinks() {
        return Util.load(document.querySelector("#player-stats-player-loading"), e => CharacterUtil.updateCharacterLinks())
    }
    static updateCharacterLinks() {
        return new Promise((e, t) => {
            CharacterUtil.updateCharacterMemberLinksView(),
                e()
        }
        ).then(e => Promise.allSettled([CharacterUtil.enqueueUpdateAdditionalCharacterLinks(), CharacterUtil.enqueueUpdateCharacterProInfo(), CharacterUtil.enqueueUpdateCharacterLinkedExternalAccounts()])).then(e => ({
            data: e,
            status: Util.getAllSettledLoadingStatus(e)
        }))
    }
    static updateCharacterMemberLinksView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR)
            , t = EnumUtil.enumOfName(e.members.character.region, REGION)
            , a = document.getElementById("link-sc2")
            , r = "/".concat(t.code, "/").concat(e.members.character.realm, "/").concat(e.members.character.battlenetId);
        document.getElementById("link-sc2arcade").setAttribute("href", "https://sc2arcade.com/profile" + r + "/lobbies-history"),
            t == REGION.CN ? a.parentElement.classList.add("d-none") : (a.setAttribute("href", "https://starcraft2.blizzard.com/profile" + r),
                a.parentElement.classList.remove("d-none")),
            Util.isFakeBattleTag(e.members.account.battleTag) ? document.querySelector("#link-battletag").classList.add("d-none") : (document.querySelector("#link-battletag").classList.remove("d-none"),
                document.querySelector("#link-battletag span").textContent = e.members.account.battleTag)
    }
    static resetCharacterLinkedExternalAccountsModel() {
        delete Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedExternalAccounts
    }
    static resetCharacterLinkedExternalAccountsView() {
        document.querySelector("#player-info .account.external").classList.add("d-none")
    }
    static resetCharacterLinkedExternalAccounts() {
        CharacterUtil.resetCharacterLinkedExternalAccountsModel(),
            CharacterUtil.resetCharacterLinkedExternalAccountsView()
    }
    static getLinkedExternalAccounts(e) {
        const t = ROOT_CONTEXT_PATH + "api/account/" + encodeURIComponent(e) + "/linked/external/account";
        return Session.beforeRequest().then(e => fetch(t)).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static updateCharacterLinkedExternalAccountsModel(e) {
        return CharacterUtil.getLinkedExternalAccounts(e).then(e => (Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedExternalAccounts = e,
            e))
    }
    static updateCharacterLinkedExternalAccounts() {
        CharacterUtil.resetCharacterLinkedExternalAccounts();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR);
        return CharacterUtil.updateCharacterLinkedExternalAccountsModel(e.members.account.id).then(e => (CharacterUtil.updateCharacterLinkedExternalAccountsView(),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static enqueueUpdateCharacterLinkedExternalAccounts() {
        return Util.load(document.querySelector("#linked-external-accounts"), e => CharacterUtil.updateCharacterLinkedExternalAccounts())
    }
    static updateCharacterLinkedExternalAccountsView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedExternalAccounts;
        if (e) {
            CharacterUtil.LINKED_EXTERNAL_ACCOUNT_UPDATERS || (CharacterUtil.LINKED_EXTERNAL_ACCOUNT_UPDATERS = CharacterUtil.createCharacterLinkedExternalAccountUpdaters());
            for (const [t, a] of Object.entries(e)) {
                const e = CharacterUtil.LINKED_EXTERNAL_ACCOUNT_UPDATERS.get(t);
                if (!e)
                    throw new Error("Updated for " + t + " type not found");
                e(a)
            }
        }
    }
    static createCharacterLinkedExternalAccountUpdaters() {
        const e = new Map;
        return e.set("DISCORD", CharacterUtil.updateCharacterDiscordConnection),
            e
    }
    static updateCharacterDiscordConnection(e) {
        const t = document.querySelector("#link-discord-connection");
        e ? (t.querySelector(":scope .tag").textContent = e.name + (e.discriminator ? "#" + e.discriminator : ""),
            t.classList.remove("d-none")) : t.classList.add("d-none")
    }
    static resetCharacterProInfoModel() {
        delete Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).proPlayer
    }
    static resetCharacterProInfoView() {
        for (const e of document.querySelectorAll(".pro-player-info"))
            e.classList.add("d-none")
    }
    static resetCharacterProInfo() {
        CharacterUtil.resetCharacterProInfoModel(),
            CharacterUtil.resetCharacterProInfoView()
    }
    static updateCharacterProInfoModel(e) {
        return RevealUtil.getPlayer(e).then(e => (Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).proPlayer = e,
            e))
    }
    static updateCharacterProInfo() {
        CharacterUtil.resetCharacterProInfo();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR);
        return e.members.proId ? CharacterUtil.updateCharacterProInfoModel(e.members.proId).then(e => (CharacterUtil.doUpdateCharacterProInfo(e),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        })) : Promise.resolve({
            data: null,
            status: LOADING_STATUS.COMPLETE
        })
    }
    static enqueueUpdateCharacterProInfo() {
        return Util.load(document.querySelector("#pro-player-info"), e => CharacterUtil.updateCharacterProInfo())
    }
    static doUpdateCharacterProInfo(e) {
        if (CharacterUtil.resetCharacterProInfoView(),
            null != e) {
            for (const e of document.querySelectorAll("#revealed-report [rel~=nofollow]"))
                e.relList.remove("nofollow");
            document.querySelector("#pro-player-info").classList.remove("d-none"),
                CharacterUtil.setProPlayerField("#pro-player-name", "td", e.proPlayer.name),
                CharacterUtil.setProPlayerField("#pro-player-birthday", "td", null != e.proPlayer.birthday ? Util.DATE_FORMAT.format(Util.parseIsoDate(e.proPlayer.birthday)) : null),
                CharacterUtil.setProPlayerField("#pro-player-country", "td", e.proPlayer.country ? Util.countryCodeToEmoji(e.proPlayer.country) : null),
                CharacterUtil.setProPlayerField("#pro-player-earnings", "td", e.proPlayer.earnings && e.proPlayer.earnings > 0 ? "$" + Util.NUMBER_FORMAT.format(e.proPlayer.earnings) : null),
                CharacterUtil.setProPlayerField("#pro-player-team", "td", e.proTeam ? e.proTeam.name : null);
            for (const t of e.links) {
                const e = document.querySelector("#link-" + t.type.toLowerCase());
                null != e && (e.setAttribute("href", t.url),
                    e.parentElement.classList.remove("d-none"))
            }
        }
    }
    static setProPlayerField(e, t, a) {
        if (null != a) {
            const r = document.querySelector(e);
            r.querySelector(":scope " + t).textContent = a,
                r.classList.remove("d-none")
        }
    }
    static updateCharacterInfoName(e) {
        let t, a, r, n, o;
        const l = e.character.name.indexOf("#")
            , s = e.character.name.substring(0, l)
            , i = e.clan ? e.clan.tag : "";
        if (Util.needToUnmaskName(s, e.proNickname, e.account.battleTag)) {
            const a = Util.unmaskName(e)
                , l = a.unmaskedTeam ? a.unmaskedTeam : "";
            t = a.unmaskedName,
                r = l,
                n = e.character.name,
                o = i
        } else
            t = s,
                a = i,
                n = e.character.name.substring(l);
        document.getElementById("player-info-title-name").textContent = Util.convertFakeName(e, t);
        const c = document.getElementById("player-info-title")
            , d = document.getElementById("player-info-title-clan")
            , u = document.getElementById("player-info-title-team")
            , m = document.getElementById("player-info-title-name-additional")
            , p = document.getElementById("player-info-title-clan-additional");
        c.querySelectorAll(":scope .player-info-region").forEach(e => e.remove()),
            c.prepend(ElementUtil.createImage("flag/", e.character.region.toLowerCase(), "table-image-long player-info-region")),
            o ? (p.textContent = o,
                p.setAttribute("href", encodeURI("".concat(ROOT_CONTEXT_PATH, "?type=group&clanId=").concat(e.clan.id, "#group-group"))),
                p.classList.remove("d-none")) : p.classList.add("d-none"),
            a ? (d.textContent = a,
                d.setAttribute("href", encodeURI("".concat(ROOT_CONTEXT_PATH, "?type=group&clanId=").concat(e.clan.id, "#group-group"))),
                d.classList.remove("d-none")) : d.classList.add("d-none"),
            r ? (u.textContent = r,
                u.classList.remove("d-none")) : u.classList.add("d-none"),
            m.textContent = n;
        const h = document.querySelector("#player-info-additional-container");
        h.querySelectorAll(":scope .player-flag").forEach(e => e.remove()),
            e.proNickname && h.appendChild(ElementUtil.createProFlag())
    }
    static resetCharacterStats() {
        delete Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).stats;
        for (const e of document.getElementsByClassName("player-stats-dynamic"))
            e.classList.add("d-none")
    }
    static enqueueUpdateCharacterStats() {
        return Util.load(document.querySelector("#player-stats"), e => CharacterUtil.updateCharacterStats())
    }
    static updateCharacterStats() {
        CharacterUtil.resetCharacterStats();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id;
        return CharacterUtil.updateCharacterStatsModel(e).then(e => (CharacterUtil.updateCharacterStatsView(),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static getCharacterStats(e) {
        const t = ROOT_CONTEXT_PATH + "api/character/" + encodeURIComponent(e) + "/stats/full";
        return Session.beforeRequest().then(e => fetch(t)).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static updateCharacterStatsModel(e) {
        return CharacterUtil.getCharacterStats(e).then(e => (Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).stats = e,
            e))
    }
    static updateCharacterStatsView() {
        for (const e of document.getElementsByClassName("player-stats-dynamic"))
            e.classList.add("d-none");
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).stats;
        if (!e)
            return;
        const t = "false" != localStorage.getItem("player-search-stats-include-previous")
            , a = "false" != localStorage.getItem("player-search-stats-gray-out-previous");
        for (const r of e) {
            const e = r.stats
                , n = r.currentStats.rating
                , o = t ? n ? r.currentStats : r.previousStats : r.currentStats
                , l = EnumUtil.enumOfId(e.queueType, TEAM_FORMAT)
                , s = EnumUtil.enumOfId(e.teamType, TEAM_TYPE)
                , i = null == e.race ? "all" : EnumUtil.enumOfName(e.race, RACE).name
                , c = EnumUtil.enumOfId(e.leagueMax, LEAGUE)
                , d = document.getElementById("player-stats-" + l.name + "-" + s.name)
                , u = d.getElementsByClassName("player-stats-" + i)[0];
            u.getElementsByClassName("player-stats-" + i + "-mmr")[0].textContent = e.ratingMax,
                u.getElementsByClassName("player-stats-" + i + "-games")[0].textContent = e.gamesPlayed,
                CharacterUtil.insertSearchStatsSummary(u.getElementsByClassName("player-stats-" + i + "-mmr-current")[0], o.rating, n, a),
                CharacterUtil.insertSearchStatsSummary(u.getElementsByClassName("player-stats-" + i + "-games-current")[0], o.gamesPlayed, n, a);
            const m = u.getElementsByClassName("player-stats-" + i + "-league")[0];
            ElementUtil.removeChildren(m),
                m.appendChild(ElementUtil.createImage("league/", c.name, "table-image table-image-square")),
                u.classList.remove("d-none"),
                d.classList.remove("d-none")
        }
        for (const e of document.querySelectorAll(".player-stats-section:not(.d-none)")) {
            const t = e.querySelector(".player-stats-table")
                , a = t.querySelectorAll("tr.player-stats-dynamic:not(.d-none)");
            2 === a.length && a[0].querySelector(".player-stats-games").textContent == a[1].querySelector(".player-stats-games").textContent && t.querySelector(".player-stats-all").classList.add("d-none");
            const r = t.querySelectorAll("th")[3]
                , n = t.querySelectorAll("th")[1];
            TableUtil.sortTable(t, [n, r])
        }
    }
    static insertSearchStatsSummary(e, t, a, r) {
        r && !a ? e.classList.add("text-secondary") : e.classList.remove("text-secondary"),
            e.textContent = t
    }
    static createMmrHistoryIndex(e, t) {
        const a = Object.values(e)[0].length
            , r = {};
        for (let n = 0; n < a; n++)
            r[e[t.fullName][n]] = n;
        return r
    }
    static calculateMmrHistoryTimestampIndex(e) {
        e.forEach(e => {
            e.timestampIndex = CharacterUtil.createMmrHistoryIndex(e.history, TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP)
        }
        )
    }
    static calculateMmrHistoryStats(e) {
        return {
            length: e.map(e => Object.values(e.history)[0].length).reduce((e, t) => e + t, 0)
        }
    }
    static recalculateCharacterMmrHistoryStats() {
        var e;
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        null !== (e = t.history) && void 0 !== e && e.data && (t.history.stats = CharacterUtil.calculateMmrHistoryStats(t.history.data))
    }
    static resetCharacterMmrHistoryFilteredData() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        e.history.data = structuredClone(e.history.originalData),
            CharacterUtil.recalculateCharacterMmrHistoryStats()
    }
    static resetCharacterMmrParameters() {
        var e;
        null === (e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH)) || void 0 === e || null === (e = e.mmrHistory) || void 0 === e || delete e.parameters
    }
    static resetCharacterMmrHistoryModel() {
        var e;
        null === (e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH)) || void 0 === e || null === (e = e.mmrHistory) || void 0 === e || delete e.history
    }
    static resetCharacterMmrHistoryView() {
        document.querySelector("#mmr-chart-container").classList.add("d-none")
    }
    static resetCharacterMmrHistory() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        CharacterUtil.resetCharacterMmrHistoryModel(),
            CharacterUtil.resetCharacterMmrHistoryView(),
            e && Util.resetLoadingIndicator(document.querySelector("#mmr-history-loading"))
    }
    static resetCharacterMmrHistoryAll() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        CharacterUtil.resetCharacterMmrHistory(e),
            CharacterUtil.resetCharacterMmrHistorySummary(e)
    }
    static updateCharacterMmrHistoryModel(e, t, a, r, n, o, l) {
        return TeamUtil.getHistory(e, t, a, r, n, o, l).then(e => {
            const t = {};
            return Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.history = t,
                t.data = e,
                e.length > 0 && (CharacterUtil.calculateMmrHistoryTimestampIndex(e),
                    t.originalData = structuredClone(e),
                    CharacterUtil.recalculateCharacterMmrHistoryStats(),
                    CharacterUtil.filterCharacterMmrHistory()),
                t
        }
        )
    }
    static updateCharacterMmrHistoryView() {
        var e;
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        if (null == t || null === (e = t.history) || void 0 === e || !e.data)
            return;
        const a = t.parameters
            , r = t.history
            , n = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR)
            , o = "true" === (localStorage.getItem("mmr-x-type") || "true") ? "time" : "category"
            , l = []
            , s = {
                index: {},
                history: {}
            };
        ChartUtil.CHART_RAW_DATA.set("mmr-table", {
            rawData: s,
            additionalDataGetter: CharacterUtil.getAdditionalMmrHistoryData
        }),
            ChartUtil.batchExecute("mmr-table", () => ChartUtil.setCustomConfigOption("mmr-table", "region", n.members.character.region), !1);
        const i = CharacterUtil.MMR_Y_VALUE_OPERATIONS.get(a.yAxis).get;
        for (const e of r.data) {
            const t = Object.values(e.history)[0].length
                , a = TeamUtil.parseLegacyId(e.staticData[TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID.fullName]).race || CharacterUtil.ALL_RACE;
            s.history[a.name] = e;
            for (let r = 0; r < t; r++) {
                const t = e.history[TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP.fullName][r];
                let n = l[t];
                n || (n = {},
                    l[t] = n,
                    s.index[t] = {}),
                    n[a.fullName] = i(e, r),
                    s.index[t][a.name] = r
            }
        }
        TableUtil.updateVirtualColRowTable(document.getElementById("mmr-table"), l, e => {
            a.showLeagues && CharacterUtil.decorateMmrPointsIndex(e, s),
                ChartUtil.CHART_RAW_DATA.get("mmr-table").data = e
        }
            , a.queueData.queue == TEAM_FORMAT._1V1 ? (e, t) => EnumUtil.enumOfName(e, RACE).order - EnumUtil.enumOfName(t, RACE).order : null, a.queueData.queue == TEAM_FORMAT._1V1 ? e => EnumUtil.enumOfName(e, RACE).name : e => e.toLowerCase(), "time" == o ? e => 1e3 * parseInt(e) : e => Util.DATE_TIME_FORMAT.format(new Date(1e3 * parseInt(e)))),
            document.getElementById("mmr-history-filters").textContent = "(" + a.queueData.queue.name + (a.from ? ", " + Util.DATE_TIME_FORMAT.format(a.from) + " - " + Util.DATE_TIME_FORMAT.format(a.to) : "") + ", " + r.stats.length + " entries)",
            document.querySelector("#mmr-chart-container").classList.remove("d-none")
    }
    static filterMmrHistoryLastSeason(e) {
        if (!e[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName])
            return e;
        const t = Object.keys(e)
            , a = {};
        for (const e of t)
            a[e] = [];
        for (let r = 0; r < e[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName].length; r++) {
            const n = r + 1 == e[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName].length ? null : e[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName][r + 1];
            if (e[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName][r] != n)
                for (const n of t)
                    a[n].push(e[n][r])
        }
        return a
    }
    static calculateMmrHistoryMax(e, t, a) {
        const r = Object.values(e.history)[0].length;
        return a(Array.from(Array(r).keys()).map(a => t(e, a)))
    }
    static filterMmrHistoryBestRace(e, t, a, r) {
        return 1 == e.length ? e[0] : e.map(e => [e, CharacterUtil.calculateMmrHistoryMax(e, t, a)]).sort((e, t) => r(e[1], t[1]))[0][0]
    }
    static filterCharacterMmrHistory() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        if (e.parameters.endOfSeason)
            for (let t = 0; t < e.history.data.length; t++)
                e.history.data[t].history = CharacterUtil.filterMmrHistoryLastSeason(e.history.data[t].history);
        if (e.parameters.bestRaceOnly) {
            const t = CharacterUtil.MMR_Y_VALUE_OPERATIONS.get(e.parameters.yAxis);
            e.history.data = [CharacterUtil.filterMmrHistoryBestRace(e.history.data, t.get, t.max, t.compare)]
        }
        (e.parameters.endOfSeason || e.parameters.bestRaceOnly) && CharacterUtil.recalculateCharacterMmrHistoryStats(),
            e.parameters.endOfSeason && null != e.history.data && CharacterUtil.calculateMmrHistoryTimestampIndex(e.history.data)
    }
    static updateCharacterMmrHistory() {
        CharacterUtil.resetCharacterMmrHistory(),
            CharacterUtil.setCharacterMmrParameters();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.parameters
            , t = new Set(CharacterUtil.MMR_Y_REQUIRED_HISTORY_COLUMNS.get(e.yAxis));
        return e.showLeagues && t.add(TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_TYPE),
            e.endOfSeason && t.add(TEAM_HISTORY_HISTORY_COLUMN.SEASON),
            e.historyColumns = t,
            CharacterUtil.updateCharacterMmrHistoryModel(null, e.queueData.legacyUids, TEAM_HISTORY_GROUP_MODE.LEGACY_UID, e.from, e.to, [TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID], t).then(e => (CharacterUtil.updateCharacterMmrHistoryView(),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }))
    }
    static setCharacterMmrParameters() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
        return !(!e && null != t.mmrHistory.parameters) && (t.mmrHistory.parameters = CharacterUtil.createCharacterMmrParameters(),
            !0)
    }
    static getCharacterMmrQueueData() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character
            , t = EnumUtil.enumOfFullName(e.region, REGION)
            , a = {
                realm: e.realm,
                id: e.battlenetId
            }
            , r = document.getElementById("mmr-queue-filter")
            , n = EnumUtil.enumOfFullName(r.options[r.selectedIndex].value, TEAM_FORMAT)
            , o = n == TEAM_FORMAT._1V1 ? TEAM_TYPE.ARRANGED : TEAM_TYPE.RANDOM;
        return {
            queue: n,
            teamType: o,
            legacyUids: n == TEAM_FORMAT._1V1 ? TeamUtil.createLegacyUidsForAllRaces(n, o, t, a) : [TeamUtil.createLegacyUid(n, o, t, TeamUtil.createLegacyIdSection(a))]
        }
    }
    static createCharacterMmrParameters() {
        const e = document.getElementById("mmr-depth").value || null
            , t = e ? new Date : null
            , a = e ? new Date(t.valueOf() - 24 * e * 60 * 60 * 1e3) : null
            , r = localStorage.getItem("mmr-y-axis") || "mmr";
        return {
            from: a,
            to: t,
            queueData: CharacterUtil.getCharacterMmrQueueData(),
            yAxis: r,
            endOfSeason: "true" === (localStorage.getItem("mmr-season-last") || "false"),
            showLeagues: "true" === (localStorage.getItem("mmr-leagues") || "false"),
            bestRaceOnly: "true" === (localStorage.getItem("mmr-best-race") || "false")
        }
    }
    static enqueueUpdateCharacterMmrHistory() {
        return Util.load(document.querySelector("#mmr-history-loading"), e => CharacterUtil.updateCharacterMmrHistory())
    }
    static resetUpdateCharacterMmrHistoryAllLoading() {
        Util.resetLoadingIndicator(document.querySelector("#mmr-history-all-loading"))
    }
    static updateCharacterMmrHistoryAll() {
        var e;
        let t = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        const a = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH)
            , r = null === (e = a.mmrHistory) || void 0 === e ? void 0 : e.parameters;
        return a.mmrHistory = {},
            t || (a.mmrHistory.parameters = r),
            Promise.allSettled([CharacterUtil.enqueueUpdateCharacterMmrHistory(), CharacterUtil.enqueueUpdateCharacterMmrHistorySummary()]).then(e => (Util.throwFirstSettledError(e),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }))
    }
    static enqueueUpdateCharacterMmrHistoryAll() {
        let e = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        return Util.load(document.querySelector("#mmr-history-all-loading"), t => CharacterUtil.updateCharacterMmrHistoryAll(e))
    }
    static mmrYValueGetter(e) {
        return CharacterUtil.MMR_Y_VALUE_GETTERS.get(e || "default")
    }
    static getLastSeasonTeamSnapshotDates(e) {
        const t = new Map;
        let a = 999;
        for (let r = e.length - 1; r > -1; r--) {
            const n = e[r];
            n.season < a && (a = n.season,
                t.set(a, Util.parseIsoDateTime(n.teamState.dateTime)))
        }
        return t
    }
    static convertTeamToTeamSnapshot(e, t, a) {
        const r = Session.currentSeasonsMap.get(e.region).get(e.season)[0];
        if (a)
            return CharacterUtil.createTeamSnapshot(e, r.nowOrEnd);
        const n = t.get(e.season + 1) || Session.currentSeasonsMap.get(e.region).get(e.season + 1) ? (t.get(e.season) ? new Date(t.get(e.season).getTime() + 1e3) : null) || new Date(r.nowOrEnd.getTime() - CharacterUtil.TEAM_SNAPSHOT_SEASON_END_OFFSET_MILLIS) : new Date;
        return CharacterUtil.createTeamSnapshot(e, n)
    }
    static calculateMmrHistoryTopPercentage(e) {
        e.globalTopPercent || (e.teamState.globalTopPercent = e.teamState.globalRank / e.teamState.globalTeamCount * 100,
            e.teamState.regionTopPercent = e.teamState.regionRank / e.teamState.regionTeamCount * 100)
    }
    static decorateMmrPointsIndex(e, t) {
        const a = [];
        e.headers.forEach((r, n) => {
            const o = t.history[r]
                , l = [];
            a.push(l);
            let s = null;
            Array.from(Object.values(t.index)).forEach((t, a) => {
                const i = t[r];
                if (null == i)
                    return;
                const c = o.history[TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_TYPE.fullName][i];
                if (c != s && Number.isFinite(e.values[n][a])) {
                    const t = {
                        name: "league-" + r + "-" + i,
                        type: "point",
                        pointStyle: SC2Restful.IMAGES.get(EnumUtil.enumOfId(c, LEAGUE).name.toLowerCase()),
                        xValue: e.rowHeaders[a],
                        yValue: e.values[n][a]
                    };
                    l.push(t),
                        s = c
                }
            }
            )
        }
        ),
            e.dataAnnotations = a
    }
    static decorateMmrPoints(e, t, a, r) {
        let n = !(arguments.length > 4 && void 0 !== arguments[4]) || arguments[4];
        const o = [];
        e.headers.forEach((a, l) => {
            const s = [];
            o.push(s);
            let i = null;
            t.forEach((t, o) => {
                const c = r(t, a);
                if (!c)
                    return;
                const d = e.rowHeaders[o];
                if (c.league.type != i && n && Number.isFinite(e.values[l][o])) {
                    const t = {
                        name: "league-" + a + "-" + d,
                        type: "point",
                        pointStyle: SC2Restful.IMAGES.get(EnumUtil.enumOfId(c.league.type, LEAGUE).name.toLowerCase()),
                        xValue: d,
                        yValue: e.values[l][o]
                    };
                    s.push(t),
                        i = c.league.type
                }
            }
            )
        }
        ),
            e.dataAnnotations = o
    }
    static getGamesAndAverageMmrSortedArray(e) {
        const t = CharacterUtil.getGamesAndAverageMmr(e)
            , a = Object.entries(t);
        return a.sort((e, t) => t[1].maximumMmr - e[1].maximumMmr),
            a
    }
    static addLegacyIdData(e) {
        e.legacyIdData = TeamUtil.parseLegacyId(e.staticData[TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID.fullName])
    }
    static resetCharacterMmrHistorySummaryNumericView() {
        ElementUtil.removeChildren(document.querySelector("#mmr-summary-table tbody"))
    }
    static resetCharacterMmrHistorySummaryProgressView() {
        ElementUtil.removeChildren(document.querySelector("#mmr-tier-progress-table tbody"))
    }
    static resetCharacterMmrHistorySummaryView() {
        CharacterUtil.resetCharacterMmrHistorySummaryNumericView(),
            CharacterUtil.resetCharacterMmrHistorySummaryProgressView()
    }
    static resetCharacterMmrHistorySummaryModel() {
        var e;
        null === (e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory) || void 0 === e || delete e.summary
    }
    static resetCharacterMmrHistorySummaryLoading() {
        Util.resetLoadingIndicator(document.querySelector("#mmr-summary-table-container"))
    }
    static resetCharacterMmrHistorySummary() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        CharacterUtil.resetCharacterMmrHistorySummaryModel(),
            CharacterUtil.resetCharacterMmrHistorySummaryView(),
            e && CharacterUtil.resetCharacterMmrHistorySummaryLoading()
    }
    static updateMmrHistorySummaryWithTeams(e, t) {
        const a = Util.toMap(e, e => TeamUtil.createLegacyUidFromHistoryStaticData(e.staticData));
        for (const e of t) {
            const t = a.get(e.legacyUid);
            null != t && (t.summary[TEAM_HISTORY_SUMMARY_COLUMN.REGION_RANK_LAST.fullName] = e.regionRank,
                t.summary[TEAM_HISTORY_SUMMARY_COLUMN.REGION_TEAM_COUNT_LAST.fullName] = e.regionTeamCount)
        }
    }
    static updateCharacterMmrHistorySummaryModel(e, t, a, r, n, o, l) {
        return Promise.all([TeamUtil.getHistorySummary(e, t, a, r, n, o, l), TeamUtil.getTeamGroup(e, t, Session.currentSeasons[0].battlenetId)]).then(e => {
            const t = e[0]
                , a = e[1];
            return t.length > 0 && (t.forEach(CharacterUtil.addLegacyIdData),
                t.sort((e, t) => t.summary[TEAM_HISTORY_SUMMARY_COLUMN.RATING_MAX.fullName] - e.summary[TEAM_HISTORY_SUMMARY_COLUMN.RATING_MAX.fullName]),
                a.length > 0 && CharacterUtil.updateMmrHistorySummaryWithTeams(t, a)),
                Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.summary = t,
                t
        }
        )
    }
    static updateCharacterMmrHistorySummaryNumericView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        e.summary && CharacterUtil.updateGamesAndAverageMmrTable(document.querySelector("#mmr-summary-table"), e.summary, e.parameters.numericSummaryColumns)
    }
    static updateCharacterMmrHistorySummaryProgressView() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        e.summary && CharacterUtil.updateTierProgressTable(document.querySelector("#mmr-tier-progress-table"), e.summary)
    }
    static updateCharacterMmrHistorySummaryView() {
        CharacterUtil.updateCharacterMmrHistorySummaryNumericView(),
            CharacterUtil.updateCharacterMmrHistorySummaryProgressView()
    }
    static updateCharacterMmrHistorySummary() {
        CharacterUtil.resetCharacterMmrHistorySummary(),
            CharacterUtil.setCharacterMmrParameters();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.parameters;
        return e.numericSummaryColumns = new Set(CharacterUtil.MMR_Y_REQUIRED_NUMERIC_SUMMARY_COLUMNS.get(e.yAxis)),
            e.progressSummaryColumns = new Set(CharacterUtil.MMR_REQUIRED_PROGRESS_SUMMARY_COLUMNS),
            e.summaryColumns = new Set([...e.numericSummaryColumns, ...e.progressSummaryColumns]),
            CharacterUtil.updateCharacterMmrHistorySummaryModel(null, e.queueData.legacyUids, TEAM_HISTORY_GROUP_MODE.LEGACY_UID, e.from, e.to, [TEAM_HISTORY_STATIC_COLUMN.QUEUE_TYPE, TEAM_HISTORY_STATIC_COLUMN.TEAM_TYPE, TEAM_HISTORY_STATIC_COLUMN.REGION, TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID], e.summaryColumns).then(e => (CharacterUtil.updateCharacterMmrHistorySummaryView(),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }))
    }
    static enqueueUpdateCharacterMmrHistorySummary() {
        return Util.load(document.querySelector("#mmr-summary-table-container"), e => CharacterUtil.updateCharacterMmrHistorySummary())
    }
    static updateMmrHistorySummaryTableBody(e, t, a) {
        for (const n of t) {
            const t = e.insertRow();
            t.insertCell().appendChild(ElementUtil.createRaceImage(n.legacyIdData.race));
            for (const e of a) {
                var r;
                const a = n.summary[e.fullName]
                    , o = t.insertCell();
                null != a && (o.textContent = (null === (r = CharacterUtil.MMR_Y_SUMMARY_COLUMN_FORMATTERS.get(e)) || void 0 === r ? void 0 : r(a)) || a)
            }
        }
    }
    static updateMmrHistorySummaryTableHeaders(e, t) {
        (!(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]) && ElementUtil.removeChildren(e);
        const a = e.insertRow();
        TableUtil.createTh(a).textContent = "Race";
        for (const e of t)
            TableUtil.createTh(a).textContent = e.textContent
    }
    static updateGamesAndAverageMmrTable(e, t, a) {
        const r = e.querySelector(":scope thead");
        if (CharacterUtil.updateMmrHistorySummaryTableHeaders(r, a),
            !t)
            return;
        const n = e.querySelector(":scope tbody");
        CharacterUtil.updateMmrHistorySummaryTableBody(n, t, a)
    }
    static updateTierProgressTable(e, t) {
        const a = e.querySelector(":scope tbody");
        ElementUtil.removeChildren(a);
        for (const e of t) {
            const t = CharacterUtil.createTierProgress(e.summary[TEAM_HISTORY_SUMMARY_COLUMN.REGION_RANK_LAST.fullName], e.summary[TEAM_HISTORY_SUMMARY_COLUMN.REGION_TEAM_COUNT_LAST.fullName]);
            if (!t)
                continue;
            const r = a.insertRow();
            r.insertCell().appendChild(ElementUtil.createRaceImage(e.legacyIdData.race)),
                TableUtil.insertCell(r, "cell-main").appendChild(t)
        }
    }
    static createTierProgress(e, t) {
        if (null == t || null == e)
            return null;
        const a = Util.getLeagueRange(e, t);
        let r, n, o, l;
        a.league == LEAGUE.GRANDMASTER ? (l = {
            league: LEAGUE.GRANDMASTER,
            tierType: 0
        },
            r = SC2Restful.GM_COUNT,
            n = 1,
            o = e) : (l = a.league == LEAGUE.MASTER && 0 == a.tierType ? CharacterUtil.getGrandmasterTierRange(t) : TIER_RANGE[a.order - 1],
                r = a.bottomThreshold,
                n = l.bottomThreshold,
                o = e / t * 100);
        const s = ElementUtil.createProgressBar(o, r, n);
        s.classList.add("tier-progress", "flex-grow-1"),
            s.querySelector(":scope .progress-bar").classList.add("bg-" + a.league.name.toLowerCase());
        const i = document.createElement("div");
        return i.classList.add("text-nowrap", "d-flex", "gap-tiny"),
            i.appendChild(SC2Restful.IMAGES.get(a.league.name.toLowerCase()).cloneNode()),
            i.appendChild(SC2Restful.IMAGES.get("tier-" + (a.tierType + 1)).cloneNode()),
            i.appendChild(s),
            i.appendChild(SC2Restful.IMAGES.get(l.league.name.toLowerCase()).cloneNode()),
            i.appendChild(SC2Restful.IMAGES.get("tier-" + (l.tierType + 1)).cloneNode()),
            i
    }
    static getGrandmasterTierRange(e) {
        return {
            league: LEAGUE.GRANDMASTER,
            tierType: 0,
            bottomThreshold: SC2Restful.GM_COUNT / e * 100
        }
    }
    static getGamesAndAverageMmrString(e) {
        let t = "games/avg mmr/max mmr";
        const a = CharacterUtil.getGamesAndAverageMmr(e);
        t += CharacterUtil.getGamesAndAverageMmrEntryString(a, "all");
        for (const e of Object.values(RACE))
            t += CharacterUtil.getGamesAndAverageMmrEntryString(a, e.name);
        return t
    }
    static getGamesAndAverageMmrEntryString(e, t) {
        const a = e[t.toUpperCase()];
        return a ? ", ".concat(t.toLowerCase(), ": ").concat(a.games, "/").concat(a.averageMmr, "/").concat(a.maximumMmr) : ""
    }
    static getGamesAndAverageMmr(e) {
        const t = {}
            , a = Util.groupBy(e, e => e.race);
        for (const [e, r] of a.entries()) {
            const a = r.filter(e => !e.injected);
            if (0 == a.length)
                continue;
            const n = a.reduce((e, t, a, r) => {
                if (0 == a)
                    return e;
                if (t.teamState.teamId != r[a - 1].teamState.teamId)
                    return e + t.teamState.games;
                const n = t.teamState.games - r[a - 1].teamState.games;
                return e + (n > -1 ? n : t.teamState.games)
            }
                , 1)
                , o = a.map(e => e.teamState.rating)
                , l = o[o.length - 1]
                , s = o.reduce((e, t) => e + t, 0) / o.length || 0
                , i = o.reduce((e, t) => Math.max(e, t))
                , c = r[r.length - 1];
            t[e] = {
                games: n,
                lastMmr: l,
                averageMmr: Math.round(s),
                maximumMmr: i,
                lastTeamState: c
            }
        }
        return t
    }
    static injectMmrFlatLines(e, t, a, r, n) {
        const o = CharacterUtil.calculateFirstMmrDate()
            , l = []
            , s = new Date;
        CharacterUtil.injectLatestTeamMmrSnapshots(t, a, r, n, l, o);
        for (const e of t.values())
            CharacterUtil.injectMmrHistoryHeader(e, l, o),
                CharacterUtil.fillMmrGaps(e, l, s),
                e.sort((e, t) => e.teamState.dateTime.getTime() - t.teamState.dateTime.getTime()),
                CharacterUtil.injectMmrHistoryTail(e, l, s);
        return e.concat(l).sort((e, t) => e.teamState.dateTime.getTime() - t.teamState.dateTime.getTime())
    }
    static injectLatestTeamMmrSnapshots(e, t, a, r, n, o) {
        const l = t.filter(e => e.league.queueType == a && e.league.teamType == r && Session.currentSeasonsMap.get(e.season)[0].nowOrEnd.getTime() > o.getTime());
        if (0 != l.length)
            if (a == TEAM_FORMAT._1V1.code)
                for (const t of Object.values(RACE)) {
                    const a = e.get(t.name.toUpperCase());
                    if ((a ? a.length : 0) > 0)
                        continue;
                    let r = l.filter(e => TeamUtil.getFavoriteRace(e.members[0]) == t).sort((e, t) => t.season - e.season);
                    if (0 == r.length)
                        continue;
                    const s = CharacterUtil.createTeamSnapshot(r[0], o, !0);
                    e.set(t.name, [s]),
                        n.push(s)
                }
            else {
                const t = e.get("ALL");
                if ((t ? t.length : 0) > 0)
                    return;
                let a = l.sort((e, t) => t.season - e.season);
                const r = CharacterUtil.createTeamSnapshot(a[0], o, !0);
                r.race = "ALL",
                    e.set("ALL", [r]),
                    n.push(r)
            }
    }
    static injectMmrHistoryHeader(e, t, a) {
        if (0 == e.length || Math.abs(e[0].teamState.dateTime.getTime() - a.getTime()) < 2e3 || Session.currentSeasonsMap.get(e[0].season)[0].start.getTime() > a.getTime())
            return;
        const r = CharacterUtil.cloneMmrPoint(e[0], a);
        e.splice(0, 0, r),
            t.push(r)
    }
    static fillMmrGaps(e, t, a) {
        const r = [];
        for (let t = 0; t < e.length; t++) {
            const a = e[t]
                , n = e[0 == t ? 0 : t - 1]
                , o = Math.floor((a.teamState.dateTime.getTime() - n.teamState.dateTime.getTime()) / Util.DAY_MILLIS);
            CharacterUtil.injectMmrPoints(e, r, n, o)
        }
        Array.prototype.push.apply(t, r),
            Array.prototype.push.apply(e, r)
    }
    static injectMmrHistoryTail(e, t, a) {
        const r = [];
        CharacterUtil.injectMmrPoints(e, r, e[e.length - 1], Math.floor((a.getTime() - e[e.length - 1].teamState.dateTime.getTime()) / Util.DAY_MILLIS));
        const n = r.length > 0 ? r[r.length - 1] : e[e.length - 1]
            , o = Session.currentSeasonsMap.get(n.season)[0].nowOrEnd;
        n.teamState.dateTime.getTime() < o.getTime() && r.push(CharacterUtil.cloneMmrPoint(n, o)),
            Array.prototype.push.apply(t, r),
            Array.prototype.push.apply(e, r)
    }
    static injectMmrPoints(e, t, a, r) {
        const n = Session.currentSeasonsMap.get(a.season)[0].nowOrEnd;
        for (let e = 0; e < r; e++) {
            let o = new Date(a.teamState.dateTime.getTime() + Util.DAY_MILLIS * (e + 1));
            o.getTime() > n.getTime() && (o = n,
                e = r),
                o.setHours(0),
                o.setMinutes(0),
                o.setSeconds(0, 0);
            const l = CharacterUtil.cloneMmrPoint(a, o);
            t.push(l)
        }
    }
    static createTeamSnapshot(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = {
            teamId: e.id,
            dateTime: t,
            divisionId: e.divisionId,
            wins: e.wins,
            games: e.wins + e.losses + e.ties,
            rating: e.rating
        };
        return TeamUtil.isCheaterTeam(e) || Util.isUndefinedRank(e.globalRank) || (r.globalRank = e.globalRank,
            r.globalTeamCount = e.globalTeamCount,
            r.globalTopPercent = e.globalRank / e.globalTeamCount * 100,
            r.regionRank = e.regionRank,
            r.regionTeamCount = e.regionTeamCount,
            r.regionTopPercent = e.regionRank / e.regionTeamCount * 100,
            r.leagueRank = e.leagueRank,
            r.leagueTeamCount = e.leagueTeamCount),
        {
            team: e,
            teamState: r,
            race: TeamUtil.getFavoriteRace(e.members[0]).name.toUpperCase(),
            league: {
                type: e.league.type,
                teamType: e.league.teamType,
                queueType: e.league.queueType
            },
            tier: e.tierType,
            season: e.season,
            generated: !0,
            injected: a
        }
    }
    static cloneMmrPoint(e, t) {
        const a = Object.assign({}, e);
        return a.teamState = Object.assign({}, a.teamState, {
            dateTime: t
        }),
            a.generated = !0,
            a
    }
    static calculateFirstMmrDate() {
        const e = new Date(Date.now() - Util.DAY_MILLIS * SC2Restful.MMR_HISTORY_DAYS_MAX);
        return SC2Restful.MMR_HISTORY_START_DATE.getTime() - e.getTime() > 0 ? SC2Restful.MMR_HISTORY_START_DATE : e
    }
    static copyMmrHistory(e, t) {
        const a = Object.keys(e.history)
            , r = Object.values(e.history)[0].length
            , n = [];
        for (let o = 0; o < r; o++) {
            const l = e.history[TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP.fullName][o]
                , s = t.timestampIndex[l];
            if (null != s) {
                for (const n of a)
                    t.history[n] || (t.history[n] = new Array(r)),
                        t.history[n][s] = e.history[n][o];
                n.push(l)
            }
        }
        return n
    }
    static isMmrHistoryEntryComplete(e, t) {
        var a, r;
        return null != (null === (a = e.history[TEAM_HISTORY_HISTORY_COLUMN.GLOBAL_TEAM_COUNT.fullName]) || void 0 === a ? void 0 : a[t]) || (null == e || null === (r = e.completeTimestamps) || void 0 === r ? void 0 : r.has(e.history[TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP.fullName][t]))
    }
    static updateCharacterMmrHistoryWithCompleteData(e) {
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory
            , a = new Date(e.valueOf() + 1e3);
        return TeamUtil.getHistory(null, t.parameters.queueData.legacyUids, TEAM_HISTORY_GROUP_MODE.LEGACY_UID, e, a, [TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID], Object.values(TEAM_HISTORY_HISTORY_COLUMN)).then(e => {
            e.forEach(e => {
                const a = t.history.data.find(t => t.staticData[TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID.fullName] === e.staticData[TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID.fullName]);
                null != a && (null == a.completeTimestamps && (a.completeTimestamps = new Set),
                    CharacterUtil.copyMmrHistory(e, a).forEach(e => a.completeTimestamps.add(e)))
            }
            )
        }
        )
    }
    static requeueUpdateCharacterMmrHistoryWithCompleteData(e, t) {
        return ElementUtil.clearAndSetInputTimeout(CharacterUtil.MMR_HISTORY_COMPLETE_POINT_TASK_NAME, null != t ? () => CharacterUtil.updateCharacterMmrHistoryWithCompleteData(e).then(t) : () => CharacterUtil.updateCharacterMmrHistoryWithCompleteData(e), CharacterUtil.MMR_HISTORY_COMPLETE_POINT_TIMEOUT)
    }
    static getAdditionalMmrHistoryData(e, t, a, r) {
        var n, o, l, s, i, c, d, u, m, p, h, g;
        const S = t.datasets[r].label
            , A = e.history[S]
            , T = A.history
            , E = Object.values(e.index)[a][S]
            , C = new Date(1e3 * T[TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP.fullName][E]);
        ElementUtil.clearInputTimeout(CharacterUtil.MMR_HISTORY_COMPLETE_POINT_TASK_NAME),
            CharacterUtil.isMmrHistoryEntryComplete(A, E) || CharacterUtil.requeueUpdateCharacterMmrHistoryWithCompleteData(C, () => ChartUtil.CHARTS.get("mmr-table").tooltip.update(!0, !1));
        const U = [];
        return U.push((null === (n = T[TEAM_HISTORY_HISTORY_COLUMN.SEASON.fullName]) || void 0 === n ? void 0 : n[E]) || CharacterUtil.MMR_HISTORY_PLACEHOLDER),
            U.push(CharacterUtil.createMmrHistoryLeague(null === (o = T[TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_TYPE.fullName]) || void 0 === o ? void 0 : o[E], null === (l = T[TEAM_HISTORY_HISTORY_COLUMN.TIER_TYPE.fullName]) || void 0 === l ? void 0 : l[E])),
            U.push((null === (s = T[TEAM_HISTORY_HISTORY_COLUMN.RATING.fullName]) || void 0 === s ? void 0 : s[E]) || CharacterUtil.MMR_HISTORY_PLACEHOLDER),
            U.push(CharacterUtil.createMmrHistoryGames(null === (i = T[TEAM_HISTORY_HISTORY_COLUMN.GAMES.fullName]) || void 0 === i ? void 0 : i[E], null === (c = T[TEAM_HISTORY_HISTORY_COLUMN.WINS.fullName]) || void 0 === c ? void 0 : c[E])),
            U.push(CharacterUtil.createMmrHistoryRank(null === (d = T[TEAM_HISTORY_HISTORY_COLUMN.GLOBAL_RANK.fullName]) || void 0 === d ? void 0 : d[E], null === (u = T[TEAM_HISTORY_HISTORY_COLUMN.GLOBAL_TEAM_COUNT.fullName]) || void 0 === u ? void 0 : u[E])),
            U.push(CharacterUtil.createMmrHistoryRank(null === (m = T[TEAM_HISTORY_HISTORY_COLUMN.REGION_RANK.fullName]) || void 0 === m ? void 0 : m[E], null === (p = T[TEAM_HISTORY_HISTORY_COLUMN.REGION_TEAM_COUNT.fullName]) || void 0 === p ? void 0 : p[E])),
            U.push(CharacterUtil.createMmrHistoryRank(null === (h = T[TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_RANK.fullName]) || void 0 === h ? void 0 : h[E], null === (g = T[TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_TEAM_COUNT.fullName]) || void 0 === g ? void 0 : g[E])),
            U
    }
    static createMmrHistoryLeague(e, t) {
        return null == e ? CharacterUtil.MMR_HISTORY_PLACEHOLDER : TeamUtil.createLeagueDiv({
            league: {
                type: e
            },
            tierType: t
        })
    }
    static createMmrTooltipPlaceholder() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 2
            , t = arguments.length > 1 ? arguments[1] : void 0;
        const a = document.createElement("span");
        a.appendChild(document.createTextNode(CharacterUtil.MMR_HISTORY_PLACEHOLDER));
        for (let t = 0; t < e - 1; t++)
            a.appendChild(document.createElement("br")),
                a.appendChild(document.createTextNode(CharacterUtil.MMR_HISTORY_PLACEHOLDER));
        return t && t.forEach(e => a.classList.add(e)),
            a
    }
    static createMmrHistoryGames(e, t) {
        if (null == e)
            return CharacterUtil.createMmrTooltipPlaceholder();
        const a = e + "</br>" + (null != t ? "".concat(Math.round(t / e * 100), "%") : CharacterUtil.MMR_HISTORY_PLACEHOLDER)
            , r = document.createElement("span");
        return r.innerHTML = a,
            r
    }
    static createMmrHistoryRank(e, t) {
        if (null == e || null == t)
            return CharacterUtil.createMmrTooltipPlaceholder(2, ["tooltip-mmr-rank"]);
        const a = document.createElement("span");
        return a.classList.add("tooltip-mmr-rank"),
            a.innerHTML = "".concat(Util.NUMBER_FORMAT.format(e), "/").concat(Util.NUMBER_FORMAT.format(t), "<br/>\n            (").concat(Util.DECIMAL_FORMAT.format(e / t * 100), "%)"),
            a
    }
    static createMmrHistoryGamesFromTeamState(e) {
        return CharacterUtil.createMmrHistoryGames(e.teamState.games, e.teamState.wins)
    }
    static appendAdditionalMmrHistoryRanks(e, t) {
        t.push(CharacterUtil.createMmrHistoryRank(e.teamState.globalRank, e.teamState.globalTeamCount)),
            t.push(CharacterUtil.createMmrHistoryRank(e.teamState.regionRank, e.teamState.regionTeamCount)),
            t.push(CharacterUtil.createMmrHistoryRank(e.teamState.leagueRank, e.teamState.leagueTeamCount))
    }
    static updateCharacterLinkedCharacters() {
        CharacterUtil.resetCharacterLinkedCharacters();
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR);
        return CharacterUtil.updateCharacterLinkedCharactersModel(e.members).then(e => (CharacterUtil.updateCharacterLinkedCharactersView(),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static enqueueUpdateCharacterLinkedCharacters() {
        return Util.load(document.querySelector("#player-stats-characters"), e => CharacterUtil.updateCharacterLinkedCharacters())
    }
    static resetCharacterLinkedCharacters() {
        delete Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedDistinctCharacters,
            ElementUtil.removeChildren(document.querySelector("#linked-characters-table tbody"))
    }
    static updateCharacterLinkedCharactersModel(e) {
        const t = CharacterUtil.createTopCharacterGroupIdParameters(e);
        return GroupUtil.getCharacters(t).then(e => Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).linkedDistinctCharacters = e)
    }
    static updateCharacterLinkedCharactersView() {
        const e = document.getElementById("linked-characters-table");
        for (const t of e.querySelectorAll(":scope tr.active"))
            t.classList.remove("active");
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
        if (!t.linkedDistinctCharacters)
            return;
        const a = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR);
        CharacterUtil.updateCharacters(e, t.linkedDistinctCharacters);
        const r = e.querySelector(':scope a[data-character-id="' + a.members.character.id + '"]');
        null != r && r.closest("tr").classList.add("active")
    }
    static updateCharacterMatchesView() {
        const e = document.querySelector("#player-stats-matches-tab").closest(".nav-item")
            , t = document.querySelector("#player-stats-matches")
            , a = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH)
            , r = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id
            , n = a.matches.result;
        e.classList.remove("d-none"),
            t.classList.remove("d-none");
        const o = MatchUtil.updateMatchTable(document.querySelector("#matches"), n, e => Number.isInteger(e) ? e == r : e.member.character.id == r, "false" != localStorage.getItem("matches-historical-mmr"));
        return Model.DATA.get(VIEW.CHARACTER).set(VIEW_DATA.TEAMS, {
            result: a.teams ? a.teams.concat(o.teams) : o.teams
        }),
            Promise.resolve()
    }
    static findCharactersByName() {
        return CharacterUtil.updateCharacterSearch(document.getElementById("search-player-name").value)
    }
    static updateCharacterSearchModel(e) {
        const t = ROOT_CONTEXT_PATH + "api/characters?query=" + encodeURIComponent(e);
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse).then(t => (Model.DATA.get(VIEW.CHARACTER_SEARCH).set(VIEW_DATA.SEARCH, t),
            Model.DATA.get(VIEW.CHARACTER_SEARCH).set(VIEW_DATA.VAR, e),
            t))
    }
    static updateCharacterSearchView() {
        CharacterUtil.updateCharacters(document.getElementById("search-table"), Model.DATA.get(VIEW.CHARACTER_SEARCH).get(VIEW_DATA.SEARCH)),
            document.getElementById("search-result-all").classList.remove("d-none"),
            Util.scrollIntoViewById("search-result-all")
    }
    static updateCharacters(e, t) {
        const a = e.getElementsByTagName("tbody")[0];
        ElementUtil.removeChildren(a);
        const r = "false" != localStorage.getItem("player-search-stats-include-previous")
            , n = "false" != localStorage.getItem("player-search-stats-gray-out-previous");
        r || t.sort((e, t) => {
            const a = t.currentStats.rating - e.currentStats.rating;
            return 0 != a ? a : t.ratingMax - e.ratingMax
        }
        );
        for (let e = 0; e < t.length; e++) {
            const o = t[e]
                , l = o.currentStats.rating
                , s = r ? l ? o.currentStats : o.previousStats : o.currentStats
                , i = a.insertRow();
            i.insertCell().appendChild(ElementUtil.createImage("flag/", o.members.character.region.toLowerCase(), "table-image-long"));
            const c = i.insertCell();
            null != o.leagueMax && c.appendChild(ElementUtil.createImage("league/", EnumUtil.enumOfId(o.leagueMax, LEAGUE).name, "table-image table-image-square mr-1")),
                i.insertCell().textContent = o.ratingMax,
                i.insertCell().textContent = o.totalGamesPlayed,
                CharacterUtil.insertSearchStats(i, s, "rating", l, n),
                CharacterUtil.insertSearchStats(i, s, "gamesPlayed", l, n);
            const d = i.insertCell();
            d.classList.add("complex", "cell-main");
            const u = document.createElement("span");
            u.classList.add("row", "no-gutters");
            const m = TeamUtil.createMemberInfo(o, o.members);
            m.getElementsByClassName("player-name-container")[0].classList.add("c-divider");
            const p = document.createElement("span");
            p.classList.add("c-divider", "battle-tag"),
                p.textContent = o.members.account.battleTag,
                Util.isFakeBattleTag(o.members.account.battleTag) && p.classList.add("d-none"),
                m.getElementsByClassName("player-link-container")[0].appendChild(p),
                u.appendChild(m),
                d.appendChild(u),
                a.appendChild(i)
        }
    }
    static insertSearchStats(e, t, a, r, n) {
        const o = e.insertCell();
        n && !r && o.classList.add("text-secondary"),
            o.textContent = t[a]
    }
    static resetNextMatchesModel() {
        const e = Model.DATA.get(VIEW.CHARACTER);
        e && e.get(VIEW_DATA.VAR) && delete Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).matches
    }
    static resetNextMatchesView() {
        ElementUtil.removeChildren(document.querySelector("#matches tbody"))
    }
    static resetNextMatches() {
        CharacterUtil.resetNextMatchesModel(),
            CharacterUtil.resetNextMatchesView(),
            Util.resetLoadingIndicator(document.querySelector("#player-stats-matches"))
    }
    static enqueueResetNextMatchesView() {
        return Util.load(document.querySelector("#player-stats-matches-reset-loading"), e => (CharacterUtil.resetNextMatchesView(),
            Promise.resolve({
                data: null,
                status: LOADING_STATUS.COMPLETE
            })))
    }
    static enqueueUpdateNextMatches() {
        return Util.load(document.querySelector("#player-stats-matches"), e => CharacterUtil.updateNextMatches())
    }
    static updateNextMatches() {
        var e;
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
        t.matches || CharacterUtil.resetNextMatchesView();
        let a = localStorage.getItem("matches-type") || "all";
        "all" == a && (a = null);
        const r = null === (e = t.matches) || void 0 === e || null === (e = e.navigation) || void 0 === e ? void 0 : e.after;
        return CharacterUtil.updateNextMatchesModel(Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id, a, null != r ? new Cursor(r, NAVIGATION_DIRECTION.FORWARD) : null).then(e => {
            var t, a;
            (null == e || null === (t = e.result) || void 0 === t ? void 0 : t.length) > 0 && CharacterUtil.updateCharacterMatchesView();
            return {
                data: e,
                status: null == (null == e || null === (a = e.navigation) || void 0 === a ? void 0 : a.after) ? LOADING_STATUS.COMPLETE : LOADING_STATUS.NONE
            }
        }
        )
    }
    static updateNextMatchesModel(e, t, a) {
        const r = new URLSearchParams;
        return r.append("characterId", e),
            t && r.append("type", t),
            null != a && r.append(a.direction.relativePosition, a.token),
            GroupUtil.getMatches(r).then(e => {
                if (e.result.length > 0) {
                    const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH);
                    null != t.matches ? (t.matches.navigation = e.navigation,
                        t.matches.result = t.matches.result.concat(e.result)) : t.matches = e
                }
                return e
            }
            )
    }
    static updateCharacterSearch(e) {
        Util.setGeneratingStatus(STATUS.BEGIN),
            e = e.trim(),
            e = CharacterUtil.autoCompleteIfClanSearch(e);
        const t = new URLSearchParams;
        t.append("type", "search"),
            t.append("name", e);
        const a = t.toString();
        return CharacterUtil.updateCharacterSearchModel(e).then(r => {
            CharacterUtil.updateCharacterSearchView(),
                Util.setGeneratingStatus(STATUS.SUCCESS),
                Session.isHistorical || HistoryUtil.pushState({
                    type: "search",
                    name: e
                }, document.title, "?" + t.toString() + "#search"),
                Session.currentSearchParams = a
        }
        ).catch(e => Session.onPersonalException(e))
    }
    static autoCompleteIfClanSearch(e) {
        return e && e.startsWith("[") && !e.endsWith("]") ? e + "]" : e
    }
    static updatePersonalCharactersModel() {
        return Session.beforeRequest().then(e => fetch(ROOT_CONTEXT_PATH + "api/my/characters")).then(Session.verifyJsonResponse).then(e => (Model.DATA.get(VIEW.PERSONAL_CHARACTERS).set(VIEW_DATA.SEARCH, e),
            e))
    }
    static updatePersonalCharactersView() {
        const e = document.querySelector("#personal-characters-table");
        e && CharacterUtil.updateCharacters(e, Model.DATA.get(VIEW.PERSONAL_CHARACTERS).get(VIEW_DATA.SEARCH))
    }
    static updatePersonalCharacters() {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            CharacterUtil.updatePersonalCharactersModel().then(e => {
                CharacterUtil.updatePersonalCharactersView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateFollowingCharactersView() {
        const e = document.querySelector("#following-characters-table");
        e && CharacterUtil.updateCharacters(e, Model.DATA.get(VIEW.FOLLOWING_CHARACTERS).get(VIEW_DATA.SEARCH))
    }
    static enhanceSearchForm() {
        document.getElementById("form-search").addEventListener("submit", function (e) {
            e.preventDefault(),
                CharacterUtil.findCharactersByName()
        });
        const e = document.querySelector("#search-player-name");
        e.addEventListener("input", CharacterUtil.onSearchInput),
            e.addEventListener("keydown", e => {
                if (!e.key) {
                    const t = e.target.closest("form");
                    window.setTimeout(e => t.requestSubmit(t.querySelector(':scope [type="submit]"')), 1)
                }
            }
            )
    }
    static enhanceMmrForm() {
        document.getElementById("mmr-queue-filter").addEventListener("change", e => window.setTimeout(t => CharacterUtil.onMmrHistoryQueueChange(e), 0)),
            document.getElementById("mmr-depth").addEventListener("input", CharacterUtil.onMmrHistoryDepthChange),
            document.getElementById("mmr-best-race").addEventListener("change", e => window.setTimeout(t => CharacterUtil.onMmrHistoryBestRaceOnlyChange(e), 0)),
            document.getElementById("mmr-season-last").addEventListener("change", e => window.setTimeout(t => CharacterUtil.onMmrHistoryEndOfSeasonChange(e), 0)),
            document.getElementById("mmr-y-axis").addEventListener("change", e => window.setTimeout(t => {
                CharacterUtil.setMmrYAxis(e.target.value, e.target.getAttribute("data-chartable")),
                    CharacterUtil.onMmrHistoryYAxisChange(e)
            }
                , 0)),
            document.getElementById("mmr-x-type").addEventListener("change", e => window.setTimeout(e => CharacterUtil.updateCharacterMmrHistoryView(), 0)),
            document.getElementById("mmr-leagues").addEventListener("change", e => window.setTimeout(t => CharacterUtil.onMmrHistoryShowLeaguesChange(e), 0))
    }
    static onMmrHistoryShowLeaguesChange(e) {
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        t.parameters.showLeagues = "true" === (localStorage.getItem("mmr-leagues") || "false"),
            t.parameters.historyColumns.has(TEAM_HISTORY_HISTORY_COLUMN.LEAGUE_TYPE) ? CharacterUtil.updateCharacterMmrHistoryView() : CharacterUtil.reloadCharacterMmrHistory()
    }
    static onMmrHistoryEndOfSeasonChange(e) {
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory;
        t.parameters.endOfSeason = "true" === (localStorage.getItem("mmr-season-last") || "false"),
            t.parameters.historyColumns.has(TEAM_HISTORY_HISTORY_COLUMN.SEASON) ? CharacterUtil.refilterCharacterMmrHistory() : CharacterUtil.reloadCharacterMmrHistory()
    }
    static onMmrHistoryBestRaceOnlyChange(e) {
        Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.parameters.bestRaceOnly = "true" === (localStorage.getItem("mmr-best-race") || "false"),
            CharacterUtil.refilterCharacterMmrHistory()
    }
    static refilterCharacterMmrHistory() {
        CharacterUtil.resetCharacterMmrHistoryFilteredData(),
            CharacterUtil.filterCharacterMmrHistory(),
            CharacterUtil.updateCharacterMmrHistoryView()
    }
    static onMmrHistoryYAxisChange(e) {
        const t = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory
            , a = localStorage.getItem("mmr-y-axis") || "mmr";
        t.parameters.yAxis = a;
        const r = new Set(CharacterUtil.MMR_Y_REQUIRED_HISTORY_COLUMNS.get(a))
            , n = Object.keys(t.history.data[0].history);
        Array.from(r.values()).every(e => n.includes(e)) ? CharacterUtil.refilterCharacterMmrHistory() : CharacterUtil.reloadCharacterMmrHistory()
    }
    static reloadCharacterMmrHistory() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return CharacterUtil.resetCharacterMmrHistory(!0),
            CharacterUtil.setCharacterMmrParameters(e),
            CharacterUtil.enqueueUpdateCharacterMmrHistory()
    }
    static reloadCharacterMmrHistoryAll() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return CharacterUtil.resetCharacterMmrHistoryAll(!0),
            CharacterUtil.resetUpdateCharacterMmrHistoryAllLoading(),
            CharacterUtil.enqueueUpdateCharacterMmrHistoryAll(e)
    }
    static onMmrHistoryQueueChange(e) {
        Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.SEARCH).mmrHistory.parameters.queueData = CharacterUtil.getCharacterMmrQueueData(),
            CharacterUtil.reloadCharacterMmrHistoryAll()
    }
    static onMmrHistoryDepthChange(e) {
        const t = ElementUtil.INPUT_TIMEOUTS.get(e.target.id);
        null != t && window.clearTimeout(t),
            ElementUtil.INPUT_TIMEOUTS.set(e.target.id, window.setTimeout(e => CharacterUtil.reloadCharacterMmrHistoryAll(!0), ElementUtil.INPUT_TIMEOUT))
    }
    static setMmrYAxis(e, t) {
        "mmr" == e ? ChartUtil.setNormalYAxis(t) : ChartUtil.setTopPercentYAxis(t)
    }
    static onMmrInput(e) {
        const t = ElementUtil.INPUT_TIMEOUTS.get(e.target.id);
        null != t && window.clearTimeout(t),
            ElementUtil.INPUT_TIMEOUTS.set(e.target.id, window.setTimeout(e => CharacterUtil.updateCharacter(Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id), ElementUtil.INPUT_TIMEOUT))
    }
    static enhanceMatchTypeInput() {
        const e = document.querySelector("#matches-type");
        e && e.addEventListener("change", e => window.setTimeout(e => {
            const t = Model.DATA.get(VIEW.CHARACTER);
            t && t.get(VIEW_DATA.VAR) && (CharacterUtil.resetNextMatches(),
                CharacterUtil.enqueueUpdateNextMatches())
        }
            , 1))
    }
    static enhanceAutoClanSearch() {
        for (const e of document.querySelectorAll(".clan-auto-search"))
            e.addEventListener("click", GroupUtil.onGroupLinkClick)
    }
    static afterEnhance() {
        CharacterUtil.setMmrYAxis(document.getElementById("mmr-y-axis").value, document.getElementById("mmr-y-axis").getAttribute("data-chartable"))
    }
    static autoClanSearch(e) {
        e.preventDefault();
        const t = new URLSearchParams(e.target.getAttribute("href").substring(0, e.target.getAttribute("href").indexOf("#")));
        return document.querySelector("#search-player-name").value = t.get("name"),
            Session.isHistorical = !0,
            BootstrapUtil.hideActiveModal("error-generation").then(e => (Session.isHistorical = !1,
                CharacterUtil.findCharactersByName())).then(e => HistoryUtil.showAnchoredTabs()).then(e => window.scrollTo(0, 0))
    }
    static createTopCharacterGroupIdParameters(e) {
        const t = new URLSearchParams;
        return null != e.proId ? t.append("proPlayerId", e.proId) : t.append("accountId", e.account.id),
            t
    }
    static updateCharacterGroupLink(e, t) {
        const a = CharacterUtil.createTopCharacterGroupIdParameters(t)
            , r = GroupUtil.fullUrlSearchParams(a);
        e.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?").concat(r.toString(), "#group-group"))
    }
    static getCheaterFlag(e) {
        if (!e)
            return null;
        const t = e.filter(e => e.report.status);
        return t.some(e => e.report.restrictions) ? CHEATER_FLAG.CHEATER : t.some(e => !1 === e.report.restrictions) ? CHEATER_FLAG.SUSPICIOUS : CHEATER_FLAG.REPORTED
    }
    static updateCharacterReportsView() {
        const e = document.querySelector("#character-reports")
            , t = e.querySelector(":scope .character-reports")
            , a = Model.DATA.get(VIEW.CHARACTER).get("reports");
        a && 0 != a.length ? (e.classList.remove("d-none"),
            CharacterUtil.updateCharacterReportsSection(t, a, 4),
            document.querySelector("#player-info-additional-container .player-flag-class-cheater") || document.querySelector("#player-info-additional-container").appendChild(ElementUtil.createCheaterFlag(CharacterUtil.getCheaterFlag(a), !0))) : e.classList.add("d-none")
    }
    static updateAllCharacterReportsView() {
        const e = document.querySelector("#all-character-reports").querySelector(":scope .character-reports")
            , t = Model.DATA.get(VIEW.CHARACTER_REPORTS).get("reports");
        t && 0 != t.length && (CharacterUtil.updateCharacterReportsSection(e, t, 4),
            Session.updateReportsNotifications())
    }
    static updateCharacterReportsSection(e, t, a) {
        (!(arguments.length > 3 && void 0 !== arguments[3]) || arguments[3]) && ElementUtil.removeChildren(e);
        for (const r of t)
            e.appendChild(CharacterUtil.createReportElement(r, a));
        $(e).popover({
            html: !0,
            boundary: "body",
            placement: "auto",
            trigger: "hover",
            selector: '[data-toggle="popover"]',
            content: function () {
                return CharacterUtil.createDynamicVotersTable($(this)[0]).outerHTML
            }
        })
    }
    static createReportElement(e, t) {
        const a = ElementUtil.createElement("section", null, "player-character-report text-left mb-5")
            , r = ElementUtil.createElement("h" + t, null, "header d-flex flex-wrap-gap-05 py-1 mb-3 em-1 font-weight-bold bg-transparent-05 rounded");
        r.appendChild(TeamUtil.createPlayerLink(null, e.member, !1)),
            e.additionalMember && r.appendChild(TeamUtil.createPlayerLink(null, e.additionalMember, !1)),
            r.appendChild(ElementUtil.createElement("span", null, "type", e.report.type)),
            r.appendChild(CharacterUtil.createReportStatus(e.report.status));
        const n = ElementUtil.createElement("div", null, "evidence-container d-flex flex-column flex-wrap-gap-1-5");
        for (const a of e.evidence)
            n.appendChild(CharacterUtil.createEvidenceElement(a, t + 1));
        return a.appendChild(r),
            a.appendChild(n),
            a
    }
    static createEvidenceElement(e, t) {
        const a = ElementUtil.createElement("article", null, "evidence", null, [["data-report-id", e.evidence.playerCharacterReportId], ["data-evidence-id", e.evidence.id]]);
        return a.appendChild(CharacterUtil.createEvidenceHeader(e, t)),
            a.appendChild(ElementUtil.createElement("p", null, "content text-break", e.evidence.description)),
            a.appendChild(CharacterUtil.createEvidenceFooter(e)),
            a
    }
    static createEvidenceHeader(e, t) {
        const a = ElementUtil.createElement("h" + t, null, "header em-1 d-flex flex-wrap-gap-05");
        return a.appendChild(ElementUtil.createElement("span", null, "reporter font-weight-bold", e.reporterAccount ? e.reporterAccount.battleTag : "Anonymous")),
            a.appendChild(ElementUtil.createElement("time", null, "reporter text-secondary", Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e.evidence.created)), [["datetime", e.evidence.created]])),
            a
    }
    static createEvidenceFooter(e) {
        const t = document.createElement("footer");
        return t.classList.add("d-flex", "flex-wrap-gap"),
            t.appendChild(CharacterUtil.createVotesCell(e.votes.filter(e => 1 == e.vote.vote), "text-success", "bg-success", "true")),
            t.appendChild(CharacterUtil.createReportStatus(e.evidence.status)),
            t.appendChild(CharacterUtil.createVotesCell(e.votes.filter(e => 0 == e.vote.vote), "text-danger", "bg-danger", "false")),
            t
    }
    static createReportStatus(e) {
        const t = ElementUtil.createElement("span", null, "status px-1 rounded");
        return 1 == e ? (t.classList.add("text-success", "border-success"),
            t.textContent = "Confirmed") : 0 == e ? (t.classList.add("text-danger", "border-danger"),
                t.textContent = "Denied") : (t.classList.add("text-secondary", "border-secondary"),
                    t.textContent = "Undecided"),
            t
    }
    static createVotesCell(e, t, a, r) {
        const n = ElementUtil.createElement("span", null, "vote d-inline-block px-2 rounded", e.length, [["data-toggle", "popover"], ["data-vote", r]]);
        return Session.currentAccount && e.find(e => e.vote.voterAccountId == Session.currentAccount.id) ? n.classList.add("text-white", "font-weight-bold", a) : n.classList.add(t),
            Session.currentRoles && Session.currentRoles.find(e => "MODERATOR" == e) && (n.addEventListener("click", CharacterUtil.onEvidenceVote),
                n.setAttribute("role", "button")),
            n
    }
    static voteOnEvidence(e, t) {
        return Session.beforeRequest().then(a => fetch("".concat(ROOT_CONTEXT_PATH, "api/character/report/vote/").concat(e, "/").concat(t), Util.addCsrfHeader({
            method: "POST"
        }))).then(Session.verifyJsonResponse)
    }
    static onEvidenceVote(e) {
        const t = e.target;
        Util.setGeneratingStatus(STATUS.BEGIN),
            document.querySelectorAll(".popover").forEach(e => e.remove()),
            CharacterUtil.voteOnEvidence(t.closest("[data-evidence-id]").getAttribute("data-evidence-id"), t.getAttribute("data-vote")).then(e => {
                const t = document.querySelectorAll('[data-evidence-id="' + e[0].vote.evidenceId + '"]');
                for (const a of t) {
                    const t = Model.DATA.get(ViewUtil.getView(a)).get("reports").flatMap(e => e.evidence).find(t => t.evidence.id == e[0].vote.evidenceId);
                    t.votes = e,
                        a.querySelector(":scope footer").remove(),
                        a.appendChild(CharacterUtil.createEvidenceFooter(t))
                }
                Session.updateReportsNotifications(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static createDynamicVotersTable(e) {
        const t = TableUtil.createTable(["Date", "Moderator"], !1)
            , a = t.querySelector(":scope tbody")
            , r = e.closest("[data-report-id]")
            , n = r.getAttribute("data-report-id")
            , o = r.getAttribute("data-evidence-id")
            , l = "true" == e.getAttribute("data-vote");
        return Model.DATA.get(ViewUtil.getView(e)).get("reports").find(e => e.report.id == n).evidence.find(e => e.evidence.id == o).votes.filter(e => e.vote.vote == l).forEach(e => {
            const t = a.insertRow();
            t.insertCell().textContent = Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e.vote.updated)),
                t.insertCell().textContent = e.voterAccount ? e.voterAccount.battleTag : "Anonymous"
        }
        ),
            t
    }
    static enhanceReportForm() {
        document.querySelector("#report-character-type").addEventListener("change", e => CharacterUtil.updateReportForm()),
            $(document.querySelector("#report-character-modal")).on("show.bs.modal", CharacterUtil.updateReportAlternativeCharacterList),
            document.querySelector("#report-character-form").addEventListener("submit", e => {
                e.preventDefault();
                const t = new FormData(document.querySelector("#report-character-form"));
                t.set("playerCharacterId", Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id),
                    Util.setGeneratingStatus(STATUS.BEGIN),
                    CharacterUtil.reportCharacter(t).then(e => Util.setGeneratingStatus(STATUS.SUCCESS)).catch(e => Session.onPersonalException(e))
            }
            )
    }
    static updateReportAlternativeCharacterList() {
        const e = document.querySelector("#report-character-additional");
        e.querySelectorAll("option").forEach(e => e.remove());
        for (const t of BufferUtil.teamBuffer.buffer.values())
            t.members.forEach(t => {
                if (t.character.id == Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character.id)
                    return;
                const a = Util.unmaskName(t)
                    , r = document.createElement("option");
                r.textContent = (a.unmaskedTeam ? "[" + a.unmaskedTeam + "]" : "") + a.unmaskedName,
                    r.value = t.character.id,
                    e.appendChild(r)
            }
            )
    }
    static reportCharacter(e) {
        return Session.beforeRequest().then(t => fetch(ROOT_CONTEXT_PATH + "api/character/report/new", Util.addCsrfHeader({
            method: "POST",
            body: e
        }))).then(e => {
            if (!e.ok) {
                let t;
                switch (e.status) {
                    case 429:
                        t = "Daily report cap reached";
                        break;
                    case 409:
                        t = "Confirmed evidence per report cap reached";
                        break;
                    default:
                        t = ""
                }
                throw new Error(e.status + " " + e.statusText + " " + t)
            }
            return Session.verifyJsonResponse(e)
        }
        ).then(e => (CharacterUtil.resetCharacterReports(!0),
            CharacterUtil.enqueueUpdateCharacterReports())).then(e => {
                $("#report-character-modal").modal("hide"),
                    $("#character-reports").collapse("show"),
                    window.setTimeout(e => Util.scrollIntoViewById("character-reports"), 500)
            }
            )
    }
    static updateReportForm() {
        const e = document.querySelector("#report-character-type")
            , t = document.querySelector("#report-character-additional-group")
            , a = t.querySelector(":scope #report-character-additional");
        "LINK" != e.value ? (t.classList.add("d-none"),
            a.setAttribute("disabled", "disabled")) : (t.classList.remove("d-none"),
                a.removeAttribute("disabled"))
    }
    static enhanceAllCharacterReportsControls() {
        const e = document.querySelector("#load-all-character-reports");
        e && e.addEventListener("submit", e => {
            e.preventDefault();
            const t = new FormData(e.target);
            CharacterUtil.updateAllCharacterReports(t.get("only-unreviewed"))
        }
        )
    }
    static enhanceMatchesHistoricalMmrInput() {
        document.querySelector("#matches-historical-mmr").addEventListener("change", e => window.setTimeout(CharacterUtil.updateCharacterMatchesView, 1))
    }
    static loadSearchSuggestions(e) {
        const t = Date.now();
        return Session.beforeRequest().then(t => fetch("".concat(ROOT_CONTEXT_PATH, "api/characters/suggestions?query=").concat(encodeURIComponent(e)))).then(Session.verifyResponse).then(e => Promise.all([e.json(), Promise.resolve(t)]))
    }
    static updateSearchSuggestions(e) {
        return e ? CharacterUtil.loadSearchSuggestions(e).then(e => {
            const t = ElementUtil.INPUT_TIMESTAMPS.get("search-player-suggestions");
            if (!t || t < e[1]) {
                ElementUtil.INPUT_TIMESTAMPS.set("search-player-suggestions", e[1]);
                const t = ElementUtil.createDataList(e[0]);
                document.querySelector("#search-player-suggestions").innerHTML = t.innerHTML
            }
        }
        ) : (document.querySelector("#search-player-suggestions").innerHTML = "",
            Promise.resolve())
    }
    static onSearchInput(e) {
        CharacterUtil.updateSearchSuggestions(CharacterUtil.shouldLoadSearchSuggestions(e.target.value) ? e.target.value : null)
    }
    static shouldLoadSearchSuggestions(e) {
        return e && (e.startsWith("[") && e.length >= 2 || e.includes("#") || e.length >= 4)
    }
    static renderLadderProPlayer(e) {
        return (null != e.proTeam ? "[" + e.proTeam.shortName + "]" : "") + e.proPlayer.nickname
    }
    static renderLadderProPlayerGroupLink(e) {
        return GroupUtil.createGroupLink(new URLSearchParams([["proPlayerId", e.proPlayer.id]]), CharacterUtil.renderLadderProPlayer(e))
    }
    static renderAccount(e) {
        return Util.isFakeBattleTag(e.battleTag) ? e.id : e.battleTag
    }
    static createAccountGroupLink(e) {
        return GroupUtil.createGroupLink(new URLSearchParams([["accountId", e.id]]), CharacterUtil.renderAccount(e))
    }
    static createCharacterTable(e) {
        const t = TableUtil.createTable(["Region", "Best All League", "Best All MMR", "Total Games", "Last 1v1 MMR", "Last 1v1 Games", "Player"])
            , a = t.querySelector(":scope table");
        if (a.classList.add("table-character"),
            null != e) {
            const t = document.createElement("caption");
            t.appendChild(e),
                a.prepend(t)
        }
        return t
    }
    static renderCharacters(e, t) {
        const a = CharacterUtil.createCharacterTable(t);
        return CharacterUtil.updateCharacters(a, e),
            a
    }
}
CharacterUtil.TEAM_SNAPSHOT_SEASON_END_OFFSET_MILLIS = 1728e5,
    CharacterUtil.MMR_Y_VALUE_GETTERS = new Map([["mmr", e => e.teamState.rating], ["percent-region", e => e.teamState.regionTopPercent], ["default", e => e.teamState.rating]]),
    CharacterUtil.MMR_Y_VALUE_OPERATIONS = new Map([["mmr", {
        get: (e, t) => e.history[TEAM_HISTORY_HISTORY_COLUMN.RATING.fullName][t],
        max: e => Math.max(...e.filter(e => null != e)),
        compare: (e, t) => t - e
    }], ["percent-region", {
        get: (e, t) => {
            const a = e.history[TEAM_HISTORY_HISTORY_COLUMN.REGION_RANK.fullName][t];
            return null != a ? a / e.history[TEAM_HISTORY_HISTORY_COLUMN.REGION_TEAM_COUNT.fullName][t] * 100 : null
        }
        ,
        max: e => Math.min(...e.filter(e => null != e)),
        compare: (e, t) => e - t
    }]]),
    CharacterUtil.MMR_Y_REQUIRED_HISTORY_COLUMNS = new Map([["mmr", new Set([TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP, TEAM_HISTORY_HISTORY_COLUMN.RATING])], ["percent-region", new Set([TEAM_HISTORY_HISTORY_COLUMN.TIMESTAMP, TEAM_HISTORY_HISTORY_COLUMN.REGION_RANK, TEAM_HISTORY_HISTORY_COLUMN.REGION_TEAM_COUNT])]]),
    CharacterUtil.MMR_Y_SUMMARY_COLUMN_FORMATTERS = new Map([[TEAM_HISTORY_SUMMARY_COLUMN.RATING_AVG, Math.floor]]),
    CharacterUtil.MMR_Y_REQUIRED_NUMERIC_SUMMARY_COLUMNS = new Map([["mmr", new Set([TEAM_HISTORY_SUMMARY_COLUMN.GAMES, TEAM_HISTORY_SUMMARY_COLUMN.RATING_LAST, TEAM_HISTORY_SUMMARY_COLUMN.RATING_AVG, TEAM_HISTORY_SUMMARY_COLUMN.RATING_MAX])], ["percent-region", new Set([TEAM_HISTORY_SUMMARY_COLUMN.GAMES, TEAM_HISTORY_SUMMARY_COLUMN.RATING_LAST, TEAM_HISTORY_SUMMARY_COLUMN.RATING_AVG, TEAM_HISTORY_SUMMARY_COLUMN.RATING_MAX])]]),
    CharacterUtil.MMR_REQUIRED_PROGRESS_SUMMARY_COLUMNS = new Set([TEAM_HISTORY_SUMMARY_COLUMN.REGION_RANK_LAST, TEAM_HISTORY_SUMMARY_COLUMN.REGION_TEAM_COUNT_LAST]),
    CharacterUtil.CHARACTER_UPDATE_IDS = Array.from(document.querySelectorAll("#player-info .container-loading")).map(e => e.id),
    CharacterUtil.MMR_HISTORY_PLACEHOLDER = "-",
    CharacterUtil.ALL_RACE = Object.freeze({
        name: "all",
        fullName: "ALL",
        order: 999
    }),
    CharacterUtil.MMR_HISTORY_COMPLETE_POINT_TASK_NAME = "mmr-history-complete-point-task",
    CharacterUtil.MMR_HISTORY_COMPLETE_POINT_TIMEOUT = 100;
class FollowUtil {
    static follow() {
        Util.setGeneratingStatus(STATUS.BEGIN);
        const e = document.querySelector("#player-info").getAttribute("data-account-id");
        return Session.beforeRequest().then(t => fetch(ROOT_CONTEXT_PATH + "api/my/following/" + e, Util.addCsrfHeader({
            method: "POST"
        }))).then(Session.verifyResponse).then(e => (document.querySelector("#follow-button").classList.add("d-none"),
            document.querySelector("#unfollow-button").classList.remove("d-none"),
            FollowUtil.getMyFollowing())).then(e => Util.setGeneratingStatus(STATUS.SUCCESS)).catch(e => Session.onPersonalException(e))
    }
    static unfollow() {
        Util.setGeneratingStatus(STATUS.BEGIN);
        const e = document.querySelector("#player-info").getAttribute("data-account-id");
        return Session.beforeRequest().then(t => fetch(ROOT_CONTEXT_PATH + "api/my/following/" + e, Util.addCsrfHeader({
            method: "DELETE"
        }))).then(Session.verifyResponse).then(t => {
            document.querySelector("#follow-button").classList.remove("d-none"),
                document.querySelector("#unfollow-button").classList.add("d-none");
            const a = Model.DATA.get(VIEW.FOLLOWING_CHARACTERS).get(VIEW_DATA.SEARCH).filter(t => t.members.account.id != e);
            return Model.DATA.get(VIEW.FOLLOWING_CHARACTERS).set(VIEW_DATA.SEARCH, a),
                CharacterUtil.updateFollowingCharactersView(),
                FollowUtil.getMyFollowing()
        }
        ).then(e => Util.setGeneratingStatus(STATUS.SUCCESS)).catch(e => Session.onPersonalException(e))
    }
    static getMyFollowing() {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.beforeRequest().then(e => fetch(ROOT_CONTEXT_PATH + "api/my/following")).then(Session.verifyJsonResponse).then(e => {
                Session.currentFollowing = e,
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static enhanceFollowButtons() {
        document.querySelector("#follow-button").addEventListener("click", FollowUtil.follow),
            document.querySelector("#unfollow-button").addEventListener("click", FollowUtil.unfollow)
    }
}
class HistoryUtil {
    static replaceState(e, t, a) {
        Session.titleAndUrlHistory[Session.titleAndUrlHistory.length - 1] = [t, a],
            HistoryUtil.setObjectLocation(e, a),
            HistoryUtil.updateState(e, t, a, !0)
    }
    static pushState(e, t, a) {
        a != Session.titleAndUrlHistory[Session.titleAndUrlHistory.length - 1][1] && (Session.titleAndUrlHistory.push([t, a]),
            Session.titleAndUrlHistory.length > 2 && Session.titleAndUrlHistory.shift(),
            HistoryUtil.setObjectLocation(e, a),
            HistoryUtil.updateState(e, t, a, !1))
    }
    static setObjectLocation(e, t) {
        const a = t.indexOf("#");
        -1 == a ? e.locationSearch = t : (e.locationSearch = t.substring(0, a),
            e.locationHash = t.substring(a))
    }
    static previousTitleAndUrl() {
        return Session.titleAndUrlHistory.length > 1 ? Session.titleAndUrlHistory[Session.titleAndUrlHistory.length - 2] : Session.titleAndUrlHistory[Session.titleAndUrlHistory.length - 1]
    }
    static updateState(e, t, a, r) {
        const n = a.indexOf("#")
            , o = n > -1 ? a.substring(n + 1) : null;
        HistoryUtil.setParentSectionParameters(o, a),
            Session.isHistorical || (r ? history.replaceState(e, t, a) : history.pushState(e, t, a),
                ElementUtil.executeActiveTabTask())
    }
    static setParentSectionParameters(e, t) {
        const a = new URLSearchParams(t)
            , r = [];
        let n, o;
        if (null != e) {
            let t = document.getElementById(e);
            for (r.push(t); ;) {
                const e = t.parentNode.closest(".tab-pane");
                if (null == e || e == t)
                    break;
                if (r.push(e),
                    2 == r.length)
                    break;
                t = e
            }
            n = 1 == r.length ? r[0] : r[1]
        }
        if ("modal" == a.get("type"))
            o = "#" + a.get("id");
        else {
            o = 0 == r.length ? "#" + document.querySelector(".modal.show").id : "#" + n.id;
            const e = document.querySelector(o).closest(".modal");
            o = null == e ? o : "#" + e.id
        }
        Session.sectionParams.set(o, t.split("#")[0]),
            document.getElementById(e).classList.contains("root") && Session.sectionParams.set("#" + e, t.split("#")[0])
    }
    static getDeepestTabId(e) {
        let t = null;
        const a = e.querySelectorAll(":scope .nav-pills a.active");
        for (let e = a.length - 1; e > -1; e--) {
            const r = a[e];
            if (ElementUtil.isElementVisible(r)) {
                t = r.getAttribute("data-target").substring(1);
                break
            }
        }
        return t
    }
    static formatSearchString(e, t) {
        return (null != e && e.length > 0 ? e.startsWith("?") ? e : "?" + e : "?") + (null != t && t.length > 0 ? t.startsWith("#") ? t : "#" + t : "")
    }
    static initActiveTabs() {
        const e = Session.locationSearch();
        if (null != Session.locationHash() && Session.locationHash().length > 1)
            return;
        const t = new URLSearchParams(e);
        1 != t.get("m") && (Session.lastNonModalParams = e,
            Session.lastNonModalTitle = document.title);
        const a = HistoryUtil.getDeepestTabId(document);
        a && HistoryUtil.replaceState({}, document.title, HistoryUtil.formatSearchString(t.toString(), a))
    }
    static updateActiveTabs() {
        let e = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        const t = document.querySelector(".modal.show")
            , a = null != t
            , r = HistoryUtil.getDeepestTabId(document);
        if (!r)
            return !1;
        const n = a ? HistoryUtil.getDeepestTabId(t) : r
            , o = "#" + (null != n ? n : t.id);
        return (!1 !== e || o !== window.location.hash) && (ElementUtil.setMainContent(o),
            ElementUtil.updateTitleAndDescription(new URLSearchParams(Session.locationSearch()), "#" + n, o),
            HistoryUtil.replaceState({}, document.title, HistoryUtil.formatSearchString(Session.locationSearch(), null != n ? n : r)),
            !0)
    }
    static showAnchoredTabs() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0]
            , t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : Session.locationHash();
        if (null == t || 0 == t.length)
            return Promise.resolve();
        Util.setGeneratingStatus(STATUS.BEGIN);
        const a = [];
        let r = document.querySelector(t);
        for (HistoryUtil.showAnchoredTab(r, a, e); ;) {
            const t = r.parentNode.closest(".tab-pane");
            if (null == t || t == r)
                break;
            HistoryUtil.showAnchoredTab(t, a, e),
                r = t
        }
        return Promise.all(a).then(e => Util.setGeneratingStatus(STATUS.SUCCESS))
    }
    static showAnchoredTab(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = document.querySelector('.nav-pills a[data-target="#' + e.id + '"]');
        r.classList.contains("active") || (a ? r.classList.add("active") : (ElementUtil.isElementVisible(r) && t.push(new Promise((t, a) => ElementUtil.ELEMENT_RESOLVERS.set(e.id, t))),
            $(r).tab("show")))
    }
    static restoreState(e) {
        let t = null != Session.currentStateRestoration ? Session.currentStateRestoration.then(t => HistoryUtil.doRestoreState(e)) : HistoryUtil.doRestoreState(e);
        0 === Session.statesRestored && (t = t.then(e => HistoryUtil.updateActiveTabs(!1))),
            Session.currentStateRestoration = t
    }
    static doRestoreState(e) {
        if (null != e && null == e.state)
            return;
        Util.setGeneratingStatus(STATUS.BEGIN),
            Session.isHistorical = !0;
        const t = null != e && null != e.state.locationSearch ? e.state.locationSearch : window.location.search
            , a = null != e && null != e.state.locationHash ? e.state.locationHash : window.location.hash;
        Session.currentRestorationSearch = t,
            Session.currentRestorationHash = a;
        const r = []
            , n = [];
        n.push(e => HistoryUtil.showAnchoredTabs());
        const o = new URLSearchParams(t)
            , l = o.get("m");
        o.delete("m");
        const s = o.toString();
        if (Session.currentSearchParams === s)
            return Promise.all(r).then(e => {
                const t = [];
                for (const e of n)
                    t.push(e());
                return Promise.all(t)
            }
            ).then(e => new Promise((e, t) => {
                if (null != a && a.length > 0 && null != l) {
                    const t = document.querySelector(a).closest(".modal");
                    null != t && BootstrapUtil.showModal(t.id).then(t => e())
                } else
                    e()
            }
            )).then(e => {
                HistoryUtil.updateActiveTabs(),
                    Session.statesRestored += 1,
                    Util.setGeneratingStatus(STATUS.SUCCESS),
                    ElementUtil.executeActiveTabTask()
            }
            );
        const i = o.get("type");
        o.delete("type");
        let c = null
            , d = null;
        switch (i) {
            case "ladder":
                LadderUtil.restoreLadderFormState(document.getElementById("form-ladder"), o),
                    d = Cursor.fromUrlSearchParams(o);
                for (const e of Object.values(NAVIGATION_DIRECTION))
                    o.delete(e.relativePosition);
                const e = SortParameter.fromPrefixedString(o.get("sort"));
                o.delete("sort");
                const t = o.toString();
                c = "generated-info-all",
                    n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    r.push(LadderUtil.updateLadder(t, d, e)),
                    r.push(StatsUtil.updateQueueStats(t)),
                    r.push(StatsUtil.updateLadderStats(t)),
                    r.push(StatsUtil.updateLeagueBounds(t));
                break;
            case "character":
                const a = o.get("id");
                o.delete("id"),
                    r.push(CharacterUtil.showCharacterInfo(null, a));
                break;
            case "search":
                const l = o.get("name");
                o.delete("name"),
                    c = "search-result-all",
                    n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    r.push(CharacterUtil.updateCharacterSearch(l));
                break;
            case "vod-search":
                n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    c = "search-result-vod-all",
                    r.push(VODUtil.update(o));
                break;
            case "team-mmr":
                n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    r.push(TeamUtil.updateTeamMmr(o));
                break;
            case "online":
                c = "online-data",
                    n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    n.push(e => FormUtil.setFormState(document.querySelector("#form-online"), o)),
                    r.push(SeasonUtil.updateSeasonState(o));
                break;
            case "clan-search":
                c = "search-result-clan-all",
                    n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    n.push(e => FormUtil.setFormState(document.querySelector("#form-search-clan"), o)),
                    d = Cursor.fromUrlSearchParams(o);
                for (const e of Object.values(NAVIGATION_DIRECTION))
                    o.delete(e.relativePosition);
                r.push(HistoryUtil.callWithArguments((e, t) => ClanUtil.updateClanSearch(e, d, SortParameter.fromPrefixedString(t[0])), o, ClanUtil.REQUIRED_CURSOR_PARAMETERS));
                break;
            case "following-ladder":
                LadderUtil.restoreLadderFormState(document.getElementById("form-following-ladder"), o),
                    c = "following-ladder",
                    n.push(e => BootstrapUtil.hideActiveModal("error-generation")),
                    r.push(LadderUtil.updateMyLadder(o.toString()));
                break;
            case "versus":
                r.push(VersusUtil.updateFromParams(o));
                break;
            case "group":
                r.push(GroupUtil.loadAndShowGroup(o));
                break;
            case "modal":
                const s = o.get("id");
                o.delete("id"),
                    r.push(BootstrapUtil.hideActiveModal("error-generation")),
                    n.push(e => BootstrapUtil.showModal(s));
                break;
            case "team-search":
                c = "team-search-container",
                    r.push(TeamUtil.updateTeams(o));
                break;
            case null:
                n.push(e => BootstrapUtil.hideActiveModal())
        }
        return Promise.all(r).then(e => {
            const t = [];
            for (const e of n)
                t.push(e());
            return Promise.all(t)
        }
        ).then(e => {
            HistoryUtil.updateActiveTabs(),
                Session.statesRestored += 1,
                Util.setGeneratingStatus(STATUS.SUCCESS),
                Session.isHistorical = !1,
                null != c && Util.scrollIntoViewById(c),
                ElementUtil.executeActiveTabTask()
        }
        )
    }
    static callWithArguments(e, t, a) {
        const r = [];
        for (const e of a)
            r.push(t.get(e)),
                t.delete(e);
        return e(t.toString(), r)
    }
}
class LadderUtil {
    static getLadderAll() {
        const e = Util.getFormParameters();
        return Promise.all([LadderUtil.updateLadder(e), StatsUtil.updateQueueStats(e), StatsUtil.updateLadderStats(e), StatsUtil.updateLeagueBounds(e)])
    }
    static updateLadderModel(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : LadderUtil.DEFAULT_SORT;
        return LadderUtil.chainLadderPromise(e, t, a, r)
    }
    static chainLadderPromise(e, t, a, r) {
        const n = new URLSearchParams(e.form);
        n.append("sort", r.toPrefixedString()),
            null != a && n.append(a.direction.relativePosition, a.token);
        const o = "".concat(ROOT_CONTEXT_PATH, "api/teams?") + n.toString();
        return Session.beforeRequest().then(e => fetch(o)).then(Session.verifyJsonResponse).then(t => {
            var r;
            const n = (null == a ? void 0 : a.direction) || NAVIGATION_DIRECTION.FORWARD;
            if (t.meta = PaginationUtil.createCursorMeta(t, null == a || null == (null === (r = t.navigation) || void 0 === r ? void 0 : r[NAVIGATION_DIRECTION.BACKWARD.relativePosition]), n),
                0 == t.result.length) {
                const e = Model.DATA.get(VIEW.LADDER).get(VIEW_DATA.SEARCH);
                if (e)
                    return PaginationUtil.setEmptyResultMeta(e.meta, n),
                        Model.DATA.get(VIEW.LADDER).get(VIEW_DATA.VAR)
            }
            return Model.DATA.get(VIEW.LADDER).set(VIEW_DATA.SEARCH, t),
                Model.DATA.get(VIEW.LADDER).set(VIEW_DATA.VAR, e),
                e
        }
        )
    }
    static updateLadderView() {
        const e = Model.DATA.get(VIEW.LADDER).get(VIEW_DATA.SEARCH);
        TeamUtil.updateTeamsTable(document.getElementById("ladder"), e),
            PaginationUtil.PAGINATIONS.get("ladder").update(e),
            document.getElementById("generated-info-all").classList.remove("d-none")
    }
    static updateLadder(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null
            , a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : LadderUtil.DEFAULT_SORT;
        Util.setGeneratingStatus(STATUS.BEGIN);
        const r = {
            form: e,
            cursor: t,
            sort: a
        };
        return LadderUtil.updateLadderModel(r, e, t, a).then(e => {
            const t = new URLSearchParams(e.form);
            t.append("type", "ladder"),
                null != e.cursor && t.append(e.cursor.direction.relativePosition, e.cursor.token),
                t.append("sort", e.sort.toPrefixedString());
            const a = t.toString();
            LadderUtil.updateLadderView(),
                Util.setGeneratingStatus(STATUS.SUCCESS, null, "generated-info-all"),
                Session.isHistorical || HistoryUtil.pushState(r, document.title, "?" + t.toString() + "#ladder-top"),
                Session.currentSeason = t.get("season"),
                Session.currentTeamFormat = EnumUtil.enumOfFullName(t.get("queue"), TEAM_FORMAT),
                Session.currentTeamType = EnumUtil.enumOfName(t.get("teamType"), TEAM_TYPE),
                Session.currentSearchParams = a
        }
        ).catch(e => Session.onPersonalException(e))
    }
    static updateMyLadderModel(e) {
        return Session.beforeRequest().then(t => fetch(ROOT_CONTEXT_PATH + "api/my/following/ladder?" + e)).then(Session.verifyJsonResponse).then(e => {
            const t = {
                result: e,
                meta: {
                    page: 1,
                    perPage: e.length,
                    totalCount: e.length
                }
            };
            return Model.DATA.get(VIEW.FOLLOWING_LADDER).set(VIEW_DATA.SEARCH, t),
                t
        }
        )
    }
    static updateMyLadderView() {
        TeamUtil.updateTeamsTable(document.getElementById("following-ladder"), Model.DATA.get(VIEW.FOLLOWING_LADDER).get(VIEW_DATA.SEARCH)),
            document.getElementById("following-ladder").classList.remove("d-none")
    }
    static updateMyLadder(e) {
        Util.setGeneratingStatus(STATUS.BEGIN);
        const t = {
            form: e
        }
            , a = new URLSearchParams(e);
        a.append("type", "following-ladder");
        const r = a.toString();
        return LadderUtil.updateMyLadderModel(e).then(e => {
            LadderUtil.updateMyLadderView(),
                Util.setGeneratingStatus(STATUS.SUCCESS, null, "following-ladder"),
                Session.isHistorical || HistoryUtil.pushState(t, document.title, "?" + a.toString() + "#personal-following"),
                Session.currentPersonalSeasonSeason = a.get("season"),
                Session.currentPersonalTeamFormat = EnumUtil.enumOfFullName(a.get("queue"), TEAM_FORMAT),
                Session.currentPersonalTeamType = EnumUtil.enumOfName(a.get("teamType"), TEAM_TYPE),
                Session.currentSearchParams = r
        }
        ).catch(e => Session.onPersonalException(e))
    }
    static ladderPaginationPageClick(e) {
        e.preventDefault();
        const t = Util.getFormParameters()
            , a = Model.DATA.get(VIEW.LADDER).get(VIEW_DATA.VAR);
        LadderUtil.updateLadder(t, Cursor.fromElementAttributes(e.target, "data-page-"), a.sort).then(t => Util.scrollIntoViewById(e.target.getAttribute("href").substring(1)))
    }
    static enhanceLadderForm() {
        const e = document.getElementById("form-ladder");
        e.querySelector(".team-format-picker").addEventListener("change", LadderUtil.onLadderFormTeamFormatChange),
            e.addEventListener("submit", function (t) {
                t.preventDefault(),
                    FormUtil.verifyForm(e, e.querySelector(":scope .error-out")) && (Session.currentSeason = document.getElementById("form-ladder-season-picker").value,
                        Session.currentTeamFormat = EnumUtil.enumOfFullName(document.getElementById("form-ladder-team-format-picker").value, TEAM_FORMAT),
                        Session.currentTeamType = EnumUtil.enumOfName(document.getElementById("form-ladder-team-type-picker").value, TEAM_TYPE),
                        LadderUtil.getLadderAll().then(t => {
                            Util.scrollIntoViewById(e.getAttribute("data-on-success-scroll-to")),
                                HistoryUtil.updateActiveTabs()
                        }
                        ))
            })
    }
    static enhanceMyLadderForm() {
        const e = document.getElementById("form-following-ladder");
        e.querySelector(".team-format-picker").addEventListener("change", LadderUtil.onLadderFormTeamFormatChange),
            e.addEventListener("submit", function (t) {
                t.preventDefault(),
                    FormUtil.verifyForm(e, e.querySelector(":scope .error-out")) && (Session.currentPersonalSeason = document.getElementById("form-following-ladder-season-picker").value,
                        Session.currentPersonalTeamFormat = EnumUtil.enumOfFullName(document.getElementById("form-following-ladder-team-format-picker").value, TEAM_FORMAT),
                        Session.currentPersonalTeamType = EnumUtil.enumOfName(document.getElementById("form-following-ladder-team-type-picker").value, TEAM_TYPE),
                        LadderUtil.updateMyLadder(Util.urlencodeFormData(new FormData(document.getElementById("form-following-ladder")))).then(t => {
                            Util.scrollIntoViewById(e.getAttribute("data-on-success-scroll-to")),
                                HistoryUtil.updateActiveTabs()
                        }
                        ))
            })
    }
    static restoreLadderFormState(e, t) {
        for (const t of e.querySelectorAll('input[type="checkbox"]'))
            t.checked = !1;
        ElementUtil.changeInputValue(e.querySelector("#" + e.id + "-season-picker"), t.get("season")),
            ElementUtil.changeInputValue(e.querySelector("#" + e.id + "-team-format-picker"), t.get("queue")),
            ElementUtil.changeInputValue(e.querySelector("#" + e.id + "-team-type-picker"), t.get("teamType"));
        for (const a of t.entries()) {
            const t = e.querySelector("#" + e.id + "-" + a[1] + '[type="checkbox"]');
            null != t && ElementUtil.changeInputValue(t, !0)
        }
    }
    static onLadderFormTeamFormatChange(e) {
        const t = e.target.closest("form").querySelector(".team-type-picker")
            , a = t.querySelector(':scope option[value="RANDOM"]')
            , r = EnumUtil.enumOfFullName(e.target.value, TEAM_FORMAT);
        r == TEAM_FORMAT._1V1 || r == TEAM_FORMAT.ARCHON ? (a.setAttribute("disabled", "disabled"),
            t.value = TEAM_TYPE.ARRANGED.name.toUpperCase()) : a.removeAttribute("disabled")
    }
}
LadderUtil.DEFAULT_SORT = new SortParameter("rating", SORTING_ORDER.DESC);
class Model {
    static init() {
        for (const e of Object.values(VIEW))
            Model.DATA.set(e, new Map)
    }
    static reset(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : Object.values(VIEW_DATA);
        const a = Model.DATA.get(e);
        for (const e of t)
            a.set(e, {})
    }
}
Model.DATA = new Map;
class Pagination {
    constructor(e, t, a) {
        this.cssSelector = e,
            this.config = t,
            this.onClick = a
    }
    update(e) {
        if (this.data = e,
            e.empty)
            return void this.disableNext(e.meta.pageDiff);
        if (null == e.result || e.result.length < 1) {
            for (const e of document.querySelectorAll(this.cssSelector))
                e.classList.add("d-none");
            return
        }
        const t = {};
        for (const a of Object.values(NAVIGATION_DIRECTION)) {
            const r = new Map;
            t[a.name] = r;
            const n = e.navigation[a.relativePosition];
            null != n && r.set(a.relativePosition, n)
        }
        for (const a of document.querySelectorAll(this.cssSelector))
            PaginationUtil.updatePagination(a, t, e.meta.page, e.meta.isLastPage, this.onClick),
                a.classList.remove("d-none")
    }
    disableNext() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 1;
        for (const t of document.querySelectorAll(this.cssSelector + " [data-page-count]"))
            t.getAttribute("data-page-count") >= e && 0 != t.getAttribute("data-page-number") && t.parentNode.classList.add("disabled")
    }
}
class PaginationUtil {
    static updatePagination(e, t, a, r, n) {
        const o = e.getElementsByClassName("page-link");
        PaginationUtil.updatePaginationPage(o.item(0), t, PAGE_TYPE.FIRST, 1, 0, "First", 1 != a, !1, n),
            PaginationUtil.updatePaginationPage(o.item(1), t, PAGE_TYPE.GENERAL, -1, a, "<", a - 1 >= 1, !1, n),
            PaginationUtil.updatePaginationPage(o.item(o.length - 1), t, PAGE_TYPE.LAST, 1, a, "Last", !1, !1, n),
            PaginationUtil.updatePaginationPage(o.item(o.length - 2), t, PAGE_TYPE.GENERAL, 1, a, ">", !r, !1, n);
        const l = o.length - 4
            , s = (l - 1) / 2
            , i = s + 1
            , c = Number.MAX_VALUE;
        let d = (a < i ? i : a > c ? c : a) - s;
        d = d < 1 ? 1 : d;
        for (let e = 2, s = d; e < l + 2; e++,
            s++) {
            const l = s - a
                , i = !(s == a || s > a && r);
            PaginationUtil.updatePaginationPage(o.item(e), t, PAGE_TYPE.GENERAL, l, a, i || s == a ? s : "", i, s == a, n)
        }
    }
    static updatePaginationPage(e, t, a, r, n, o, l, s, i) {
        let c;
        switch ("" === o ? e.parentElement.classList.add("d-none") : e.parentElement.classList.remove("d-none"),
        l ? l && !e.classList.contains("enabled") && (e.parentElement.classList.add("enabled"),
            e.parentElement.classList.remove("disabled"),
            e.addEventListener("click", i)) : (e.parentElement.classList.remove("enabled"),
                e.parentElement.classList.add("disabled"),
                e.removeEventListener("click", i)),
        s ? e.parentElement.classList.add("active") : e.parentElement.classList.remove("active"),
        a) {
            case PAGE_TYPE.FIRST:
                c = t.first;
                break;
            case PAGE_TYPE.LAST:
                c = t.last;
                break;
            case PAGE_TYPE.GENERAL:
                c = r > -1 ? t.forward : t.backward
        }
        if (null != c)
            for (const [t, a] of c)
                e.setAttribute("data-page-" + t, a);
        e.setAttribute("data-page-count", r),
            e.setAttribute("data-page-number", n),
            e.textContent = o
    }
    static createPaginations() {
        for (const e of document.getElementsByClassName("pagination")) {
            const t = e.getAttribute("data-pagination-side-button-count")
                , a = e.getAttribute("data-pagination-anchor");
            PaginationUtil.createPagination(e, t || PaginationUtil.PAGINATION_SIDE_BUTTON_COUNT, a)
        }
        PaginationUtil.PAGINATIONS.set("ladder", new Pagination(".pagination-ladder", [], LadderUtil.ladderPaginationPageClick))
    }
    static createPagination(e, t, a) {
        let r;
        const n = 2 * t + (arguments.length > 3 && void 0 !== arguments[3] && arguments[3] ? 1 : 0) + 2 + 2;
        for (r = 0; r < n; r++)
            e.appendChild(PaginationUtil.createPaginationPage(1, "", a))
    }
    static createPaginationPage(e, t, a) {
        const r = document.createElement("li");
        r.classList.add("page-item");
        const n = document.createElement("a");
        return n.setAttribute("href", a),
            n.classList.add("page-link"),
            n.textContent = t,
            n.setAttribute("data-page-number", e),
            r.appendChild(n),
            r
    }
    static resultToPagedResult(e) {
        return {
            meta: {
                totalCount: e.length,
                perPage: e.length,
                pageCount: 1,
                page: 1,
                pageDiff: 0
            },
            result: e,
            empty: 0 != e.length
        }
    }
    static createCursorMeta(e, t, a) {
        var r, n;
        return {
            page: (null == e || null === (r = e.result) || void 0 === r ? void 0 : r.length) < 1 ? a == NAVIGATION_DIRECTION.BACKWARD ? PaginationUtil.CURSOR_DISABLED_PREV_PAGE_NUMBER : PaginationUtil.CURSOR_DISABLED_NEXT_PAGE_NUMBER : t ? PaginationUtil.CURSOR_DISABLED_PREV_PAGE_NUMBER : PaginationUtil.CURSOR_PAGE_NUMBER,
            pageDiff: a == NAVIGATION_DIRECTION.FORWARD ? 1 : -1,
            isLastPage: null == (null == e || null === (n = e.navigation) || void 0 === n ? void 0 : n.after)
        }
    }
    static setEmptyResultMeta(e, t) {
        e.page = t == NAVIGATION_DIRECTION.FORWARD ? PaginationUtil.CURSOR_DISABLED_NEXT_PAGE_NUMBER : PaginationUtil.CURSOR_DISABLED_PREV_PAGE_NUMBER,
            t == NAVIGATION_DIRECTION.FORWARD && (e.isLastPage = !0)
    }
}
PaginationUtil.PAGINATION_SIDE_BUTTON_COUNT = 0,
    PaginationUtil.CURSOR_PAGE_NUMBER = 2,
    PaginationUtil.CURSOR_DISABLED_PREV_PAGE_NUMBER = 1,
    PaginationUtil.CURSOR_DISABLED_NEXT_PAGE_NUMBER = 3,
    PaginationUtil.PAGINATIONS = new Map;
class SeasonUtil {
    static seasonIdTranslator(e) {
        const t = Session.currentSeasonsIdMap.get(parseInt(e))[0];
        return SeasonUtil.seasonTranslator(t)
    }
    static seasonTranslator(e) {
        const t = e.end
            , a = t.getTime() - Date.now() > 0 ? new Date : t;
        return "".concat(e.year, " season ").concat(e.number, " (").concat(e.battlenetId, ") (").concat(Util.MONTH_DATE_FORMAT.format(a), ")")
    }
    static getSeasons() {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.beforeRequest().then(e => fetch(ROOT_CONTEXT_PATH + "api/seasons")).then(Session.verifyJsonResponse).then(e => {
                SeasonUtil.updateSeasons(e),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateSeasons(e) {
        const t = Util.groupBy(e, e => e.region);
        Session.currentSeasons = Array.from(t.values()).reduce((e, t) => e.length > t.length ? e : t);
        const a = new Map;
        Array.from(t.entries()).forEach(e => a.set(e[0], Util.groupBy(e[1], e => e.battlenetId))),
            Session.currentSeasonsMap = a,
            Session.currentSeasonsIdMap = Array.from(a.values()).reduce((e, t) => e.size > t.size ? e : t);
        for (const t of e)
            SeasonUtil.updateSeasonMeta(t);
        for (const e of document.querySelectorAll(".season-picker")) {
            ElementUtil.removeChildren(e);
            for (const t of Session.currentSeasons) {
                const a = document.createElement("option");
                a.setAttribute("label", t.descriptiveName),
                    a.textContent = t.descriptiveName,
                    a.setAttribute("value", t.battlenetId),
                    e.appendChild(a)
            }
            e.value = Session.currentSeasons[0].battlenetId
        }
    }
    static updateSeasonDuration(e) {
        e.durationProgress = e.nowOrEnd - e.start,
            e.daysProgress = e.durationProgress / 864e5
    }
    static updateSeasonDescription(e) {
        e.descriptiveName = SeasonUtil.seasonTranslator(e)
    }
    static updateSeasonDates(e) {
        e.start = Util.parseIsoDateOrDateTime(e.start),
            e.end = Util.parseIsoDateOrDateTime(e.end);
        const t = new Date;
        e.nowOrEnd = t - e.end < 0 ? t : e.end
    }
    static updateSeasonMeta(e) {
        SeasonUtil.updateSeasonDates(e),
            SeasonUtil.updateSeasonDuration(e),
            SeasonUtil.updateSeasonDescription(e)
    }
    static updateSeasonState(e) {
        e.append("type", "online");
        const t = e.toString()
            , a = {
                params: t
            };
        return Util.setGeneratingStatus(STATUS.BEGIN),
            SeasonUtil.updateSeasonStateModel(e).then(r => {
                SeasonUtil.updateSeasonStateView(e),
                    Util.setGeneratingStatus(STATUS.SUCCESS),
                    Session.isHistorical || HistoryUtil.pushState(a, document.title, "?" + t + "#online"),
                    Session.currentSearchParams = t,
                    Session.isHistorical || HistoryUtil.updateActiveTabs()
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateSeasonStateModel(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/season/state/").concat(e.get("to"), "/").concat(e.get("period"));
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse).then(e => (Model.DATA.get(VIEW.ONLINE).set(VIEW_DATA.SEARCH, e),
            e))
    }
    static updateSeasonStateView(e) {
        SeasonUtil.updateSeasonStateViewPart(e, "online-players-table", "playerCount"),
            SeasonUtil.updateSeasonStateViewPart(e, "online-games-table", "gamesPlayed"),
            document.querySelector("#online-data").classList.remove("d-none")
    }
    static updateSeasonStateViewPart(e, t, a) {
        const r = Model.DATA.get(VIEW.ONLINE).get(VIEW_DATA.SEARCH)
            , n = {};
        for (const e of r)
            null == n[e.seasonState.periodStart] && (n[e.seasonState.periodStart] = {}),
                n[e.seasonState.periodStart][e.season.region] = e.seasonState[a] < 0 ? 0 : e.seasonState[a];
        ChartUtil.CHART_RAW_DATA.set(t, {}),
            TableUtil.updateVirtualColRowTable(document.getElementById(t), n, e => ChartUtil.CHART_RAW_DATA.get(t).data = e, (e, t) => EnumUtil.enumOfName(e, REGION).order - EnumUtil.enumOfName(t, REGION).order, e => EnumUtil.enumOfName(e, REGION).name, e => new Date(e).getTime())
    }
    static enhanceSeasonStateForm() {
        const e = document.querySelector("#form-online");
        document.querySelector("#online-to").valueAsNumber = Date.now(),
            e.addEventListener("submit", t => {
                t.preventDefault();
                const a = new FormData(e)
                    , r = new Date(document.querySelector("#online-to").valueAsNumber);
                r.setHours(0, 0, 0, 0),
                    r.setDate(r.getDate() + 1),
                    a.set("to", r.getTime()),
                    SeasonUtil.updateSeasonState(new URLSearchParams(Util.urlencodeFormData(a)))
            }
            )
    }
    static isCurrentSeason(e) {
        return null == SeasonUtil.maxSeason && (SeasonUtil.maxSeason = Math.max.apply(Math, Array.from(Session.currentSeasonsIdMap.keys()))),
            e == SeasonUtil.maxSeason
    }
    static calculateAbnormalSeasons(e) {
        e || (e = Array.from(Session.currentSeasonsIdMap.values()).map(e => e[0]));
        const t = e.map(e => e.durationProgress)
            , a = t.reduce((e, t) => e + t, 0) / t.length
            , r = -1 * Util.stDev(t, !0);
        return new Set(e.filter(e => e.durationProgress - a < r).map(e => e.battlenetId))
    }
    static isAbnormalSeason(e) {
        return SeasonUtil.abnormalSeasons || (SeasonUtil.abnormalSeasons = SeasonUtil.calculateAbnormalSeasons()),
            SeasonUtil.abnormalSeasons.has(parseInt(e))
    }
}
class MetaUtil {
    static getPatches(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/patches?buildMin=").concat(encodeURIComponent(e));
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse)
    }
    static loadPatches() {
        let e = JSON.parse(localStorage.getItem("internal-meta-patches") || "[]");
        const t = parseInt(localStorage.getItem("internal-meta-patches-build-last") || -1) + 1;
        return MetaUtil.getPatches(t).then(t => (t.length > 0 && (e = t.concat(e),
            localStorage.setItem("internal-meta-patches", JSON.stringify(e))),
            e.length > 0 && localStorage.setItem("internal-meta-patches-build-last", e[0].patch.build),
            MetaUtil.PATCHES = e,
            e))
    }
    static loadPatchesIfNeeded() {
        return MetaUtil.resetPatchesIfNeeded(),
            0 == PATCH_LAST_BUILD ? Promise.resolve() : localStorage.getItem("internal-meta-patches-build-last") < PATCH_LAST_BUILD ? MetaUtil.loadPatches() : (0 == MetaUtil.PATCHES.length && (MetaUtil.PATCHES = JSON.parse(localStorage.getItem("internal-meta-patches") || "[]")),
                Promise.resolve(MetaUtil.PATCHES))
    }
    static resetPatchesIfNeeded() {
        const e = localStorage.getItem("internal-meta-patches-reset");
        (!e || Date.now() - e > MetaUtil.PATCH_RESET_PERIOD) && (MetaUtil.PATCHES = [],
            localStorage.removeItem("internal-meta-patches-build-last"),
            localStorage.removeItem("internal-meta-patches"),
            localStorage.setItem("internal-meta-patches-reset", Date.now()))
    }
}
MetaUtil.PATCHES = [],
    MetaUtil.PATCH_RESET_PERIOD = 6048e5;
class Session {
    static getMyInfo() {
        return Session.isAuthenticated() ? PersonalUtil.getMyAccount().then(e => (Session.updateMyInfoThen(),
            Session.sessionStartTimestamp = Date.now(),
            e)) : Promise.resolve(1)
    }
    static onPersonalException(e) {
        e.message.startsWith(Session.INVALID_API_VERSION_CODE) ? Session.updateApplicationVersion() : Util.setGeneratingStatus(STATUS.ERROR, e.message, e)
    }
    static beforeRequest() {
        return Promise.resolve()
    }
    static verifyResponse(e) {
        if (!(arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : [200]).includes(e.status))
            throw new Error(e.status + " " + e.statusText);
        return Session.verifyResponseVersion(e),
            Promise.resolve(e)
    }
    static verifyResponseVersion(e) {
        const t = e.headers.get("X-Application-Version")
            , a = e.headers.get("Cache-Control");
        if ((!a || a.toLowerCase().includes("max-age=0")) && t && t != Session.APPLICATION_VERSION)
            throw new Error(Session.INVALID_API_VERSION_CODE + " API version has changed")
    }
    static verifyJsonResponse(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : [200];
        return Session.verifyResponse(e, t).then(e => e.text()).then(e => e && (e.startsWith("{") || e.startsWith("[")) ? JSON.parse(e) : null).then(e => Util.isErrorDetails(e) ? null : e)
    }
    static updateApplicationVersion() {
        Util.setGeneratingStatus(STATUS.SUCCESS),
            $("#application-version-update").modal()
    }
    static renewBlizzardRegistration() {
        if (null == Session.currentAccount)
            return Session.doRenewBlizzardRegistration();
        Util.setGeneratingStatus(STATUS.SUCCESS),
            $("#error-session").modal()
    }
    static doRenewBlizzardRegistration() {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.isSilent = !0,
            document.cookie = "pre-auth-path=" + encodeURI(Util.getCurrentPathInContext() + window.location.search + window.location.hash) + ";path=" + ROOT_CONTEXT_PATH + ";max-age=300;secure;SameSite=Lax",
            BootstrapUtil.showGenericModal("BattleNet authorization...", "Fetching your BattleNet identity and permissions. It usually takes ~5 seconds for BattleNet to respond, please standby.", !0).then(e => (window.location.href = ROOT_CONTEXT_PATH + "oauth2/authorization/" + Util.getCookie("oauth-reg"),
                "reauth"))
    }
    static updateMyInfoThen() {
        if (null != Session.currentAccount) {
            CharacterUtil.updatePersonalCharactersView(),
                CharacterUtil.updateFollowingCharactersView(),
                CharacterUtil.updateAllCharacterReports("true" === localStorage.getItem("character-report-only-unreviewed"));
            for (const e of document.querySelectorAll(".login-anonymous"))
                e.classList.add("d-none");
            for (const e of document.querySelectorAll(".login-user"))
                e.classList.remove("d-none")
        } else {
            for (const e of document.querySelectorAll(".login-anonymous"))
                e.classList.remove("d-none");
            for (const e of document.querySelectorAll(".login-user"))
                e.classList.add("d-none")
        }
    }
    static updateReportsNotifications() {
        if (!Session.currentRoles || !Session.currentRoles.find(e => "MODERATOR" == e))
            return;
        const e = Model.DATA.get(VIEW.CHARACTER_REPORTS).get("reports");
        if (!e || 0 == e.length)
            return;
        let t = 0;
        e.flatMap(e => e.evidence).forEach(e => {
            e.votes && e.votes.find(e => e.vote.voterAccountId == Session.currentAccount.id) || t++
        }
        );
        const a = [document.querySelector("#all-character-reports-tab .tab-alert"), document.querySelector("#personal-tab .tab-alert")];
        for (const e of a)
            e.textContent = t,
                t > 0 ? e.classList.remove("d-none") : e.classList.add("d-none")
    }
    static locationSearch() {
        return Session.isHistorical ? Session.currentRestorationSearch : window.location.search
    }
    static locationHash() {
        return Session.isHistorical ? Session.currentRestorationHash : window.location.hash
    }
    static restoreState() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : document;
        for (const t of e.querySelectorAll(".serializable")) {
            const e = localStorage.getItem(t.id);
            null != e && ("checkbox" == t.getAttribute("type") || "radio" == t.getAttribute("type") ? "true" == e ? t.setAttribute("checked", "checked") : t.removeAttribute("checked") : t.hasAttribute("multiple") ? FormUtil.setMultiSelectState(t, e.split(Session.multiValueInputSeparator)) : t.value = e)
        }
        e.querySelectorAll(".class-ctl").forEach(ElementUtil.applyClassCtl)
    }
    static enhanceSerializable() {
        for (const e of document.querySelectorAll(".serializable"))
            if (e.hasAttribute("multiple"))
                e.addEventListener("change", t => localStorage.setItem(e.id, Array.from(e.querySelectorAll("option:checked"), e => e.value).join(Session.multiValueInputSeparator)));
            else
                switch (e.getAttribute("type")) {
                    case "checkbox":
                        e.addEventListener("change", t => localStorage.setItem(e.id, e.checked));
                        break;
                    case "radio":
                        e.addEventListener("click", e => e.target.closest("form").querySelectorAll(':scope input[name="' + e.target.getAttribute("name") + '"]').forEach(e => localStorage.setItem(e.id, e.checked)));
                        break;
                    default:
                        e.addEventListener("change", t => localStorage.setItem(e.id, e.value)),
                            e.addEventListener("input", t => localStorage.setItem(e.id, e.value))
                }
    }
    static getCsrf() {
        return Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/security/csrf"))).then(Session.verifyJsonResponse)
    }
    static enhanceCsrfForms() {
        document.querySelectorAll(".form-csrf").forEach(e => {
            e.addEventListener("submit", e => {
                e.preventDefault(),
                    FormUtil.updateCsrfForm(e.target).then(t => e.target.submit())
            }
            )
        }
        )
    }
    static setTheme(e) {
        Session.theme != e && (Session.setDocumentTheme(e),
            Session.setChartTheme(e),
            Session.setMatrixTheme(e),
            Session.theme = e,
            document.cookie = "theme=" + e.name + ";path=" + ROOT_CONTEXT_PATH + ";max-age=315360000;secure;SameSite=Lax")
    }
    static setDocumentTheme(e) {
        const t = document.querySelector("body")
            , a = [];
        let r;
        for (const n of Object.values(THEME))
            if (n == e) {
                t.classList.add("theme-" + n.name),
                    r = Session.themeLinks.get(n),
                    r.onload = e => a.forEach(e => e.remove());
                const e = document.querySelector("#bootstrap-theme-override");
                e.previousElementSibling != r && document.querySelector("head").insertBefore(r, e)
            } else {
                t.classList.remove("theme-" + n.name);
                const e = document.querySelector("#bootstrap-theme-" + n.name);
                null != e && a.push(e)
            }
        const n = ElementUtil.INPUT_TIMEOUTS.get("bootstrap-theme-cleanup-timeout");
        null != n && window.clearTimeout(n),
            ElementUtil.INPUT_TIMEOUTS.set("bootstrap-theme-cleanup-timeout", window.setTimeout(e => a.forEach(e => e.remove()), 5e3))
    }
    static setChartTheme(e) {
        const t = e == THEME.DARK ? "#242a30" : "rgba(0,0,0,0.1)";
        for (const e of ChartUtil.CHARTS.values())
            e.config.options.scales.y.grid.color = t,
                e.config.options.scales.y.grid.zeroLineColor = t,
                e.config.options.scales.y.border.color = t,
                e.update()
    }
    static setMatrixTheme(e) {
        for (const t of MatrixUI.OBJECTS.values())
            t.setTheme(e),
                t.getNode() && t.highlight()
    }
    static initThemes() {
        const e = Util.getCookie("theme");
        Session.theme = e ? EnumUtil.enumOfName(e, THEME) : THEME.LIGHT,
            Session.themeLinks.set(THEME.LIGHT, document.querySelector("#bootstrap-theme-light"));
        let t = document.querySelector("#bootstrap-theme-dark");
        t || (t = document.createElement("link"),
            t.id = "bootstrap-theme-dark",
            t.setAttribute("rel", "stylesheet"),
            t.setAttribute("href", RESOURCE_PATH + "bootstrap-dark.min.css")),
            Session.themeLinks.set(THEME.DARK, t)
    }
    static enhanceThemeInputs() {
        const e = e => window.setTimeout(Session.refreshTheme, 1);
        document.querySelector("#theme-device").addEventListener("click", e),
            document.querySelector("#theme-light").addEventListener("click", e),
            document.querySelector("#theme-dark").addEventListener("click", e)
    }
    static refreshTheme() {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", Session.deviceThemeCallback),
            "true" == localStorage.getItem("theme-light") ? Session.setTheme(THEME.LIGHT) : "true" == localStorage.getItem("theme-dark") ? Session.setTheme(THEME.DARK) : (window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", Session.deviceThemeCallback),
                Session.deviceThemeCallback())
    }
    static getStyleOverride() {
        let e = document.querySelector("#personal-style-override");
        return e || (e = document.createElement("style"),
            e.id = "personal-style-override",
            document.head.appendChild(e)),
            e
    }
    static updateCheaterVisibility() {
        const e = localStorage.getItem("cheaters-visible") || "false"
            , t = Session.getStyleOverride().sheet;
        for (let e = 0; e < t.cssRules.length; e++)
            t.cssRules[e].cssText.startsWith("#cheater-visibility") && t.deleteRule(e);
        "true" != e && t.insertRule("#cheater-visibility, #ladder .team-cheater {display: none !important;}", 0)
    }
    static enhanceCheaterVisibilityInput() {
        document.querySelector("#cheaters-visible").addEventListener("click", e => window.setTimeout(Session.updateCheaterVisibility, 1))
    }
    static updateChartAspectRatio() {
        const e = ChartUtil.ASPECT_RATIO + "/1"
            , t = Session.getStyleOverride().sheet;
        for (let e = 0; e < t.cssRules.length; e++)
            t.cssRules[e].cssText.startsWith("#chart-aspect-ratio") && t.deleteRule(e);
        t.insertRule("#chart-aspect-ratio, .container-chart {aspect-ratio: " + e + " !important;}", 0)
    }
    static updateStyleOverride() {
        Session.updateCheaterVisibility(),
            Session.updateChartAspectRatio()
    }
    static isAuthenticated() {
        return "anonymousUser" != AUTHENTICATED && "" != AUTHENTICATED && null != AUTHENTICATED
    }
}
Session.isSilent = !1,
    Session.currentRequests = 0,
    Session.currentSeasons = null,
    Session.currentSeasonsMap = null,
    Session.currentSeasonsIdMap = null,
    Session.currentSeason = null,
    Session.currentTeamFormat = null,
    Session.currentTeamType = null,
    Session.currentPersonalSeason = -1,
    Session.currentPersonalTeamFormat = null,
    Session.currentPersonalTeamType = null,
    Session.currentAccount = null,
    Session.currentFollowing = null,
    Session.currentRoles = null,
    Session.currentSearchParams = null,
    Session.isHistorical = !1,
    Session.currentStateRestoration = Promise.resolve(),
    Session.statesRestored = 0,
    Session.currentRestorationSearch = null,
    Session.currentRestorationHash = null,
    Session.lastNonModalParams = "?#stats",
    Session.lastNonModalTitle = "Stats",
    Session.titleAndUrlHistory = [["Stats", "?#stats"]],
    Session.theme = null,
    Session.themeLinks = new Map,
    Session.deviceThemeCallback = function (e) {
        Session.setTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME.DARK : THEME.LIGHT)
    }
    ,
    Session.sessionStartTimestamp = null,
    Session.INVALID_API_VERSION_CODE = 112233,
    Session.confirmActionText = null,
    Session.confirmAction = null,
    Session.multiValueInputSeparator = "\t",
    Session.sectionParams = new Map;
class PersonalUtil {
    static getMyAccount() {
        Util.setGeneratingStatus(STATUS.BEGIN);
        const e = ROOT_CONTEXT_PATH + "api/my/common";
        return Session.beforeRequest().then(t => fetch(e)).then(Session.verifyJsonResponse).then(e => {
            Model.DATA.get(VIEW.PERSONAL_CHARACTERS).set(VIEW_DATA.SEARCH, e.characters),
                Model.DATA.get(VIEW.FOLLOWING_CHARACTERS).set(VIEW_DATA.SEARCH, e.followingCharacters),
                Session.currentFollowing = e.accountFollowings,
                Session.currentRoles = e.roles,
                PersonalUtil.updateMyAccount(e),
                Util.setGeneratingStatus(STATUS.SUCCESS)
        }
        ).catch(e => Session.onPersonalException(e))
    }
    static updateMyAccount(e) {
        Session.currentAccount = e.account;
        const t = document.querySelector("#login-battletag");
        t && (t.textContent = Session.currentAccount.battleTag);
        const a = document.querySelector("#personal-tab");
        a && (a.querySelector(":scope .tab-name").textContent = Session.currentAccount.battleTag);
        const r = document.querySelector("#login-roles");
        if (r) {
            r.textContent = e.roles.sort((e, t) => e.localeCompare(t)).join(", ");
            const t = document.querySelector("#account-additional-info");
            ElementUtil.removeChildren(t)
        }
        PersonalUtil.updateAccountConnections(e)
    }
    static updateAccountConnections(e) {
        const t = document.querySelector("#account-linked-accounts-table");
        if (!t)
            return;
        t.querySelectorAll(".dynamic").forEach(ElementUtil.removeChildren);
        const a = document.querySelector("#account-linked-accounts");
        e.characters ? (a.querySelectorAll(":scope .eligible").forEach(e => e.classList.remove("d-none")),
            a.querySelectorAll(":scope .ineligible").forEach(e => e.classList.add("d-none")),
            PersonalUtil.updateDiscordConnection(t, e)) : (a.querySelectorAll(":scope .eligible").forEach(e => e.classList.add("d-none")),
                a.querySelectorAll(":scope .ineligible").forEach(e => e.classList.remove("d-none")))
    }
    static updateDiscordConnection(e, t) {
        const a = e.querySelector(":scope #account-connection-discord");
        if (t.discordUser) {
            a.querySelector(":scope .account-connection-name").textContent = t.discordUser.user.name + (t.discordUser.user.discriminator ? "#" + t.discordUser.user.discriminator : "");
            const e = ElementUtil.createElement("a", null, "btn btn-outline-danger", "Unlink", [["href", "#"]]);
            e.addEventListener("click", PersonalUtil.unlinkDiscordAccount),
                a.querySelector(":scope .account-connection-action").appendChild(e);
            const r = ElementUtil.createElement("input", null, "", null, [["type", "checkbox"]]);
            ElementUtil.changeInputValue(r, t.discordUser.meta.public),
                r.addEventListener("click", PersonalUtil.updateDiscordAccountVisibility),
                a.querySelector(":scope .account-connection-public").appendChild(r)
        } else
            a.querySelector(":scope .account-connection-action").appendChild(ElementUtil.createElement("a", null, "btn btn-outline-success", "Link", [["href", ROOT_CONTEXT_PATH + "verify/discord"]]))
    }
    static unlinkDiscordAccount() {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.beforeRequest().then(e => fetch(ROOT_CONTEXT_PATH + "api/my/discord/unlink", Util.addCsrfHeader({
                method: "POST"
            }))).then(Session.verifyResponse).then(Session.getMyInfo).then(Util.successStatusPromise).catch(e => Session.onPersonalException(e))
    }
    static updateDiscordAccountVisibility(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.beforeRequest().then(t => fetch(ROOT_CONTEXT_PATH + "api/my/discord/public/" + e.target.checked, Util.addCsrfHeader({
                method: "POST"
            }))).then(Session.verifyResponse).then(Session.getMyInfo).then(Util.successStatusPromise).catch(e => Session.onPersonalException(e))
    }
}
class SC2Restful {
    static baseStart() {
        Session.initThemes(),
            Session.updateStyleOverride(),
            Session.APPLICATION_VERSION = APPLICATION_VERSION
    }
    static start() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : START_MODE.FULL;
        return e !== START_MODE.BARE && window.addEventListener("popstate", e => {
            HistoryUtil.restoreState(e)
        }
        ),
            e == START_MODE.BARE ? (Util.formatDateTimes(),
                ChartUtil.init(),
                SC2Restful.enhance(e),
                Promise.resolve(START_MODE.BARE)) : e == START_MODE.ESSENTIAL ? (SC2Restful.initAll(),
                    Session.restoreState(),
                    SC2Restful.enhance(e),
                    ChartUtil.observeChartables(),
                    HistoryUtil.initActiveTabs(),
                    ChartUtil.observeCharts(),
                    Promise.resolve(1)) : new Promise((t, a) => {
                        SC2Restful.initAll(),
                            Session.restoreState(),
                            SC2Restful.enhance(e),
                            SC2Restful.afterEnhance(e),
                            ChartUtil.observeChartables(),
                            PaginationUtil.createPaginations(),
                            ElementUtil.createPlayerStatsCards(document.getElementById("player-stats-container")),
                            HistoryUtil.initActiveTabs(),
                            ChartUtil.observeCharts(),
                            t()
                    }
                    ).then(e => Promise.all([Session.getMyInfo(), SeasonUtil.getSeasons()])).then(e => {
                        "reauth" != e[0] && (Session.currentStateRestoration = HistoryUtil.restoreState(null))
                    }
                    )
    }
    static initAll() {
        Model.init(),
            ChartUtil.init(),
            Util.formatDateTimes()
    }
    static enhance() {
        switch (arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : START_MODE.FULL) {
            case START_MODE.FULL:
                LadderUtil.enhanceLadderForm(),
                    CharacterUtil.enhanceSearchForm(),
                    ClanUtil.enhanceClanSearchForm(),
                    TeamUtil.enhanceTeamSearch(),
                    VODUtil.enhance(),
                    CharacterUtil.enhanceAutoClanSearch(),
                    CharacterUtil.enhanceAllCharacterReportsControls(),
                    LadderUtil.enhanceMyLadderForm(),
                    SeasonUtil.enhanceSeasonStateForm(),
                    StatsUtil.enhanceGlobalStatsCtl(),
                    StatsUtil.enhanceRaceControls(),
                    StatsUtil.enhanceMapStatsFilm(),
                    StatsUtil.enhanceSettings(),
                    BootstrapUtil.setFormCollapsibleScroll("form-ladder"),
                    BootstrapUtil.setFormCollapsibleScroll("form-following-ladder"),
                    BootstrapUtil.enhanceEmbedBackdropCloseControls(),
                    Session.enhanceThemeInputs(),
                    Session.enhanceCheaterVisibilityInput(),
                    Session.enhanceCsrfForms(),
                    ChartUtil.enhanceHeightControls(),
                    ChartUtil.enhanceBeginAtZeroControls(),
                    ChartUtil.enhanceMmrAnnotationControls(),
                    StatsUtil.updateGamesStatsVisibility();
            case START_MODE.MINIMAL:
                CharacterUtil.setCharacterViewTasks(),
                    CharacterUtil.enhanceMmrForm(),
                    CharacterUtil.enhanceReportForm(),
                    CharacterUtil.updateReportForm(),
                    CharacterUtil.enhanceCharacterTeamsSeasonCtl(),
                    CharacterUtil.enhanceMatchesHistoricalMmrInput(),
                    CharacterUtil.enhanceMatchTypeInput(),
                    RevealUtil.enhanceCtl(),
                    VersusUtil.enhance(),
                    FollowUtil.enhanceFollowButtons(),
                    GroupUtil.enhance(),
                    CommunityUtil.enhance(),
                    BufferUtil.enhance();
            case START_MODE.ESSENTIAL:
                BootstrapUtil.enhanceTabs();
            case START_MODE.BARE:
                BootstrapUtil.init(),
                    BootstrapUtil.enhanceModals(),
                    BootstrapUtil.enhanceCollapsibles(),
                    BootstrapUtil.collapseOnCondition(),
                    FormUtil.enhanceFormInputGroupFilters(),
                    FormUtil.enhanceFormGroups(),
                    FormUtil.initInputStateLinks(),
                    FormUtil.linkInputStateBindings(),
                    FormUtil.enhanceFormConfirmations(),
                    BootstrapUtil.enhanceTooltips(),
                    EnhancementUtil.enhance(),
                    ElementUtil.enhanceFullscreenToggles(),
                    ElementUtil.enhanceCopyToClipboard(),
                    ElementUtil.enhanceCloneCtl(),
                    ElementUtil.enhanceRemoveCtl(document),
                    ElementUtil.enhanceClassCtl(),
                    Session.enhanceSerializable(),
                    ChartUtil.enhanceZoomToggles(),
                    ChartUtil.enhanceTimeAxisToggles(),
                    ChartUtil.updateHeightFromLocalStorage(),
                    Session.refreshTheme(),
                    ElementUtil.enhanceDocumentVisibilityTasks(),
                    ElementUtil.processFlags()
        }
    }
    static afterEnhance() {
        arguments.length > 0 && void 0 !== arguments[0] || START_MODE.FULL;
        CharacterUtil.afterEnhance(),
            TeamUtil.afterEnhance()
    }
    static getPredefinedOrRandomColor(e, t) {
        return SC2Restful.COLORS.get(e) || (t < SC2Restful.UNIQUE_COLORS.length ? SC2Restful.UNIQUE_COLORS[t] : Util.getRandomRgbColorString())
    }
}
if (SC2Restful.COLORS = new Map([["global", "#007bff"], ["all", "#007bff"], ["old", "#dc3545"], ["new", "#28a745"], ["low", "#28a745"], ["medium", "#ffc107"], ["high", "#dc3545"], ["neutral", "#6c757d"], ["terran", "rgba(1, 90, 145, 1)"], ["protoss", "rgba(222, 201, 62, 1)"], ["zerg", "rgba(136, 41, 145, 1)"], ["random", "rgba(150, 150, 150, 1)"], ["us", "rgba(23, 162, 184, 1)"], ["eu", "rgba(255, 193, 7, 1)"], ["kr", "rgba(108, 117, 125, 1)"], ["cn", "rgba(220, 53, 69, 1)"], ["bronze", "rgba(185, 113, 45, 1)"], ["silver", "rgba(115, 115, 115, 1)"], ["gold", "rgba(255, 215, 0, 1)"], ["platinum", "rgba(165, 164, 163, 1)"], ["diamond", "rgba(13, 69, 148, 1)"], ["master", "rgba(0, 177, 251, 1)"], ["grandmaster", "rgba(239, 62, 0, 1)"]]),
    SC2Restful.MULTI_COLORS = new Map([["tvt", [SC2Restful.COLORS.get("terran"), SC2Restful.COLORS.get("terran")]], ["tvp", [SC2Restful.COLORS.get("terran"), SC2Restful.COLORS.get("protoss")]], ["tvz", [SC2Restful.COLORS.get("terran"), SC2Restful.COLORS.get("zerg")]], ["tvr", [SC2Restful.COLORS.get("terran"), SC2Restful.COLORS.get("random")]], ["pvt", [SC2Restful.COLORS.get("protoss"), SC2Restful.COLORS.get("terran")]], ["pvp", [SC2Restful.COLORS.get("protoss"), SC2Restful.COLORS.get("protoss")]], ["pvz", [SC2Restful.COLORS.get("protoss"), SC2Restful.COLORS.get("zerg")]], ["pvr", [SC2Restful.COLORS.get("protoss"), SC2Restful.COLORS.get("random")]], ["zvt", [SC2Restful.COLORS.get("zerg"), SC2Restful.COLORS.get("terran")]], ["zvp", [SC2Restful.COLORS.get("zerg"), SC2Restful.COLORS.get("protoss")]], ["zvz", [SC2Restful.COLORS.get("zerg"), SC2Restful.COLORS.get("zerg")]], ["zvr", [SC2Restful.COLORS.get("zerg"), SC2Restful.COLORS.get("random")]], ["rvt", [SC2Restful.COLORS.get("random"), SC2Restful.COLORS.get("terran")]], ["rvp", [SC2Restful.COLORS.get("random"), SC2Restful.COLORS.get("protoss")]], ["rvz", [SC2Restful.COLORS.get("random"), SC2Restful.COLORS.get("zerg")]], ["rvr", [SC2Restful.COLORS.get("random"), SC2Restful.COLORS.get("random")]]]),
    SC2Restful.UNIQUE_COLORS = [...new Set(SC2Restful.COLORS.values())],
    SC2Restful.SITE_NAME = "SC2 Pulse",
    SC2Restful.MMR_HISTORY_START_DATE = new Date("2021-01-19T00:00:00"),
    SC2Restful.MMR_HISTORY_DAYS_MAX = 90,
    SC2Restful.REDIRECT_PAGE_TIMEOUT_MILLIS = 3500,
    SC2Restful.GM_COUNT = 200,
    SC2Restful.REM = parseInt(getComputedStyle(document.documentElement).fontSize),
    SC2Restful.IMAGES = new Map([["bronze", ElementUtil.createImage("league/", "bronze", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM / 2)], ["silver", ElementUtil.createImage("league/", "silver", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM / 1.33)], ["gold", ElementUtil.createImage("league/", "gold", "icon-chart table-image table-image-square", SC2Restful.REM)], ["platinum", ElementUtil.createImage("league/", "platinum", "icon-chart table-image table-image-square", SC2Restful.REM)], ["diamond", ElementUtil.createImage("league/", "diamond", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM / 1.6)], ["master", ElementUtil.createImage("league/", "master", "icon-chart table-image table-image-square", SC2Restful.REM)], ["grandmaster", ElementUtil.createImage("league/", "grandmaster", "icon-chart table-image table-image-square", SC2Restful.REM)], ["tier-1", ElementUtil.createImage("league/", "tier-1", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM)], ["tier-2", ElementUtil.createImage("league/", "tier-2", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM)], ["tier-3", ElementUtil.createImage("league/", "tier-3", "icon-chart table-image table-image-square", SC2Restful.REM, SC2Restful.REM)], ["terran", ElementUtil.createImage("race/", "terran", "icon-chart table-image table-image-square", SC2Restful.REM)], ["protoss", ElementUtil.createImage("race/", "protoss", "icon-chart table-image table-image-square", SC2Restful.REM)], ["zerg", ElementUtil.createImage("race/", "zerg", "icon-chart table-image table-image-square", SC2Restful.REM)], ["random", ElementUtil.createImage("race/", "random", "icon-chart table-image table-image-square", SC2Restful.REM)], ["us", ElementUtil.createImage("flag/", "us", "icon-chart table-image table-image-long", SC2Restful.REM)], ["eu", ElementUtil.createImage("flag/", "eu", "icon-chart table-image table-image-long", SC2Restful.REM)], ["kr", ElementUtil.createImage("flag/", "kr", "icon-chart table-image table-image-long", SC2Restful.REM)], ["cn", ElementUtil.createImage("flag/", "cn", "icon-chart table-image table-image-long", SC2Restful.REM)]]),
    "8" !== localStorage.getItem("s-local-storage-version")) {
    localStorage.removeItem("stats-match-up-type"),
        localStorage.removeItem("stats-match-up-map"),
        "5,0" === localStorage.getItem("stats-match-up-league") && localStorage.setItem("stats-match-up-league", "6,0" + Session.multiValueInputSeparator + "5,0");
    const e = parseInt(localStorage.getItem("stats-match-up-group-duration"));
    e < 3 && localStorage.setItem("stats-match-up-group-duration", e + 1),
        removeOldMmrLocalStorage("mmr"),
        removeOldMmrLocalStorage("team-mmr");
    const t = localStorage.getItem("clan-search-sort-by");
    null != t && localStorage.setItem("clan-search-sort-by", EnumUtil.enumOfFullName(t, CLAN_CURSOR).field),
        convertOldStreamSort("stream-sort-by"),
        convertOldStreamSort("stream-sort-by-featured"),
        localStorage.setItem("s-local-storage-version", "8")
}
function convertOldStreamSort(e) {
    const t = localStorage.getItem(e);
    if (null != t)
        switch (t) {
            case "RATING":
                localStorage.setItem(e, new SortParameter("rating", SORTING_ORDER.DESC).toPrefixedString());
                break;
            case "VIEWERS":
                localStorage.setItem(e, new SortParameter("viewers", SORTING_ORDER.DESC).toPrefixedString());
                break;
            case "TOP_PERCENT_REGION":
                localStorage.setItem(e, new SortParameter("topPercentRegion", SORTING_ORDER.DESC).toPrefixedString())
        }
}
function removeOldMmrLocalStorage(e) {
    const t = e + "-y-axis"
        , a = localStorage.getItem(t);
    null == a || "percent-global" !== a && "percent-league" !== a && "win-rate-season" !== a || localStorage.setItem(t, "mmr")
}
function ownKeys(e, t) {
    var a = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
        var r = Object.getOwnPropertySymbols(e);
        t && (r = r.filter(function (t) {
            return Object.getOwnPropertyDescriptor(e, t).enumerable
        })),
            a.push.apply(a, r)
    }
    return a
}
function _objectSpread(e) {
    for (var t = 1; t < arguments.length; t++) {
        var a = null != arguments[t] ? arguments[t] : {};
        t % 2 ? ownKeys(Object(a), !0).forEach(function (t) {
            _defineProperty(e, t, a[t])
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a)) : ownKeys(Object(a)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(a, t))
        })
    }
    return e
}
function _defineProperty(e, t, a) {
    return (t = _toPropertyKey(t)) in e ? Object.defineProperty(e, t, {
        value: a,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : e[t] = a,
        e
}
function _toPropertyKey(e) {
    var t = _toPrimitive(e, "string");
    return "symbol" == typeof t ? t : t + ""
}
function _toPrimitive(e, t) {
    if ("object" != typeof e || !e)
        return e;
    var a = e[Symbol.toPrimitive];
    if (void 0 !== a) {
        var r = a.call(e, t || "default");
        if ("object" != typeof r)
            return r;
        throw new TypeError("@@toPrimitive must return a primitive value.")
    }
    return ("string" === t ? String : Number)(e)
}
const CHART_ZOOM_MOD_KEY = "ctrl"
    , CHART_ZOOM_EVENT_MOD_KEY = "ctrlKey";
class ChartUtil {
    static createChart(e) {
        const t = ChartUtil.collectChartConfig(e);
        return t.group = e.getAttribute("data-chart-group") || "global",
            t.beginAtZero = e.getAttribute("data-chart-begin-at-zero") || "false" !== localStorage.getItem("chart-begin-at-zero") && "true",
            t.ctx = document.getElementById(e.getAttribute("data-chart-id")).getContext("2d", {
                willReadFrequently: "true" === t.willReadFrequently
            }),
            t.chartable = e.id,
            t.id = e.id.substring(0, e.id.length - 6),
            Util.isMobile() && (t.zoom = null),
            t.data = ChartUtil.collectChartJSData(e),
            ChartUtil.loadAdditionalChartData(t).then(a => ChartUtil.CHARTS.set(e.id, ChartUtil.createGenericChart(t)))
    }
    static collectChartConfig(e) {
        const t = {};
        for (const a of e.attributes)
            a.name.startsWith("data-chart-") && (t[Util.kebabCaseToCamelCase(a.name.substring(11))] = a.value);
        return t
    }
    static loadAdditionalChartData(e) {
        return ChartUtil.loadPatches(e)
    }
    static loadPatches(e) {
        return "mmr-meta" == e.customAnnotations && "true" == localStorage.getItem(e.id + "-patches") ? MetaUtil.loadPatchesIfNeeded().catch(Session.onPersonalException) : Promise.resolve()
    }
    static createGenericChart(e) {
        ChartUtil.decorateChartData(e.data, e);
        const t = new Chart(e.ctx, {
            customConfig: e,
            type: e.type,
            data: e.data,
            options: {
                normalized: !0,
                parsing: {
                    xAxisKey: !1,
                    yAxisKey: !1
                },
                animation: !1,
                aspectRatio: ChartUtil.ASPECT_RATIO,
                maintainAspectRatio: "false" !== e.maintainAspectRatio,
                scales: {
                    x: _objectSpread(_objectSpread({
                        title: {
                            display: !1,
                            text: e.xTitle
                        },
                        grid: {
                            display: !1
                        }
                    }, e.zoom && "time" == e.xType && {
                        beforeFit: ChartUtil.trimTicks
                    }), {}, {
                        ticks: _objectSpread(_objectSpread({
                            callback: function (e, t, a) {
                                const r = this.getLabelForValue(a[t].value)
                                    , n = r.lastIndexOf("(")
                                    , o = r.lastIndexOf(")");
                                return -1 == n || -1 == o || n > o ? r : r.substring(n + 1, o)
                            }
                        }, e.zoom && "time" == e.xType && {
                            align: "start"
                        }), {}, {
                            minRotation: 0,
                            maxRotation: 0,
                            autoSkipPadding: ChartUtil.xAutoSkipPadding(e)
                        }, "fast" === e.performance && {
                            sampleSize: 50
                        }),
                        stacked: "true" === e.stacked,
                        offset: "bar" === e.type
                    }, "time" === e.xType && {
                        type: "timestack",
                        timestack: {
                            left_floating_tick_thres: !1,
                            tooltip_format: Util.DATE_TIME_OPTIONS
                        }
                    }),
                    y: {
                        title: {
                            display: !1,
                            text: e.yTitle
                        },
                        grid: {
                            color: Session.theme == THEME.DARK ? "#242a30" : "rgba(0,0,0,0.1)"
                        },
                        border: {
                            color: Session.theme == THEME.DARK ? "#242a30" : "rgba(0,0,0,0.1)"
                        },
                        ticks: {
                            callback: (e, t, a) => Util.NUMBER_FORMAT.format(e)
                        },
                        stacked: "true" === e.stacked,
                        beginAtZero: "true" === e.beginAtZero,
                        suggestedMin: "true" === e.beginAtZero ? e.yMin : null,
                        suggestedMax: "true" === e.beginAtZero ? e.yMax : null,
                        reverse: "true" === e.yReversed
                    }
                },
                spanGaps: !0,
                hover: {
                    mode: "pie" === e.data.customMeta.type || "doughnut" === e.data.customMeta ? "dataset" : "index",
                    position: "nearest",
                    intersect: !1
                },
                layout: {
                    padding: {
                        right: 15
                    }
                },
                plugins: _objectSpread(_objectSpread({
                    tooltip: _objectSpread({
                        enabled: !1,
                        external: ChartUtil.createHtmlTooltip,
                        bodyFontFamily: "'Liberation Mono', monospace",
                        mode: "pie" === e.data.customMeta.type || "doughnut" === e.data.customMeta ? "dataset" : "index",
                        position: "configurable",
                        intersect: !1,
                        callbacks: {
                            beforeBody: ChartUtil.beforeBody,
                            label: "true" === e.tooltipPercentage ? ChartUtil.addTooltipPercentage : ChartUtil.formatTooltip
                        }
                    }, "reverse" === e.tooltipSort && {
                        itemSort: ChartUtil.sortTooltipReversed
                    }),
                    legend: _objectSpread({
                        onClick: ChartUtil.onLegendClick,
                        display: "false" != e.legendDisplay
                    }, e.generateLegendLabels && {
                        labels: {
                            generateLabels: e.generateLegendLabels
                        }
                    }),
                    title: {
                        display: null != e.title,
                        text: e.title
                    }
                }, e.zoom && {
                    zoom: {
                        pan: {
                            enabled: !0,
                            mode: e.zoom,
                            onPan: ChartUtil.onZoom,
                            onPanStart: ChartUtil.onPanStart,
                            onPanComplete: ChartUtil.onPanComplete,
                            onPanRejected: ChartUtil.onPanComplete
                        },
                        zoom: {
                            mode: e.zoom,
                            onZoom: ChartUtil.onZoom,
                            wheel: {
                                enabled: !0,
                                modifierKey: "ctrl"
                            },
                            drag: {
                                enabled: !0,
                                modifierKey: "ctrl",
                                backgroundColor: "rgba(0, 176, 244, 0.15)",
                                borderColor: "rgb(0, 176, 244)",
                                borderWidth: "0.5"
                            },
                            pinch: {
                                enabled: !1
                            }
                        },
                        limits: {
                            x: {},
                            y: {}
                        }
                    }
                }), e.customAnnotations && {
                    annotation: {
                        clip: !0,
                        annotations: ChartUtil.createCustomAnnotationsCallback
                    }
                }),
                elements: {
                    line: {
                        tension: "fast" !== e.performance && .4
                    }
                },
                datasets: {
                    bar: {
                        inflateAmount: .33
                    }
                }
            }
        });
        return t.tryUpdate = ChartUtil.tryUpdate,
            t.updateEnabled = !0,
            e.zoom && (ChartUtil.createZoomControls(t),
                t.canvas.addEventListener("mousemove", ChartUtil.onCanvasInteraction),
                t.canvas.addEventListener("click", ChartUtil.onCanvasInteraction),
                t.canvas.addEventListener("mouseout", ChartUtil.onCanvasMouseOut)),
            ChartUtil.updateChartZoomLimits(t),
            t
    }
    static xAutoSkipPadding(e) {
        return "bar" === e.type && "time" !== e.xType ? 3 : "time" !== e.xType ? 20 : 40
    }
    static applyFixes(e) {
        for (let t of Object.values(e.options.scales))
            "x" == t.id && (e.options.scales[t.id].ticks.autoSkipPadding = "timestack" == t.type ? null : ChartUtil.xAutoSkipPadding(e.config._config.customConfig)),
                "time" != t.type && (e.options.scales[t.id].ticks.autoSkip = !0),
                t.type == (ChartUtil.SCALE_TYPE_OVERRIDES.get("time") || "time") && e.config._config.customConfig.zoom && (t.beforeFit = ChartUtil.trimTicks,
                    t.ticks.align = "start")
    }
    static trimTicks(e) {
        e.ticks.length <= 1 || (e.ticks[e.ticks.length - 1] = {
            label: ""
        })
    }
    static createZoomControls(e) {
        const t = document.createElement("button");
        t.id = "chart-zoom-ctl-" + e.config._config.customConfig.chartable,
            t.setAttribute("type", "button"),
            t.classList.add("btn", "btn-outline-info", "chart-zoom-ctl"),
            t.setAttribute("data-chartable-id", e.config._config.customConfig.chartable),
            t.textContent = "".concat("ctrl", "+mouse wheel/").concat("ctrl", "+mouse drag to zoom, mouse drag to pan"),
            t.addEventListener("click", ChartUtil.resetZoom),
            e.canvas.closest(".container-chart-outer").querySelector(":scope .container-chart-components").prepend(t)
    }
    static onCanvasInteraction(e) {
        const t = document.querySelector('[data-chart-id="' + e.target.id + '"]').id
            , a = e.ctrlKey;
        a && (document.querySelector("#chartjs-tooltip-" + t).style.opacity = 0),
            ChartUtil.CHARTS.get(t).config._config.customConfig.zoomModKeyDown = a
    }
    static onCanvasMouseOut(e) {
        const t = document.querySelector('[data-chart-id="' + e.target.id + '"]').id;
        ChartUtil.CHARTS.get(t).config._config.customConfig.zoomModKeyDown = !1
    }
    static resetZoom(e) {
        const t = e.target;
        if (!t || !t.classList.contains("active"))
            return;
        const a = ChartUtil.CHARTS.get(t.getAttribute("data-chartable-id"));
        a.resetZoom("zoom"),
            t.textContent = "".concat("ctrl", "+mouse wheel/").concat("ctrl", "+mouse drag to zoom, mouse drag to pan"),
            t.classList.remove("active"),
            a.config._config.customConfig.isZoomed = !1
    }
    static onZoom(e) {
        document.getElementById("chartjs-tooltip-" + e.chart.config._config.customConfig.chartable).style.opacity = 0;
        const t = document.getElementById("chart-zoom-ctl-" + e.chart.config._config.customConfig.chartable);
        t.classList.add("active"),
            t.textContent = "Reset zoom/pan",
            e.chart.config._config.customConfig.isZoomed = !0
    }
    static onPanStart(e) {
        if (e.event.srcEvent.ctrlKey)
            return !1;
        e.chart.isPanning = !0
    }
    static onPanComplete(e) {
        e.chart.isPanning = !1
    }
    static onLegendClick(e, t) {
        const a = document.querySelector("#chartjs-tooltip");
        a && (a.style.opacity = 0);
        var r = t.datasetIndex
            , n = this.chart
            , o = n.getDatasetMeta(r);
        o.hidden = null === o.hidden ? !n.data.datasets[r].hidden : null,
            n.update()
    }
    static beforeBody(e) {
        return e[0].chart.config._config.customConfig.data.customMeta.headers
    }
    static formatTooltip(e) {
        let t, a;
        const r = e.chart.config._config.customConfig.data;
        "pie" === r.customMeta.type || "doughnut" === r.customMeta ? (a = r.labels,
            t = a[e.dataIndex]) : (a = r.datasets.map(e => e.label),
                t = a[e.datasetIndex]);
        const n = ChartUtil.CHART_RAW_DATA.get(r.customMeta.id);
        if (null != n && n.additionalDataGetter) {
            const a = n.additionalDataGetter(n.rawData, r, e.dataIndex, e.datasetIndex);
            a.constructor === Array ? (a.unshift(t),
                t = a) : t = [t, a]
        } else {
            const a = r.datasets[e.datasetIndex].data[e.dataIndex];
            t = [t, (Number.isInteger(a) ? Util.NUMBER_FORMAT : Util.DECIMAL_FORMAT).format(a)]
        }
        return t
    }
    static addTooltipPercentage(e, t) {
        let a;
        a = "pie" === t.customMeta.type || "doughnut" === t.customMeta ? t.labels[e.dataIndex] : t.datasets[e.datasetIndex].label,
            a += " " + Util.NUMBER_FORMAT.format(t.datasets[e.datasetIndex].data[e.dataIndex]);
        let r = 0;
        for (const a of t.datasets)
            r += a.data[e.dataIndex];
        return a += "\t(" + Util.calculatePercentage(t.datasets[e.datasetIndex].data[e.dataIndex], r) + "%)",
            a
    }
    static sortTooltipReversed(e, t, a) {
        return e.datasetIndex !== t.datasetIndex ? t.datasetIndex - e.datasetIndex : t.index - e.index
    }
    static createHtmlTooltip(e) {
        const t = e.tooltip
            , a = ChartUtil.getOrCreateTooltipElement(e.chart);
        if (0 === t.opacity || 1 == e.chart.config._config.customConfig.zoomModKeyDown)
            return void (a.style.opacity = 0);
        const r = e.chart.canvas.getBoundingClientRect();
        t.caretX < 0 || t.caretX > r.width || t.caretY < 0 || t.caretY > r.height ? a.style.opacity = 0 : (ChartUtil.injectTooltipTableHeaders(a, t, e),
            ChartUtil.injectTooltipTableData(a, t, e),
            ChartUtil.setTooltipPosition(a, t, e, r))
    }
    static getOrCreateTooltipElement(e) {
        let t = document.getElementById("chartjs-tooltip-" + e.config._config.customConfig.chartable);
        if (!t) {
            t = document.createElement("div"),
                t.id = "chartjs-tooltip-" + e.config._config.customConfig.chartable,
                t.classList.add("chartjs-tooltip");
            let a = ['<h2></h2><div class="d-flex">'];
            const r = e.config._config.customConfig.tooltipTableCount ? e.config._config.customConfig.tooltipTableCount : 1;
            for (let e = 0; e < r; e++)
                a.push('<div class="d-inline-block flex-grow-1 '.concat(0 != e ? "ml-2" : "", '"><table class="table table-sm tooltip-table-').concat(e, '"><thead></thead><tbody></tbody></table></div>'));
            a.push("</div>"),
                t.innerHTML = a.join(""),
                t.style.position = "absolute",
                t.style.pointerEvents = "none",
                e.canvas.closest(".container-chart").appendChild(t)
        }
        return t
    }
    static injectTooltipTableHeaders(e, t, a) {
        const r = e.querySelectorAll(":scope table thead")
            , n = r.length > 1 ? "horizontal" : ChartUtil.getTooltipLayout(a);
        e.setAttribute("data-layout", n);
        for (const e of r)
            if (ElementUtil.removeChildren(e),
                "horizontal" == n) {
                if (t.beforeBody && t.beforeBody.length > 0) {
                    const a = e.insertRow();
                    TableUtil.createRowTh(a).textContent = "L";
                    for (const e of t.beforeBody)
                        TableUtil.createRowTh(a).textContent = e
                }
            } else if (t.body) {
                const a = e.insertRow()
                    , r = t.body.map(e => e.lines);
                t.beforeBody && r[0].length == t.beforeBody.length && (TableUtil.createRowTh(a).textContent = "L");
                for (let e = 0; e < r.length; e++) {
                    const r = TableUtil.createRowTh(a);
                    ChartUtil.setLegendItem(r, t, e)
                }
            }
    }
    static injectTooltipTableData(e, t, a) {
        const r = e.querySelectorAll(":scope table tbody")
            , n = r.length > 1 ? "horizontal" : ChartUtil.getTooltipLayout(a);
        if (r.forEach(e => ElementUtil.removeChildren(e)),
            t.body) {
            const a = t.title || []
                , o = t.body.map(e => e.lines);
            a.forEach(t => e.querySelector(":scope h2").textContent = t),
                "horizontal" == n ? ChartUtil.appendHorizontalTooltipData(t, r, o) : ChartUtil.appendVerticalTooltipData(t, r, o)
        }
    }
    static getTooltipLayout(e) {
        const t = e.chart.config._config.customConfig.group
            , a = ChartUtil.DEFAULT_GROUP_CONFIG.get(t)
            , r = a ? a.tooltipLayout : "horizontal";
        return localStorage.getItem("chart-" + t + "-tooltip-layout") || r
    }
    static setLegendItem(e, t, a) {
        const r = t.labelColors[a]
            , n = r.borderColor ? r.borderColor : r.backgroundColor;
        e.innerHTML = '<div class="legend-color" style="background-color: ' + n + ';"></div>'
    }
    static appendHorizontalTooltipData(e, t, a) {
        const r = a.length / t.length;
        a.forEach((a, n) => {
            const o = t[Math.floor(n / r)].insertRow()
                , l = o.insertCell()
                , s = e.labelColors[n]
                , i = s.borderColor ? s.borderColor : s.backgroundColor;
            l.innerHTML = '<div class="legend-color" style="background-color: ' + i + ';"></div>';
            const c = SC2Restful.IMAGES.get(a[0]);
            if (c) {
                const e = o.insertCell();
                e.classList.add("text-center"),
                    e.appendChild(c.cloneNode())
            } else
                o.insertCell().textContent = a[0];
            for (let e = 1; e < a.length; e++) {
                const t = a[e];
                t.nodeType ? o.insertCell().appendChild(t) : o.insertCell().textContent = t
            }
        }
        )
    }
    static appendVerticalTooltipData(e, t, a) {
        const r = t[0];
        for (let t = 0; t < a[0].length; t++) {
            const n = r.insertRow();
            e.beforeBody && e.beforeBody.length > 0 && (TableUtil.createRowTh(n).textContent = e.beforeBody[t]);
            for (let e of a) {
                const a = e[t]
                    , r = SC2Restful.IMAGES.get(a);
                if (r) {
                    const e = n.insertCell();
                    e.classList.add("text-center"),
                        e.appendChild(r.cloneNode())
                } else
                    a.nodeType ? n.insertCell().appendChild(a) : n.insertCell().textContent = a
            }
        }
    }
    static setTooltipPosition(e, t, a, r) {
        e.classList.remove("above", "below", "no-transform"),
            t.yAlign ? e.classList.add(t.yAlign) : e.classList.add("no-transform"),
            e.style.opacity = 1;
        const { height: n, width: o } = e.getBoundingClientRect()
            , l = a.chart.canvas.getBoundingClientRect()
            , s = a.chart.canvas.offsetTop
            , i = a.chart.canvas.offsetLeft
            , c = t.caretY
            , d = t.caretX;
        let u = s + c - n
            , m = i + d - o / 2
            , p = SC2Restful.REM;
        const h = d < l.width / 2
            , g = c < l.height / 2
            , S = "auto" == localStorage.getItem("chart-tooltip-x-align") ? h ? "right" : "left" : localStorage.getItem("chart-tooltip-x-align") || "left"
            , A = "auto" == localStorage.getItem("chart-tooltip-y-align") ? g ? "top" : "bottom" : localStorage.getItem("chart-tooltip-y-align") || "bottom"
            , T = localStorage.getItem("chart-tooltip-position") || Util.isMobile() ? "average" : "dataXCursorY"
            , E = T.includes("data") || "average" == T ? ChartUtil.calculateTooltipPosition(h ? "right" : "left", g ? "bottom" : "top", o, n, p, l, c, s, i + d - o / 2, s + c - n) : ChartUtil.calculateTooltipPosition(S, A, o, n, p, l, c, s, m, u);
        m = E[0],
            u = E[1],
            e.style.top = "".concat(u, "px"),
            e.style.left = "".concat(m, "px")
    }
    static calculateTooltipPosition(e, t, a, r, n, o, l, s, i, c) {
        return "bottom" === t ? c += r + n : "center" === t ? c += r / 2 : "top" === t && (c -= n),
            "right" === e ? (i = i + a / 2 - n / 2,
                i += 2 * n) : "left" === e && (i -= a / 2,
                    i -= n),
            i < 0 && (i = 0),
            i > o.width - a && (i = o.width - a),
            "bottom" != t && l - r - n < 0 && (c = s),
            "top" != t && l + r + n > o.height && (c = s + o.height - r),
            [i, c]
    }
    static decorateChartData(e, t) {
        for (let a = 0; a < e.datasets.length; a++) {
            let r, n, o, l;
            if ("string" != typeof e.customColors[a] ? r = e.customColors[a] : (n = SC2Restful.MULTI_COLORS.get(e.customColors[a].toLowerCase()),
                r = n || SC2Restful.getPredefinedOrRandomColor(e.customColors[a], a)),
                r instanceof Array ? (o = r[0],
                    l = r[1]) : (o = r,
                        l = r),
                "line" === t.type)
                e.datasets[a].borderWidth = ChartUtil.getLineBorderWidth(t),
                    e.datasets[a].pointRadius = "fast" == t.performance ? 0 : null != t.pointRadius ? parseFloat(t.pointRadius) : .01,
                    e.datasets[a].hoverPointRadius = 2,
                    e.datasets[a].borderColor = o,
                    e.datasets[a].pointBackgroundColor = l,
                    e.datasets[a].backgroundColor = "rgba(0, 0, 0, 0)";
            else if ("doughnut" === t.type || "pie" === t.type) {
                const t = []
                    , r = [];
                for (let n = 0; n < e.datasets[a].data.length; n++) {
                    SC2Restful.getPredefinedOrRandomColor(e.customColors[n], n);
                    t.push(o),
                        r.push("rgba(0, 0, 0, 0)")
                }
                e.datasets[a].backgroundColor = t,
                    e.datasets[a].borderColor = r
            } else if (n) {
                const t = Util.changeFullRgbaAlpha(o, "0.7")
                    , r = Util.changeFullRgbaAlpha(l, "0.7");
                e.datasets[a].backgroundColor = ChartUtil.createPattern(100, 65, 55, 10, t, r),
                    e.datasets[a].borderColor = o
            } else
                e.datasets[a].backgroundColor = Util.changeFullRgbaAlpha(o, "0.7"),
                    e.datasets[a].borderColor = l,
                    e.datasets[a].borderWidth = {
                        top: 1,
                        left: 0,
                        right: 0,
                        bottom: 0
                    }
        }
    }
    static getLineBorderWidth(e) {
        return "fast" == e.performance ? ChartUtil.THIN_LINE_BORDER_WIDTH : ChartUtil.LINE_BORDER_WIDTH
    }
    static createPattern(e, t, a, r, n, o) {
        const l = document.createElement("canvas");
        l.width = e,
            l.height = t;
        const s = l.getContext("2d")
            , i = e / 2;
        let c = 0
            , d = !0;
        for (; c < t;) {
            const t = c + (d ? a : r);
            s.beginPath(),
                s.moveTo(i, c),
                s.lineTo(i, t),
                s.lineWidth = e,
                s.strokeStyle = d ? n : o,
                s.stroke(),
                d = !d,
                c = t
        }
        return s.createPattern(l, "repeat")
    }
    static collectChartJSData(e) {
        const t = e.getAttribute("data-chart-type")
            , a = (e.getAttribute("data-chart-stacked"),
                "true" === e.getAttribute("data-chart-direct") ? ChartUtil.CHART_RAW_DATA.get(e.id).data : TableUtil.collectTableData(e))
            , r = [];
        if ("doughnut" !== t && "pie" !== t)
            for (let e = 0; e < a.headers.length; e++)
                r.push(_objectSpread(_objectSpread({
                    label: a.headers[e],
                    data: a.values[e],
                    hidden: !Util.hasNonZeroValues(a.values[e])
                }, a.pointStyles && {
                    pointStyle: a.pointStyles[e]
                }), a.dataAnnotations && {
                    annotations: a.dataAnnotations[e]
                }));
        else {
            const e = [];
            for (let t = 0; t < a.headers.length; t++)
                e.push(a.values[t][0]);
            r.push({
                data: e
            })
        }
        return {
            labels: a.rowHeaders.length > 0 ? a.rowHeaders : a.headers,
            datasets: r,
            customColors: a.colors,
            customMeta: {
                id: e.id,
                type: t,
                headers: e.getAttribute("data-chart-tooltip-table-headers") ? e.getAttribute("data-chart-tooltip-table-headers").split(",") : []
            }
        }
    }
    static batchExecute(e, t) {
        var a;
        let r = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        const n = (null === (a = ChartUtil.CHARTS.get(e)) || void 0 === a ? void 0 : a.updateEnabled) || !0;
        try {
            var o;
            ChartUtil.setChartUpdateEnabledAll(e, !1),
                t(),
                r && (null === (o = ChartUtil.CHARTS.get(e)) || void 0 === o || o.update())
        } catch (e) {
            throw e
        } finally {
            ChartUtil.setChartUpdateEnabledAll(e, n)
        }
    }
    static setChartUpdateEnabledAll(e, t) {
        const a = ChartUtil.CHARTS.get(e);
        a && (a.updateEnabled = t),
            ChartUtil.setChartableUpdateEnabled(e, t)
    }
    static setChartableUpdateEnabled(e, t) {
        const a = ChartUtil.CHARTABLE_OBSERVERS.get(e);
        if (t) {
            const t = document.getElementById(e);
            a.observe(t, ChartUtil.CHARTABLE_OBSERVER_CONFIG)
        } else
            a.disconnect()
    }
    static tryUpdate(e) {
        !0 === this.updateEnabled && this.update(e)
    }
    static updateChart(e, t) {
        null !== t && (e.setActiveElements([]),
            e.data.labels = [],
            e.data.datasets = [],
            t.labels.forEach(t => e.data.labels.push(t)),
            t.datasets.forEach(t => e.data.datasets.push(t)),
            ChartUtil.decorateChartData(t, e.config._config.customConfig),
            e.config._config.customConfig.isZoomed && ChartUtil.resetZoom({
                target: document.querySelector("#chart-zoom-ctl-" + e.config._config.customConfig.chartable)
            }),
            e.tryUpdate(),
            ChartUtil.updateChartZoomLimits(e))
    }
    static updateChartZoomLimits(e) {
        e.config._config.customConfig.zoom && (e.options.plugins.zoom.limits.x.min = "original",
            e.options.plugins.zoom.limits.x.max = "original",
            e.options.plugins.zoom.limits.y.min = "original",
            e.options.plugins.zoom.limits.y.max = "original")
    }
    static updateChartable(e) {
        ElementUtil.executeTask(e.id, () => new Promise((t, a) => {
            const r = ChartUtil.CHARTS.get(e.id);
            void 0 === r ? t(ChartUtil.createChart(e)) : (ChartUtil.updateChart(r, ChartUtil.collectChartJSData(e)),
                t())
        }
        ))
    }
    static refresh(e) {
        ElementUtil.executeTask(e.config.chartable, () => ChartUtil.loadAdditionalChartData(e.config._config.customConfig).then(t => e.update()))
    }
    static updateChartableTab(e) {
        const t = document.querySelectorAll(e.getAttribute("data-target") + " .chartable");
        if (0 == t.length)
            return;
        const a = document.querySelector(e.getAttribute("data-target"))
            , r = ChartUtil.getChartableTabUpdatedMax(e);
        if (0 != r && r != a.getAttribute("data-chartable-last-updated")) {
            for (const e of t)
                null != e.getAttribute("data-last-updated") && ChartUtil.updateChartable(e);
            ChartUtil.linkChartTabsHeight(document.getElementById(t[0].getAttribute("data-chart-id"))),
                a.setAttribute("data-chartable-last-updated", r)
        }
    }
    static getChartableTabUpdatedMax(e) {
        var t = 0;
        for (const a of document.querySelectorAll(e.getAttribute("data-target") + " .chartable"))
            t = Math.max(t, a.getAttribute("data-last-updated"));
        return t
    }
    static observeChartables() {
        for (const e of document.getElementsByClassName("chartable")) {
            const t = new MutationObserver(ChartUtil.onChartableMutation);
            t.observe(e, ChartUtil.CHARTABLE_OBSERVER_CONFIG),
                ChartUtil.CHARTABLE_OBSERVERS.set(e.id, t)
        }
    }
    static onChartableMutation(e, t) {
        for (const t of e)
            t.target.closest(".tab-pane").classList.contains("active") && ChartUtil.updateChartable(t.target)
    }
    static observeCharts() {
        for (const e of document.querySelectorAll(".c-chart"))
            ChartUtil.CHART_OBSERVER.observe(e, ChartUtil.CHART_OBSERVER_CONFIG)
    }
    static onChartMutation(e, t) {
        for (const t of e) {
            const e = t.target.getAttribute("style");
            e.includes("width: 0") || e.includes("height: 0") || (t.target.classList.contains("c-ref") && ChartUtil.linkChartTabsHeight(t.target),
                ElementUtil.resolveElementPromise(t.target.id))
        }
    }
    static linkChartTabsHeight(e) {
        let t = 0;
        const a = e.closest(".tab-content").querySelectorAll(":scope > .tab-pane");
        for (const e of a)
            e.classList.contains("active") || (e.style.minHeight = null,
                t = Math.max(t, e.clientHeight));
        for (const e of a)
            e.style.minHeight = t + "px"
    }
    static enhanceZoomToggles() {
        document.querySelectorAll(".chart-zoom-toggle").forEach(e => {
            const t = document.getElementById(e.getAttribute("data-chartable"));
            ChartUtil.changeZoomState(t, e.checked),
                e.addEventListener("change", t => {
                    const a = document.getElementById(t.target.getAttribute("data-chartable"));
                    ChartUtil.changeZoomState(a, e.checked)
                }
                )
        }
        )
    }
    static changeZoomState(e, t) {
        const a = ChartUtil.CHARTS.get(e.id);
        t ? a ? (a.options.scales.y.beginAtZero = !1,
            a.options.scales.y.suggestedMin = void 0,
            a.options.scales.y.suggestedMax = void 0) : e.setAttribute("data-chart-begin-at-zero", "false") : a ? (a.options.scales.y.beginAtZero = !0,
                a.options.scales.y.suggestedMin = a.config._config.customConfig.yMin,
                a.options.scales.y.suggestedMax = a.config._config.customConfig.yMax) : e.setAttribute("data-chart-begin-at-zero", "true"),
            a && (a.tryUpdate(),
                ChartUtil.resetZoom({
                    target: document.querySelector("#chart-zoom-ctl-" + e.id)
                }),
                ChartUtil.updateChartZoomLimits(a))
    }
    static enhanceTimeAxisToggles() {
        document.querySelectorAll(".chart-x-time-toggle").forEach(e => {
            const t = document.getElementById(e.getAttribute("data-chartable"));
            ChartUtil.changeAxisType(t, "x", e.checked ? "time" : "category"),
                e.addEventListener("change", t => {
                    const a = document.getElementById(t.target.getAttribute("data-chartable"));
                    ChartUtil.changeAxisType(a, "x", e.checked ? "time" : "category")
                }
                )
        }
        )
    }
    static changeAxisType(e, t, a) {
        const r = ChartUtil.CHARTS.get(e.id);
        if (r) {
            r.options.scales[t].type = ChartUtil.SCALE_TYPE_OVERRIDES.get(a) || a,
                ChartUtil.applyFixes(r);
            try {
                r.tryUpdate()
            } catch (e) {
                if (!e.message.includes("lastIndexOf"))
                    throw e
            }
        } else
            e.setAttribute("data-chart-x-type", a)
    }
    static enhanceHeightControls() {
        const e = e => window.setTimeout(ChartUtil.updateHeightFromLocalStorage, 1);
        document.querySelector("#chart-height-high").addEventListener("click", e),
            document.querySelector("#chart-height-medium").addEventListener("click", e),
            document.querySelector("#chart-height-low").addEventListener("click", e)
    }
    static updateHeightFromLocalStorage() {
        ChartUtil.updateAspectRatioFromLocalStorage(),
            ChartUtil.updateFixedHeightFromLocalStorage()
    }
    static updateAspectRatioFromLocalStorage() {
        "true" == localStorage.getItem("chart-height-high") ? ChartUtil.ASPECT_RATIO = 2 : "true" == localStorage.getItem("chart-height-low") ? ChartUtil.ASPECT_RATIO = 4 : ChartUtil.ASPECT_RATIO = 2.5,
            ChartUtil.updateAspectRatio(),
            Session.updateChartAspectRatio()
    }
    static updateAspectRatio() {
        for (const e of ChartUtil.CHARTS.values())
            e.config.options.aspectRatio = ChartUtil.ASPECT_RATIO,
                e.tryUpdate()
    }
    static updateFixedHeightFromLocalStorage() {
        let e;
        e = "true" == localStorage.getItem("chart-height-high") ? ChartUtil.HIGH_HEIGHT_REM : "true" == localStorage.getItem("chart-height-low") ? ChartUtil.LOW_HEIGHT_REM : ChartUtil.MEDIUM_HEIGHT_REM;
        const t = Session.getStyleOverride().sheet;
        for (let e = 0; e < t.cssRules.length; e++)
            t.cssRules[e].cssText.startsWith(".container-chart-fixed-height") && t.deleteRule(e);
        t.insertRule(".container-chart-fixed-height {height: " + e + "rem;}", 0)
    }
    static setTopPercentYAxis(e) {
        const t = ChartUtil.CHARTS.get(e);
        if (t)
            switch (t.options.scales.y.beginAtZero) {
                case !0:
                    t.options.scales.y.suggestedMin = 0,
                        t.options.scales.y.suggestedMax = 100;
                case !1:
                    t.config._config.customConfig.yMin = 0,
                        t.config._config.customConfig.yMax = 100,
                        t.options.scales.y.reverse = !0
            }
        else {
            const t = document.getElementById(e);
            t.setAttribute("data-chart-y-min", 0),
                t.setAttribute("data-chart-y-max", 100),
                t.setAttribute("data-chart-y-reversed", !0)
        }
    }
    static setNormalYAxis(e) {
        const t = ChartUtil.CHARTS.get(e);
        if (t)
            t.options.scales.y.suggestedMin = void 0,
                t.options.scales.y.suggestedMax = void 0,
                t.options.scales.y.reverse = !1;
        else {
            const t = document.getElementById(e);
            t.removeAttribute("data-chart-y-min"),
                t.removeAttribute("data-chart-y-max"),
                t.removeAttribute("data-chart-y-reversed")
        }
    }
    static updateBeginAtZero(e, t) {
        e || (e = ChartUtil.CHARTS.entries()),
            void 0 === t && (t = "true" == localStorage.getItem("chart-begin-at-zero"));
        for (const [a, r] of e)
            ChartUtil.changeZoomState(document.getElementById(a), !t)
    }
    static enhanceBeginAtZeroControls() {
        document.querySelector("#chart-begin-at-zero").addEventListener("click", e => window.setTimeout(ChartUtil.updateBeginAtZero, 1))
    }
    static updateChartFromCtlGroup(e) {
        window.setTimeout(t => ChartUtil.refresh(ChartUtil.CHARTS.get(e.target.closest(".chart-input-group").getAttribute("data-chartable"))), 1)
    }
    static enhanceMmrAnnotationControls() {
        document.querySelectorAll(".tier-thresholds-ctl, .seasons-ctl, .patches-ctl").forEach(e => e.addEventListener("change", ChartUtil.updateChartFromCtlGroup))
    }
    static isTierThresholdApplicable(e) {
        return "percent-region" == e
    }
    static shouldUseAnnotationCache(e) {
        var t, a;
        return (null === (t = e.chart) || void 0 === t || null === (t = t.config) || void 0 === t || null === (t = t._config) || void 0 === t || null === (t = t.options) || void 0 === t || null === (t = t.plugins) || void 0 === t || null === (t = t.annotation) || void 0 === t ? void 0 : t.annotationCache) && !0 === (null === (a = e.chart) || void 0 === a ? void 0 : a.isPanning)
    }
    static createCustomAnnotationsCallback(e) {
        var t;
        const a = e.chart.config._config.customConfig ? ChartUtil.shouldUseAnnotationCache(e) ? e.chart.config._config.options.plugins.annotation.annotationCache : ChartUtil.createCustomAnnotations(e.chart.config._config.customConfig) : {};
        return a && null !== (t = e.chart) && void 0 !== t && null !== (t = t.config) && void 0 !== t && null !== (t = t._config) && void 0 !== t && null !== (t = t.options) && void 0 !== t && null !== (t = t.plugins) && void 0 !== t && t.annotation && (e.chart.config._config.options.plugins.annotation.annotationCache = a),
            a
    }
    static createCustomAnnotations(e) {
        let t;
        switch (e.customAnnotations) {
            case "mmr-meta":
                t = ChartUtil.createMmrMetaAnnotations(e);
                break;
            case "50":
                t = ChartUtil.create50Annotation(e);
                break;
            default:
                t = {}
        }
        return ChartUtil.createDatasetAnnotations(e).forEach(e => t[e.name] = e),
            t
    }
    static getAnnotationLineBorderWidth(e) {
        return "false" != localStorage.getItem(e.id + "-tier-thresholds") && ChartUtil.isTierThresholdApplicable(localStorage.getItem(e.id + "-y-axis")) ? ChartUtil.THICK_LINE_BORDER_WIDTH : ChartUtil.getLineBorderWidth(e)
    }
    static createDatasetAnnotations(e) {
        const t = ChartUtil.CHARTS.get(e.chartable)
            , a = e.data.datasets.filter((e, a) => t ? !0 !== t.getDatasetMeta(a).hidden : e).map(e => e.annotations).filter(e => null != e).flatMap(e => e);
        return a.filter(e => !e.name).forEach((e, t) => e.name = "dataset-" + t),
            a
    }
    static createMmrMetaAnnotations(e) {
        const t = {}
            , a = ChartUtil.CHARTS.get(e.chartable)
            , r = ChartUtil.getAnnotationLineBorderWidth(e);
        if (e.data.datasets.forEach(e => e.borderWidth = r),
            "false" != localStorage.getItem(e.id + "-tier-thresholds") && ChartUtil.isTierThresholdApplicable(localStorage.getItem(e.id + "-y-axis")) ? (ChartUtil.TIER_ANNOTATIONS || (ChartUtil.TIER_ANNOTATIONS = ChartUtil.addTierAnnotations({})),
                Object.entries(ChartUtil.TIER_ANNOTATIONS).forEach(e => t[e[0]] = e[1]),
                a && (a.options.scales.y.grid.display = !1)) : a && (a.options.scales.y.grid.display = !0),
            "false" != localStorage.getItem(e.id + "-seasons") && "false" != localStorage.getItem(e.id + "-x-type")) {
            const r = e.region || "EU";
            let n = ChartUtil.SEASON_ANNOTATIONS.get(r);
            n && Object.keys(n).length == Session.currentSeasonsMap.get(r).length || ChartUtil.SEASON_ANNOTATIONS.set(r, ChartUtil.addSeasonAnnotations({}, Array.from(Session.currentSeasonsMap.get(r).values()).map(e => e[0]), e)),
                n = ChartUtil.SEASON_ANNOTATIONS.get(r);
            const o = ChartUtil.getSeasonAnnotationPosition(ChartUtil.CHARTS.get(e.chartable));
            Object.values(n).forEach(e => e.label.position = o),
                Object.entries(n).forEach(e => t[e[0]] = e[1]),
                ChartUtil.foldAnnotations(Array.from(Object.values(n)), e, a)
        }
        if ("true" == localStorage.getItem(e.id + "-patches") && "false" != localStorage.getItem(e.id + "-x-type")) {
            let r = ChartUtil.PATCH_ANNOTATIONS.get(e.region);
            const n = ChartUtil.getPatchAnnotationPosition(a);
            if (!r) {
                r = {};
                const t = MetaUtil.PATCHES.filter(e => e.patch.build >= ChartUtil.PATCH_ANNOTATION_BUILD_MIN && 1 == e.patch.versus).map(t => ChartUtil.createPatchAnnotation(t, e.region, n));
                t.sort((e, t) => e.xMin - t.xMin),
                    t.forEach(e => r[e.label.content] = e),
                    ChartUtil.PATCH_ANNOTATIONS.set(e.region, r)
            }
            Object.values(r).forEach(e => e.label.position = n),
                Object.entries(r).forEach(e => t[e[0]] = e[1]),
                ChartUtil.foldAnnotations(Array.from(Object.values(r)), e, a, ChartUtil.setAnnotationLabelVisibility)
        }
        return t
    }
    static setAnnotationLabelVisibility(e, t) {
        e.label.display = t
    }
    static setAnnotationVisibility(e, t) {
        e.display = t
    }
    static foldAnnotations(e, t, a) {
        var r;
        let n = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : ChartUtil.setAnnotationVisibility
            , o = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : ChartUtil.ANNOTATION_FOLDING_MIN_SPACE_BETWEEN
            , l = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : ChartUtil.CENTER_WIDTH_CALCULATOR;
        if (!e)
            return;
        const s = l()
            , i = null == a || null === (r = a.getZoomedScaleBounds()) || void 0 === r ? void 0 : r.x
            , c = s / (i ? i.max - i.min : t.data.labels[t.data.labels.length - 1] - t.data.labels[0]);
        let d = e.length - 1;
        for (let t = e.length - 2; t >= 0; t--) {
            const a = e[d]
                , r = e[t];
            (a.xMin - r.xMin) * c < ChartUtil.calculateApproximateAnnotationLabelWidth(r.label) / 2 + ChartUtil.calculateApproximateAnnotationLabelWidth(a.label) / 2 + o ? n(r, !1) : (n(r, !0),
                d = t)
        }
    }
    static calculateApproximateAnnotationLabelWidth(e) {
        var t;
        let a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : ChartUtil.ANNOTATION_APPROXIMATE_LABEL_WIDTH_COEFFICIENT;
        return ((null === (t = e.font) || void 0 === t ? void 0 : t.size) || Chart.defaults.font.size) * e.content.length * a + 2 * (e.padding || Chart.defaults.elements.labelAnnotation.padding) + 2 * (e.borderWidth || Chart.defaults.elements.labelAnnotation.borderWidth)
    }
    static create50Annotation(e) {
        return {
            fifty: {
                type: "line",
                yMin: 50,
                yMax: 50,
                borderColor: "rgba(220, 53, 69, 0.4)",
                borderWidth: ChartUtil.getAnnotationLineBorderWidth(e),
                adjustScaleRange: !1
            }
        }
    }
    static addTierAnnotations(e) {
        for (const t of Object.values(TIER_RANGE)) {
            const a = t.league.name.charAt(0).toLowerCase() + (t.tierType + 1);
            e[a] = {
                type: "line",
                yMin: t.bottomThreshold,
                yMax: t.bottomThreshold,
                borderColor: Util.changeFullRgbaAlpha(SC2Restful.COLORS.get(t.league.name), "0.4"),
                borderWidth: 2,
                adjustScaleRange: !1,
                drawTime: "beforeDatasetsDraw",
                label: {
                    content: a,
                    display: !0,
                    position: "center",
                    backgroundColor: Util.changeFullRgbaAlpha(SC2Restful.COLORS.get(t.league.name), "0.75"),
                    padding: 3,
                    font: {
                        weight: "normal"
                    },
                    drawTime: "afterDatasetsDraw"
                }
            }
        }
        return e
    }
    static getSeasonAnnotationPosition(e) {
        return e && e.options.scales.y.reverse ? "end" : "start"
    }
    static addSeasonAnnotations(e, t, a) {
        const r = ChartUtil.getSeasonAnnotationPosition(ChartUtil.CHARTS.get(a.chartable));
        for (const a of t) {
            const t = a.battlenetId.toString();
            e[t] = {
                type: "line",
                xMin: a.start.valueOf(),
                xMax: a.start.valueOf(),
                borderColor: "rgba(127, 127, 127, 0.3)",
                borderWidth: 1,
                adjustScaleRange: !1,
                drawTime: "beforeDatasetsDraw",
                label: {
                    borderRadius: 3,
                    content: t,
                    display: !0,
                    position: r,
                    padding: 2,
                    font: {
                        weight: "normal",
                        lineHeight: 1
                    },
                    drawTime: "afterDatasetsDraw"
                }
            }
        }
        return e
    }
    static getPatchAnnotationPosition(e) {
        return e && e.options.scales.y.reverse ? "start" : "end"
    }
    static createPatchAnnotation(e, t, a) {
        const r = e.releases ? e.releases[t] || Object.values(e.releases).find(e => !0) : null
            , n = r ? Util.parseIsoDateTime(r).valueOf() : null;
        return {
            type: "line",
            xMin: n,
            xMax: n,
            borderColor: "rgba(40, 167, 69, 0.4)",
            borderWidth: 1,
            adjustScaleRange: !1,
            drawTime: "beforeDatasetsDraw",
            label: {
                content: e.patch.version,
                display: !0,
                position: a,
                padding: 3,
                backgroundColor: "rgba(40, 167, 69, 0.9)",
                font: {
                    weight: "normal"
                },
                drawTime: "afterDatasetsDraw"
            }
        }
    }
    static init() {
        Util.isMobile() && !localStorage.getItem("chart-tooltip-position") && localStorage.setItem("chart-tooltip-position", "average")
    }
    static setCustomConfigOption(e, t, a) {
        const r = ChartUtil.CHARTS.get(e);
        r ? r.config._config.customConfig[t] = a : document.getElementById(e).setAttribute("data-chart-" + Util.camelCaseToKebabCase(t), a)
    }
    static createChartContainer(e) {
        const t = ElementUtil.createElement("div", e + "-container", "container-chart");
        return t.appendChild(ElementUtil.createElement("canvas", e, "c-chart")),
            t
    }
}
ChartUtil.CHARTS = new Map,
    ChartUtil.CHART_RAW_DATA = new Map,
    ChartUtil.CHARTABLE_OBSERVERS = new Map,
    ChartUtil.CHARTABLE_OBSERVER_CONFIG = {
        attributes: !0,
        childList: !1,
        subtree: !1
    },
    ChartUtil.CHART_OBSERVER_CONFIG = {
        attributes: !0,
        attributeFilter: ["style"],
        childList: !1,
        subtree: !1,
        characterData: !1
    },
    ChartUtil.CHART_OBSERVER = new MutationObserver(ChartUtil.onChartMutation),
    ChartUtil.ASPECT_RATIO = 2.5,
    ChartUtil.LOW_HEIGHT_REM = 8.5,
    ChartUtil.MEDIUM_HEIGHT_REM = 13.8,
    ChartUtil.HIGH_HEIGHT_REM = 17.1,
    ChartUtil.THICK_LINE_BORDER_WIDTH = 3,
    ChartUtil.LINE_BORDER_WIDTH = 2,
    ChartUtil.THIN_LINE_BORDER_WIDTH = 1.25,
    ChartUtil.DEFAULT_GROUP_CONFIG = new Map([["mmr", {
        tooltipLayout: "vertical"
    }]]),
    ChartUtil.SCALE_TYPE_OVERRIDES = new Map([["time", "timestack"]]),
    ChartUtil.TIER_ANNOTATIONS = null,
    ChartUtil.SEASON_ANNOTATIONS = new Map,
    ChartUtil.PATCH_ANNOTATIONS = new Map,
    ChartUtil.PATCH_ANNOTATION_BUILD_MIN = 39576,
    ChartUtil.ANNOTATION_FOLDING_MIN_SPACE_BETWEEN = 2,
    ChartUtil.ANNOTATION_APPROXIMATE_LABEL_WIDTH_COEFFICIENT = .6,
    ChartUtil.DEFAULT_Y_AXIS_LABEL_OFFSET = 4 * SC2Restful.REM,
    ChartUtil.CENTER_WIDTH_CALCULATOR = () => document.querySelector("#section-center").clientWidth - ChartUtil.DEFAULT_Y_AXIS_LABEL_OFFSET,
    ChartUtil.CURSOR_PLUGIN = {
        id: "nephest-cursor",
        afterDraw: e => {
            if ("line" == e.config.type && e.tooltip._active && e.tooltip._active.length) {
                var t = e.tooltip._active[0]
                    , a = e.ctx
                    , r = t.element.x
                    , n = e.legend.bottom
                    , o = e.chartArea.bottom;
                a.save(),
                    a.globalCompositeOperation = "destination-over",
                    a.beginPath(),
                    a.moveTo(r, n),
                    a.lineTo(r, o),
                    a.setLineDash([1, 2]),
                    a.lineWidth = 1,
                    a.strokeStyle = Session.theme == THEME.DARK ? "#d3d3d3" : "black",
                    a.stroke(),
                    a.restore()
            }
        }
    },
    Chart.register(ChartUtil.CURSOR_PLUGIN),
    Chart.registry.getPlugin("tooltip").positioners.dataXCursorY = (e, t) => e.length > 0 ? {
        x: e[0].element.x,
        y: t.y
    } : t,
    Chart.registry.getPlugin("tooltip").positioners.cursorXCursorY = (e, t) => t,
    Chart.registry.getPlugin("tooltip").positioners.configurable = (e, t) => {
        const a = localStorage.getItem("chart-tooltip-position") || "dataXCursorY";
        return Chart.registry.getPlugin("tooltip").positioners[a](e, t)
    }
    ;
class StatsUtil {
    static init() {
        StatsUtil.initialized || (StatsUtil.initGlobalStats(),
            StatsUtil.initialized = !0)
    }
    static initGlobalStats() {
        const e = document.querySelector("#stats-global-mode");
        for (const t of Object.values(LADDER_STATS_GLOBAL_VIEW_MODE))
            e.appendChild(ElementUtil.createElement("option", null, null, t.name, [["value", t.fullName]]));
        e.value = EnumUtil.enumOfStoredFullName("stats-global-mode", LADDER_STATS_GLOBAL_VIEW_MODE, LADDER_STATS_GLOBAL_VIEW_MODE.MIXED).fullName,
            StatsUtil.updateGlobalStatsMode()
    }
    static filterStats(e, t, a, r) {
        null == a && (a = "false" !== localStorage.getItem("stats-global-remove-current-season")),
            null == r && (r = "false" !== localStorage.getItem("stats-global-remove-abnormal-seasons"));
        const n = [];
        a && n.push(SeasonUtil.isCurrentSeason),
            r && n.push(SeasonUtil.isAbnormalSeason),
            0 != n.length && Object.entries(e).filter(e => n.some(t => t(e[0]))).forEach(e => t(e[1]))
    }
    static updateQueueStatsModel(e) {
        const t = new URLSearchParams(e)
            , a = new URLSearchParams;
        a.append("queue", EnumUtil.enumOfFullName(t.get("queue"), TEAM_FORMAT).fullName),
            a.append("teamType", EnumUtil.enumOfFullName(t.get("teamType"), TEAM_TYPE).fullName);
        const r = "".concat(ROOT_CONTEXT_PATH, "api/stats/player-base?").concat(a.toString());
        return Session.beforeRequest().then(e => fetch(r)).then(Session.verifyJsonResponse).then(e => (Model.DATA.get(VIEW.GLOBAL).set(VIEW_DATA.QUEUE_STATS, e),
            e))
    }
    static updateQueueStatsView() {
        StatsUtil.init();
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.QUEUE_STATS);
        StatsUtil.updateQueueStatsPlayerCount(e),
            StatsUtil.updateQueueStatsActivity(e)
    }
    static updateQueueStatsPlayerCount(e) {
        const t = {};
        for (let a = 0; a < e.length; a++) {
            const r = e[a];
            t[r.season] = {},
                t[r.season].new = 0 == a ? r.playerBase : r.playerBase - e[a - 1].playerBase,
                t[r.season].old = r.playerCount - t[r.season].new,
                t[r.season].global = r.playerCount
        }
        StatsUtil.filterStats(t, e => {
            e.global = null,
                e.new = null,
                e.old = null
        }
        ),
            TableUtil.updateColRowTable(document.getElementById("player-count-global-table"), t, (e, t) => EnumUtil.enumOfName(e, AGE_DISTRIBUTION).order - EnumUtil.enumOfName(t, AGE_DISTRIBUTION).order, null, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("player-count-day-table"), Util.forObjectValues(StatsUtil.calculateDailyStats(t), e => Math.round(e)), (e, t) => EnumUtil.enumOfName(e, AGE_DISTRIBUTION).order - EnumUtil.enumOfName(t, AGE_DISTRIBUTION).order, null, SeasonUtil.seasonIdTranslator)
    }
    static updateQueueStatsActivity(e) {
        const t = {};
        for (let a = 0; a < e.length; a++) {
            const r = e[a];
            t[r.season] = {},
                t[r.season].low = r.lowActivityPlayerCount,
                t[r.season].medium = r.mediumActivityPlayerCount,
                t[r.season].high = r.highActivityPlayerCount
        }
        StatsUtil.filterStats(t, e => {
            e.low = null,
                e.medium = null,
                e.high = null
        }
        ),
            TableUtil.updateColRowTable(document.getElementById("player-count-daily-activity-tier-table"), t, (e, t) => EnumUtil.enumOfName(e, INTENSITY).order - EnumUtil.enumOfName(t, INTENSITY).order, null, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("player-count-daily-activity-tier-day-table"), Util.forObjectValues(StatsUtil.calculateDailyStats(t), e => Math.round(e)), (e, t) => EnumUtil.enumOfName(e, INTENSITY).order - EnumUtil.enumOfName(t, INTENSITY).order, null, SeasonUtil.seasonIdTranslator)
    }
    static updateQueueStats(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            StatsUtil.updateQueueStatsModel(e).then(e => {
                StatsUtil.updateQueueStatsView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateGlobalStatsView() {
        StatsUtil.updateLadderStatsView(),
            StatsUtil.updateQueueStatsView()
    }
    static enhanceGlobalStatsCtl() {
        const e = document.querySelector("#stats-global-mode");
        e && e.addEventListener("change", e => window.setTimeout(e => StatsUtil.updateGlobalStatsMode(), 0)),
            document.querySelectorAll(".stats-global-reload").forEach(e => e.addEventListener("change", e => window.setTimeout(e => StatsUtil.updateGlobalStatsView(), 0)))
    }
    static updateGlobalStatsMode(e) {
        null == e && (e = EnumUtil.enumOfStoredFullName("stats-global-mode", LADDER_STATS_GLOBAL_VIEW_MODE, LADDER_STATS_GLOBAL_VIEW_MODE.MIXED)),
            document.querySelectorAll("#stats-global .stats-section").forEach(t => {
                e.sectionIds.has(t.id) ? t.classList.remove("d-none") : t.classList.add("d-none")
            }
            )
    }
    static updateLadderStatsModel(e) {
        const t = new URLSearchParams("?" + e);
        return StatsUtil.resetMapStatsFilm(),
            Model.DATA.get(VIEW.GLOBAL).set(VIEW_DATA.LADDER_STATS, {
                urlParams: t
            }),
            Promise.all([StatsUtil.updateLadderStatsGlobalModel(e), StatsUtil.updateLadderStatsSeasonModel(t)]).then(e => Model.DATA.get(VIEW.GLOBAL).set(VIEW_DATA.LADDER_STATS, {
                all: e[0],
                current: e[1],
                urlParams: t
            }))
    }
    static updateLadderStatsGlobalModel(e) {
        const t = ROOT_CONTEXT_PATH + "api/stats/activity?" + e;
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse).then(e => e)
    }
    static updateLadderStatsSeasonModel(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/ladder/stats/league/").concat(e.get("season"), "/").concat(e.get("queue"), "/").concat(e.get("teamType"), "/").concat(e.getAll("region").join(","), "/").concat(e.getAll("league").join(","));
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse).then(e => e)
    }
    static updateLadderStatsView() {
        StatsUtil.updateLadderStatsCurrentView();
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).all
            , t = {
                gamesPlayed: {},
                teamCount: {}
            }
            , a = {};
        for (const [r, n] of Object.entries(e)) {
            t.gamesPlayed[r] = {
                global: Object.values(n.regionGamesPlayed).reduce((e, t) => e + t, 0)
            },
                t.teamCount[r] = {
                    global: Object.values(n.regionTeamCount).reduce((e, t) => e + t, 0)
                };
            for (const [e, t] of Object.entries(n)) {
                null == a[e] && (a[e] = {}),
                    a[e][r] = {};
                const n = Object.values(t).reduce((e, t) => e + t, 0);
                for (const [o, l] of Object.entries(t))
                    a[e][r][o] = Util.calculatePercentage(l, n)
            }
        }
        StatsUtil.filterStats(t.teamCount, e => e.global = null),
            StatsUtil.filterStats(t.gamesPlayed, e => e.global = null),
            StatsUtil.applyUserSettings(t),
            TableUtil.updateColRowTable(document.getElementById("games-played-global-table"), t.gamesPlayed, null, null, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("team-count-global-table"), t.teamCount, null, null, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("games-played-day-table"), Util.forObjectValues(StatsUtil.calculateDailyStats(t.gamesPlayed), e => Math.round(e)), null, null, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("team-count-day-table"), Util.forObjectValues(StatsUtil.calculateDailyStats(t.teamCount), e => Math.round(e)), null, null, SeasonUtil.seasonIdTranslator);
        const r = StatsUtil.getRaceStatsType();
        StatsUtil.setRaceStatsStatus(r, document.querySelectorAll("#games-played-race")) && (TableUtil.updateColRowTable(document.getElementById("games-played-race-table"), a["race" + r.parameterSuffix], (e, t) => EnumUtil.enumOfName(e, RACE).order - EnumUtil.enumOfName(t, RACE).order, e => EnumUtil.enumOfName(e, RACE).name, SeasonUtil.seasonIdTranslator),
            document.querySelectorAll("#games-played-race .header .main").forEach(e => e.textContent = r.description)),
            TableUtil.updateColRowTable(document.getElementById("games-played-region-table"), a.regionGamesPlayed, (e, t) => EnumUtil.enumOfName(e, REGION).order - EnumUtil.enumOfName(t, REGION).order, e => EnumUtil.enumOfName(e, REGION).name, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("games-played-league-table"), a.leagueGamesPlayed, (e, t) => EnumUtil.enumOfId(e, LEAGUE).order - EnumUtil.enumOfId(t, LEAGUE).order, e => EnumUtil.enumOfId(e, LEAGUE).name, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("team-count-region-table"), a.regionTeamCount, (e, t) => EnumUtil.enumOfName(e, REGION).order - EnumUtil.enumOfName(t, REGION).order, e => EnumUtil.enumOfName(e, REGION).name, SeasonUtil.seasonIdTranslator),
            TableUtil.updateColRowTable(document.getElementById("team-count-league-table"), a.leagueTeamCount, (e, t) => EnumUtil.enumOfId(e, LEAGUE).order - EnumUtil.enumOfId(t, LEAGUE).order, e => EnumUtil.enumOfId(e, LEAGUE).name, SeasonUtil.seasonIdTranslator)
    }
    static getRaceStatsType() {
        return EnumUtil.enumOfName(localStorage.getItem("stats-race-type") || "team-count", LADDER_RACE_STATS_TYPE)
    }
    static setRaceStatsStatus(e, t) {
        const a = document.querySelector("#stats-race .msg-info");
        return e == LADDER_RACE_STATS_TYPE.TEAM_COUNT && EnumUtil.enumOfFullName(Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).urlParams.get("queue"), TEAM_FORMAT) != TEAM_FORMAT._1V1 ? (t.forEach(e => e.classList.add("d-none")),
            a.textContent = "Only in 1v1 mode each race has a separate team. Team can have multiple races in other modes(2v2, 3v3, 4v4, Archon).",
            a.classList.remove("d-none"),
            !1) : (t.forEach(e => e.classList.remove("d-none")),
                a.classList.add("d-none"),
                !0)
    }
    static enhanceRaceControls() {
        document.querySelectorAll(".stats-race-ctl").forEach(e => e.addEventListener("change", e => window.setTimeout(StatsUtil.updateLadderStatsView, 1)))
    }
    static applyUserSettings(e) {
        const t = localStorage.getItem("settings-games-played-number");
        if (!t || "match" == t) {
            const t = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS)
                , a = 2 * EnumUtil.enumOfFullName(t.urlParams.get("queue"), TEAM_FORMAT).memberCount;
            Object.values(e.gamesPlayed).filter(e => null != e.global).forEach(e => e.global = Math.round(e.global / a))
        }
    }
    static updateLadderStatsCurrentView() {
        const e = Util.groupBy(Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).current, e => e.season.region);
        StatsUtil.updateLadderStatsCurrentRaceView(e),
            StatsUtil.updateLadderStatsCurrentLeagueView(e)
    }
    static calculateLadderStatsCurrentRaceRegionValues(e, t) {
        const a = new Map;
        return Object.values(RACE).forEach(r => {
            const n = new Map;
            a.set(r.name, n);
            for (const [a, o] of e) {
                let e = 0;
                for (const a of o)
                    e += a.leagueStats[r.name + t.parameterSuffix];
                n.set(a, e)
            }
        }
        ),
            a
    }
    static updateLadderStatsCurrentRaceView(e) {
        document.querySelectorAll("#stats-race .table-race-league-region").forEach(e => e.closest("section").classList.add("d-none"));
        const t = "true" == localStorage.getItem("stats-race-normalize")
            , a = "true" == localStorage.getItem("stats-race-deviation")
            , r = {}
            , n = {}
            , o = StatsUtil.getRaceStatsType()
            , l = StatsUtil.calculateLadderStatsCurrentRaceRegionValues(e, o)
            , s = new Map(Array.from(l.entries()).map(e => [e[0], Array.from(e[1].values()).reduce((e, t) => e + t, 0)]))
            , i = t && a ? 100 / Object.values(RACE).length : 0;
        for (const [a, s] of e) {
            const e = {};
            n[a] = e;
            for (const n of s) {
                let s = 0;
                Object.values(RACE).forEach(e => s += n.leagueStats[e.name + o.parameterSuffix]);
                const c = EnumUtil.enumOfId(n.league.type, LEAGUE).name;
                r[c] || (r[c] = {}),
                    e[c] = {};
                for (const i of Object.values(RACE)) {
                    const d = i.name + o.parameterSuffix;
                    n.leagueStats[d] && (r[c][i.name] = null == r[c][i.name] ? n.leagueStats[d] : r[c][i.name] + n.leagueStats[d],
                        e[c][i.name] = t ? n.leagueStats[d] / l.get(i.name).get(a) : n.leagueStats[d] / s * 100)
                }
                if (t) {
                    const t = Object.values(e[c]).reduce((e, t) => e + t, 0);
                    for (const a of Object.values(RACE))
                        e[c][a.name] = e[c][a.name] / t * 100 - i
                }
            }
        }
        if (t)
            for (const [e, t] of Object.entries(r))
                for (const [e, a] of Object.entries(t))
                    t[e] = t[e] / s.get(e);
        for (const [e, t] of Object.entries(r)) {
            const e = Object.values(t).reduce((e, t) => e + t, 0);
            for (const [a, r] of Object.entries(t))
                t[a] = r / e * 100 - i
        }
        if (StatsUtil.setRaceStatsStatus(o, document.querySelectorAll('[id^="games-played-race-league"]'))) {
            TableUtil.updateColRowTable(document.getElementById("games-played-race-league-global-table"), r, (e, t) => EnumUtil.enumOfName(e, RACE).order - EnumUtil.enumOfName(t, RACE).order, e => EnumUtil.enumOfName(e, RACE).name, e => EnumUtil.enumOfName(e, LEAGUE).name);
            for (const [e, t] of Object.entries(n)) {
                const a = document.getElementById("games-played-race-league-" + e.toLowerCase() + "-table");
                a.closest("section").classList.remove("d-none"),
                    TableUtil.updateColRowTable(a, t, (e, t) => EnumUtil.enumOfName(e, RACE).order - EnumUtil.enumOfName(t, RACE).order, e => EnumUtil.enumOfName(e, RACE).name, e => EnumUtil.enumOfName(e, LEAGUE).name)
            }
            if (Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).current.length > 0) {
                const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).current[0].season.battlenetId;
                document.querySelectorAll("#stats-race .season-current").forEach(t => t.textContent = "s" + e)
            }
            document.querySelectorAll('[id^="games-played-race-league"] .header .main').forEach(e => e.textContent = o.description)
        }
    }
    static updateLadderStatsCurrentLeagueView(e) {
        const t = {}
            , a = {};
        for (const [a, r] of e) {
            t[a] = {};
            for (const e of r) {
                const r = EnumUtil.enumOfId(e.league.type, LEAGUE).name;
                t[a][r] = e.leagueStats.teamCount
            }
        }
        for (const [e, r] of Object.entries(t)) {
            const n = Object.values(r).reduce((e, t) => e + t, 0);
            a[e] = {};
            for (const [o, l] of Object.entries(r))
                a[e][o] = t[e][o] / n * 100
        }
        if (TableUtil.updateColRowTable(document.getElementById("team-count-region-league-table"), a, (e, t) => EnumUtil.enumOfName(e, LEAGUE).order - EnumUtil.enumOfName(t, LEAGUE).order, e => EnumUtil.enumOfName(e, LEAGUE).name, e => EnumUtil.enumOfName(e, REGION).name),
            Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).current.length > 0) {
            const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).current[0].season.battlenetId;
            document.querySelectorAll("#stats-league .season-current").forEach(t => t.textContent = "s" + e)
        }
    }
    static updateLadderStats(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            StatsUtil.init(),
            StatsUtil.updateLadderStatsModel(e).then(e => {
                StatsUtil.updateLadderStatsView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateLeagueBoundsModel(e) {
        const t = ROOT_CONTEXT_PATH + "api/tier-thresholds?" + e;
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse).then(e => (Model.DATA.get(VIEW.GLOBAL).set(VIEW_DATA.LEAGUE_BOUNDS, e),
            e))
    }
    static updateLeagueBoundsView() {
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LEAGUE_BOUNDS)
            , t = document.getElementById("league-bounds-table")
            , a = t.getElementsByTagName("thead")[0].getElementsByTagName("tr")[0]
            , r = t.getElementsByTagName("tbody")[0];
        if (ElementUtil.removeChildren(a),
            ElementUtil.removeChildren(r),
            0 === Object.keys(e).length)
            return;
        const n = document.createElement("th");
        n.setAttribute("scope", "col"),
            n.textContent = "Tier",
            a.appendChild(n);
        for (const t of Object.keys(e)) {
            const e = document.createElement("th");
            e.setAttribute("scope", "col"),
                e.appendChild(ElementUtil.createImage("flag/", t.toLowerCase(), "table-image table-image-long")),
                a.appendChild(e)
        }
        const o = new Set(Object.values(e).flatMap(e => Object.keys(e)).sort((e, t) => t - e));
        for (const t of o) {
            const a = EnumUtil.enumOfId(t, LEAGUE);
            for (const n of a == LEAGUE.GRANDMASTER ? [0] : [0, 1, 2]) {
                const o = document.createElement("tr")
                    , l = document.createElement("th");
                l.setAttribute("scope", "row");
                const s = document.createElement("div");
                s.classList.add("text-nowrap"),
                    s.appendChild(ElementUtil.createImage("league/", a.name, "table-image table-image-square mr-1")),
                    s.appendChild(ElementUtil.createImage("league/", "tier-" + (+n + 1), "table-image-additional")),
                    l.appendChild(s),
                    o.appendChild(l);
                for (const r of Object.keys(e)) {
                    const l = document.createElement("td");
                    if (a === LEAGUE.GRANDMASTER)
                        l.textContent = "Top " + SC2Restful.GM_COUNT;
                    else if (null == e[r] || null == e[r][t] || null == e[r][t][n] || 0 == e[r][t][n][0] && 0 == e[r][t][n][1])
                        l.textContent = "";
                    else {
                        const a = e[r][t][n];
                        l.textContent = a[0] + "-" + a[1]
                    }
                    o.appendChild(l)
                }
                r.appendChild(o)
            }
        }
    }
    static updateLeagueBounds(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            StatsUtil.updateLeagueBoundsModel(e).then(e => {
                StatsUtil.updateLeagueBoundsView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static calculateDailyStats(e) {
        SeasonUtil.updateSeasonDuration(Session.currentSeasons[0]);
        const t = {};
        for (const [a, r] of Object.entries(e)) {
            t[a] = {};
            const e = Session.currentSeasons.filter(e => e.battlenetId == a)[0];
            for (const [n, o] of Object.entries(r))
                t[a][n] = null == o ? null : o / e.daysProgress
        }
        return t
    }
    static getMapStatsFilm(e, t, a, r, n, o, l, s) {
        const i = new URLSearchParams;
        i.set("season", e),
            t.forEach(e => i.append("region", e.fullName)),
            i.set("queue", a.fullName),
            i.set("teamType", r.fullName),
            i.set("league", n.fullName),
            i.set("tier", o.fullName),
            l.forEach(e => i.append("crossTier", e)),
            s.forEach(e => i.append("race", e.fullName));
        const c = "".concat(ROOT_CONTEXT_PATH, "api/stats/balance-reports?").concat(i.toString());
        return Session.beforeRequest().then(e => fetch(c)).then(Session.verifyJsonResponse)
    }
    static concatMapStatsResolvedFilm(e, t) {
        const a = {};
        for (const r of Object.keys(e)) {
            a[r] = {};
            for (const n of Object.keys(e[r]))
                a[r][n] = e[r][n].concat(t[r][n])
        }
        return a
    }
    static deriveMapFilmSummary(e, t, a) {
        const r = StatsUtil.concatMapStatsResolvedFilm(e, t)
            , n = Array.from(Object.entries(r))
            , o = new Array(n.length);
        for (let e = 0; e < o.length; e++) {
            const [t, r] = n[e]
                , l = Util.parseMatchUp(t);
            o[e] = {
                race: l[0],
                versusRace: l[1],
                name: t,
                values: Array.from(Object.entries(r)).map(e => {
                    let [t, r] = e;
                    return {
                        category: t,
                        value: StatsUtil.calculateMapFrame(Util.addObjects(r, a))
                    }
                }
                )
            }
        }
        return o.sort((e, t) => e.race.order - t.race.order || e.versusRace.order - t.versusRace.order),
            o
    }
    static copyFrameSeries(e, t) {
        return {
            race: e.race,
            versusRace: e.versusRace,
            label: e.label,
            data: e.data.map(e => e[t])
        }
    }
    static deriveMapFilmDuration(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 2;
        const r = Object.entries(e).map(e => {
            const r = e[0]
                , n = Util.parseMatchUp(r)
                , o = Util.mergeObjects(Util.addObjectColumns(Object.values(e[1]), t), t, a).map(StatsUtil.calculateMapFrame);
            return {
                race: n[0],
                versusRace: n[1],
                label: r,
                data: o
            }
        }
        );
        r.sort((e, t) => e.race.order - t.race.order || e.versusRace.order - t.versusRace.order);
        const n = new Array(r.length)
            , o = new Array(r.length);
        for (let e = 0; e < r.length; e++)
            n[e] = StatsUtil.copyFrameSeries(r[e], "winRate"),
                o[e] = StatsUtil.copyFrameSeries(r[e], "games");
        return {
            winRate: n,
            games: o,
            mergeFactor: a
        }
    }
    static transformMapStatsFilm(e) {
        Object.values(e.films).forEach(e => {
            e.frames = new Array(StatsUtil.MAP_STATS_FILM_MAX_FRAME + 1),
                e.filteredFrames = []
        }
        ),
            e.frames.forEach(t => {
                const a = e.films[t.mapStatsFilmId];
                null != t.number && t.number < a.frames.length ? a.frames[t.number] = t : a.filteredFrames.push(t)
            }
            );
        const t = Util.groupByObject(Object.values(e.films), e => [e.mapStatsFilmSpecId, e.mapId])
            , a = {}
            , r = {}
            , n = ["wins", "games"];
        for (const [o, l] of Object.entries(t)) {
            const t = e.specs[o]
                , s = t.race.charAt(0) + "v" + t.versusRace.charAt(0);
            a[s] = {},
                r[s] = {};
            for (const [t, o] of Object.entries(l))
                a[s][e.maps[t].name] = Util.addObjectColumns(o.values.map(e => e.frames), n),
                    r[s][e.maps[t].name] = Util.addObjects(o.values.flatMap(e => e.filteredFrames), n)
        }
        return {
            summary: StatsUtil.deriveMapFilmSummary(a, r, n),
            duration: StatsUtil.deriveMapFilmDuration(a, n, parseInt(localStorage.getItem("stats-match-up-group-duration")) || StatsUtil.MAP_STATS_FILM_DEFAULT_GROUP_DURATION)
        }
    }
    static calculateMapFrame(e) {
        return 0 == e.games || null == e.games ? (e.games = null,
            e.wins = null,
            e.winRate = null) : e.winRate = e.wins / e.games * 100,
            e
    }
    static mapFrameStringConverter(e, t) {
        return null == t ? null : "winRate" == e ? Util.DECIMAL_FORMAT.format(t) + "%" : t
    }
    static loadMapStatsFilmModel(e, t, a, r, n, o, l) {
        return a != TEAM_FORMAT._1V1 ? Promise.resolve() : Promise.all(n.map(n => StatsUtil.getMapStatsFilm(e, t, a, r, n[0], n[1], o, l))).then(e => {
            let t = {};
            return e.filter(e => e.frames.length > 0).forEach(e => Util.concatObject(e, t)),
                t.frames || (t = null),
                Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).mapFilm = t,
                t
        }
        )
    }
    static updateMapStatsFilmModel(e) {
        const t = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS);
        return e || (e = t.mapFilm),
            e ? (t.mapFilmModel = StatsUtil.transformMapStatsFilm(e),
                t.mapFilmModel) : null
    }
    static addMapFilmSummaryRaceColors(e) {
        for (const t of e)
            t.backgroundColors = {
                light: {
                    negative: StatsUtil.MATCH_UP_MATRIX_LIGHT_BACKGROUND_COLORS.get(t.versusRace),
                    positive: StatsUtil.MATCH_UP_MATRIX_LIGHT_BACKGROUND_COLORS.get(t.race)
                },
                dark: {
                    negative: StatsUtil.MATCH_UP_MATRIX_DARK_BACKGROUND_COLORS.get(t.versusRace),
                    positive: StatsUtil.MATCH_UP_MATRIX_DARK_BACKGROUND_COLORS.get(t.race)
                }
            },
                t.colors = {
                    negative: StatsUtil.MATCH_UP_MATRIX_COLORS.get(t.versusRace),
                    neutral: MatrixUI.HIGHLIGHT_NEUTRAL_COLOR,
                    positive: StatsUtil.MATCH_UP_MATRIX_COLORS.get(t.race)
                }
    }
    static setMapFilmWinRateThreshold(e) {
        const t = parseFloat(localStorage.getItem("stats-match-up-win-rate-highlight-threshold")) || StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_HIGHLIGHT_THRESHOLD;
        e.setHighlightRange(50 - t, 50, 50 + t)
    }
    static setMapSummaryWinRate(e, t) {
        e.getSummaryRow().forEach(e => e.winRate = t),
            e.getSummaryCell()[0].winRate = t
    }
    static getWinRateDataFoV() {
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).mapFilmModel.duration;
        if (null != e.winRateDataFoV)
            return e.winRateDataFoV;
        const t = Math.ceil(Math.max(...e.winRate.flatMap(e => e.data).map(e => Math.abs(e - 50)))) + StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV_OFFSET;
        return e.winRateDataFoV = t,
            t
    }
    static getWinRateFoV() {
        const e = parseInt(localStorage.getItem("stats-match-up-win-rate-fov") || StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV);
        return e > 0 ? e : StatsUtil.getWinRateDataFoV()
    }
    static updateWinRateFoV(e) {
        if (e || (e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).charts[0]),
            !e)
            return;
        const t = StatsUtil.getWinRateFoV();
        e.config.options.scales.y.min = 50 - t,
            e.config.options.scales.y.max = 50 + t,
            e.update()
    }
    static updateMapStatsFilmView() {
        const e = document.querySelector("#stats-match-up-container")
            , t = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS);
        if (!t.mapFilmModel)
            return void e.appendChild(ElementUtil.createElement("p", null, "text-danger", "Stats not found"));
        StatsUtil.addMapFilmSummaryRaceColors(t.mapFilmModel.summary);
        const a = new MatrixUI("stats-map-film-summary-table", t.mapFilmModel.summary, "winRate", ["winRate", "games"], Session.theme, StatsUtil.calculateMapFrame, StatsUtil.mapFrameStringConverter);
        a.setAfterDataProcessing(() => StatsUtil.setMapSummaryWinRate(a, 50)),
            StatsUtil.setMapFilmHighlight(a);
        const r = a.render();
        r.classList.add("mx-auto", "mb-3"),
            e.appendChild(r),
            t.mapFilmSummaryMatrix = a;
        const n = t.mapFilmModel.duration.winRate.map(e => e.race == RACE.RANDOM ? StatsUtil.MATCH_UP_RANDOM_COLORS.get(e.versusRace) : e.race.name)
            , o = ElementUtil.createElement("div", null, "row no-gutters")
            , l = ElementUtil.createElement("section", null, "col-lg-6 mb-3");
        l.appendChild(ElementUtil.createElement("h4", null, null, "Win rate, distribution by game duration"));
        const s = ElementUtil.createElement("section", null, "col-lg-6 mb-3");
        s.appendChild(ElementUtil.createElement("h4", null, null, "Game count, distribution by game duration")),
            o.appendChild(l),
            o.appendChild(s),
            t.charts = new Array(2),
            l.appendChild(ChartUtil.createChartContainer("stats-map-film-duration-win-rate"));
        const i = {
            type: "line",
            chartable: "stats-map-film-duration-win-rate",
            ctx: l.querySelector(":scope #stats-map-film-duration-win-rate").getContext("2d"),
            xTitle: "Match duration, minutes",
            yTitle: "Win rate",
            customAnnotations: "50",
            data: {
                labels: [...Array(t.mapFilmModel.duration.winRate[0].data.length).keys()].map(e => e * t.mapFilmModel.duration.mergeFactor + ""),
                datasets: t.mapFilmModel.duration.winRate,
                customColors: n,
                customMeta: {
                    type: "line"
                }
            }
        };
        t.charts[0] = ChartUtil.createGenericChart(i),
            StatsUtil.updateWinRateFoV(t.charts[0]),
            s.appendChild(ChartUtil.createChartContainer("stats-map-film-duration-games"));
        const c = {
            type: "line",
            chartable: "stats-map-film-duration-games",
            ctx: s.querySelector(":scope #stats-map-film-duration-games").getContext("2d"),
            xTitle: "Match duration, minutes",
            yTitle: "Games",
            data: {
                labels: [...Array(t.mapFilmModel.duration.games[0].data.length).keys()].map(e => e * t.mapFilmModel.duration.mergeFactor + ""),
                datasets: t.mapFilmModel.duration.games,
                customColors: n,
                customMeta: {
                    type: "line"
                }
            }
        };
        return t.charts[1] = ChartUtil.createGenericChart(c),
            e.appendChild(o),
            t
    }
    static initMapStatsFilm() {
        StatsUtil.mapStatsFilmInitialized || (BootstrapUtil.appendDefaultInputValueTooltip("stats-match-up-group-duration", StatsUtil.MAP_STATS_FILM_DEFAULT_GROUP_DURATION),
            BootstrapUtil.appendDefaultInputValueTooltip("stats-match-up-win-rate-highlight-threshold", StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_HIGHLIGHT_THRESHOLD),
            BootstrapUtil.appendDefaultInputValueTooltip("stats-match-up-win-rate-fov", StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV),
            localStorage.getItem("stats-match-up-group-duration") || (document.querySelector("#stats-match-up-group-duration").value = StatsUtil.MAP_STATS_FILM_DEFAULT_GROUP_DURATION),
            localStorage.getItem("stats-match-up-win-rate-highlight-threshold") || (document.querySelector("#stats-match-up-win-rate-highlight-threshold").value = StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_HIGHLIGHT_THRESHOLD),
            localStorage.getItem("stats-match-up-win-rate-fov") || (document.querySelector("#stats-match-up-win-rate-fov").value = StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV),
            StatsUtil.mapStatsFilmInitialized = !0)
    }
    static updateMapStatsFilm() {
        if (StatsUtil.initMapStatsFilm(),
            !document.querySelector("#stats-match-up-form").reportValidity())
            return Promise.resolve({
                data: null,
                status: LOADING_STATUS.ERROR
            });
        const e = (localStorage.getItem("stats-match-up-league") || "5,0" + Session.multiValueInputSeparator + "6,0").split(Session.multiValueInputSeparator).map(e => e.split(",")).map(e => [EnumUtil.enumOfId(e[0], LEAGUE), EnumUtil.enumOfId(e[1], LEAGUE_TIER)])
            , t = e.length > 1 || "false" === (localStorage.getItem("stats-match-up-cross-tier") || "false") ? [!1] : [!1, !0]
            , a = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).urlParams
            , r = Array.from(Object.values(REGION)).map(e => "true" == a.get(e.name) ? e : null).filter(e => null != e)
            , n = Array.from(Object.values(RACE)).filter(e => "true" == (localStorage.getItem("stats-match-up-race-" + e.fullName) || (e == RACE.RANDOM ? "false" : "true")));
        return StatsUtil.loadMapStatsFilmModel(a.get("season"), r, EnumUtil.enumOfFullName(a.get("queue"), TEAM_FORMAT), EnumUtil.enumOfFullName(a.get("teamType"), TEAM_TYPE), e, t, n).then(StatsUtil.updateMapStatsFilmModel).then(StatsUtil.updateMapStatsFilmView).then(e => ({
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static updateMapStatsFilmAsync() {
        return Util.load(document.querySelector("#stats-match-up-container"), StatsUtil.updateMapStatsFilm)
    }
    static resetAndUpdateMapStatsFilmAsync() {
        return ElementUtil.executeTask("stats-match-up-container", () => StatsUtil.resetMapStatsFilm()).then(StatsUtil.updateMapStatsFilmAsync)
    }
    static resetMapStatsFilm() {
        let e = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        const t = document.querySelector("#stats-match-up-container");
        e && ElementUtil.setLoadingIndicator(t, LOADING_STATUS.NONE),
            ElementUtil.removeChildren(t);
        const a = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS);
        if (a && (a.mapFilmSummaryMatrix && a.mapFilmSummaryMatrix.remove(),
            a.mapFilmSummaryMatrix = null,
            e && (a.mapFilmModel = null),
            a.charts)) {
            for (const e of a.charts)
                ChartUtil.CHARTS.delete(e.config._config.customConfig.chartable);
            a.charts = null
        }
    }
    static onMapFilmSummaryHighlightChange() {
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS);
        e.mapFilmSummaryMatrix && e.mapFilmSummaryMatrix.getNode() && (e.mapFilmSummaryMatrix.setUseDataColors("race" == (localStorage.getItem("stats-match-up-color") || "race")),
            e.mapFilmSummaryMatrix.highlight())
    }
    static onMapFilmGroupDurationChange() {
        if (document.querySelector("#stats-match-up-form").reportValidity())
            return Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).mapFilmModel ? (StatsUtil.resetMapStatsFilm(!1),
                StatsUtil.updateMapStatsFilmModel(),
                StatsUtil.updateMapStatsFilmView()) : StatsUtil.resetAndUpdateMapStatsFilmAsync()
    }
    static onMapFilmGroupWinRateHighlightThresholdChange() {
        const e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).mapFilmSummaryMatrix;
        e && (StatsUtil.setMapFilmWinRateThreshold(e),
            e.getNode() && e.highlight())
    }
    static setMapFilmHighlight(e) {
        if (e || (e = Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS).mapFilmSummaryMatrix),
            !e)
            return;
        "win-rate" == (localStorage.getItem("stats-match-up-highlight") || "win-rate") ? (e.setMainParameter("winRate"),
            StatsUtil.setMapFilmWinRateThreshold(e),
            e.setUseDataColors("race" == (localStorage.getItem("stats-match-up-color") || "race"))) : (e.setMainParameter("games"),
                e.setHighlightRange(0, 0, null),
                e.setUseDataColors(!1)),
            e.getNode() && (e.applyMainParameter(),
                e.highlight())
    }
    static onUpdateWinRateFoV() {
        document.querySelector("#stats-match-up-form").reportValidity() && StatsUtil.updateWinRateFoV()
    }
    static enhanceMapStatsFilm() {
        ElementUtil.ELEMENT_TASKS.set("stats-match-up-tab", StatsUtil.updateMapStatsFilmAsync),
            document.querySelectorAll(".stats-match-up-reload").forEach(e => e.addEventListener("change", e => window.setTimeout(StatsUtil.resetAndUpdateMapStatsFilmAsync, 1)));
        const e = document.querySelector("#stats-match-up-color");
        e && e.addEventListener("change", e => window.setTimeout(StatsUtil.onMapFilmSummaryHighlightChange, 1));
        const t = document.querySelector("#stats-match-up-form");
        t && t.addEventListener("submit", e => e.preventDefault());
        const a = document.querySelector("#stats-match-up-group-duration");
        a && a.addEventListener("input", e => window.setTimeout(StatsUtil.onMapFilmGroupDurationChange, 1));
        const r = document.querySelector("#stats-match-up-win-rate-highlight-threshold");
        r && r.addEventListener("input", e => window.setTimeout(StatsUtil.onMapFilmGroupWinRateHighlightThresholdChange, 1));
        const n = document.querySelector("#stats-match-up-highlight");
        n && n.addEventListener("change", e => window.setTimeout(StatsUtil.setMapFilmHighlight, 1));
        const o = document.querySelector("#stats-match-up-win-rate-fov");
        o && o.addEventListener("input", e => window.setTimeout(StatsUtil.onUpdateWinRateFoV, 1))
    }
    static enhanceSettings() {
        document.querySelector("#settings-games-played-number").addEventListener("change", e => window.setTimeout(e => {
            Model.DATA.get(VIEW.GLOBAL).get(VIEW_DATA.LADDER_STATS) && StatsUtil.updateLadderStatsView(),
                StatsUtil.updateGamesStatsVisibility()
        }
            , 1))
    }
    static updateGamesStatsVisibility() {
        const e = localStorage.getItem("settings-games-played-number");
        e && "match" != e ? document.querySelectorAll(".games-participant").forEach(e => e.classList.remove("d-none")) : document.querySelectorAll(".games-participant").forEach(e => e.classList.add("d-none"))
    }
}
StatsUtil.MAP_STATS_FILM_MAX_FRAME = 29,
    StatsUtil.MAP_STATS_FILM_MAIN_FRAME = 8,
    StatsUtil.MAP_STATS_FILM_DEFAULT_GROUP_DURATION = 3,
    StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_HIGHLIGHT_THRESHOLD = 5,
    StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV = 15,
    StatsUtil.MAP_STATS_FILM_DEFAULT_WIN_RATE_DURATION_FOV_OFFSET = 2,
    StatsUtil.MATCH_UP_RANDOM_COLORS = new Map([[RACE.TERRAN, "neutral"], [RACE.PROTOSS, "new"], [RACE.ZERG, "old"]]),
    StatsUtil.MATCH_UP_MATRIX_COLORS = new Map([[RACE.TERRAN, "rgba(53, 123, 167, 1)"], [RACE.PROTOSS, "rgba(167, 150, 2, 1)"], [RACE.ZERG, "rgba(167, 40, 167, 1)"], [RACE.RANDOM, "rgba(128, 128, 128, 1)"]]),
    StatsUtil.MATCH_UP_MATRIX_LIGHT_BACKGROUND_COLORS = new Map([[RACE.TERRAN, "rgba(53, 123, 255, 1)"], [RACE.PROTOSS, "rgba(255, 192, 0, 1)"], [RACE.ZERG, "rgba(255, 40, 255, 1)"], [RACE.RANDOM, "rgba(128, 128, 128, 1)"]]),
    StatsUtil.MATCH_UP_MATRIX_DARK_BACKGROUND_COLORS = new Map(Array.from(StatsUtil.MATCH_UP_MATRIX_LIGHT_BACKGROUND_COLORS.entries()).map(e => {
        let [t, a] = e;
        return [t, Util.divideColor(a, t == RACE.RANDOM ? 1.1 : 2)]
    }
    ));
class TableUtil {
    static createTable(e) {
        let t = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        const a = document.createElement("table")
            , r = document.createElement("thead")
            , n = document.createElement("tr");
        for (const t of e) {
            const e = document.createElement("th");
            e.setAttribute("scope", "col"),
                e.textContent = t,
                n.appendChild(e)
        }
        r.appendChild(n);
        const o = document.createElement("tbody");
        if (a.appendChild(r),
            a.appendChild(o),
            a.classList.add("table", "table-sm", "table-hover"),
            t) {
            const e = document.createElement("div");
            return e.classList.add("table-responsive"),
                e.appendChild(a),
                e
        }
        return a
    }
    static createRowTh() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        return TableUtil.createTh(e, "row")
    }
    static createTh() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null
            , t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "column";
        const a = document.createElement("th");
        return a.setAttribute("scope", t),
            null != e && e.appendChild(a),
            a
    }
    static insertCell(e, t) {
        const a = e.insertCell();
        return a.setAttribute("class", t),
            a
    }
    static updateColRowTable(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : null
            , n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : null
            , o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : null;
        const l = e.querySelector(":scope thead tr");
        ElementUtil.removeChildren(l),
            l.appendChild(document.createElement("th"));
        const s = e.getElementsByTagName("tbody")[0];
        if (ElementUtil.removeChildren(s),
            !t)
            return void e.setAttribute("data-last-updated", Date.now());
        const i = TableUtil.collectHeaders(t).sort(null == a ? (e, t) => t[0].localeCompare(e[0]) : a);
        for (const e of i) {
            const t = document.createElement("th");
            t.setAttribute("scope", "col");
            const a = null == r ? e : r(e);
            t.setAttribute("data-chart-color", a.toLowerCase()),
                t.textContent = a,
                l.appendChild(t)
        }
        const c = Object.entries(t);
        o && c.sort((e, t) => o(e[0], t[0]));
        for (const [e, t] of c) {
            const a = document.createElement("tr")
                , r = document.createElement("th")
                , o = null == n ? e : n(e);
            r.setAttribute("scope", "row"),
                r.textContent = o,
                a.appendChild(r);
            for (const e of i)
                a.insertCell().textContent = null != t[e] ? t[e] : "";
            s.appendChild(a)
        }
        e.setAttribute("data-last-updated", Date.now())
    }
    static collectHeaders(e) {
        const t = [];
        if (!e)
            return t;
        for (const [a, r] of Object.entries(e))
            for (const [e, a] of Object.entries(r))
                t.includes(e) || t.push(e);
        return t
    }
    static updateGenericTable(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : null;
        const n = e.querySelector(":scope thead tr")
            , o = e.querySelector(":scope tbody tr");
        if (ElementUtil.removeChildren(n),
            ElementUtil.removeChildren(o),
            t) {
            for (const [e, l] of Object.entries(t).sort(null == a ? (e, t) => t[0].localeCompare(e[0]) : a)) {
                const t = document.createElement("th")
                    , a = null == r ? e : r(e);
                t.setAttribute("data-chart-color", a.toLowerCase()),
                    t.textContent = a,
                    n.appendChild(t),
                    o.insertCell().textContent = l
            }
            e.setAttribute("data-last-updated", Date.now())
        } else
            e.setAttribute("data-last-updated", Date.now())
    }
    static sortTable(e, t) {
        if (t.length < 1)
            return;
        const a = e.querySelector("tbody")
            , r = Array.from(t[0].parentNode.children)
            , n = [];
        for (const e of t)
            n.push(r.indexOf(e));
        Array.from(a.querySelectorAll("tr")).sort(TableUtil.tableComparer(n, !1)).forEach(e => a.appendChild(e))
    }
    static getCellValues(e, t) {
        var a = [];
        for (const r of t)
            a.push(e.children[r].innerText || e.children[r].textContent);
        return a
    }
    static collectTableData(e) {
        let t = e.getAttribute("data-chart-collection-mode");
        t = null == t ? "body" : t;
        const a = []
            , r = []
            , n = []
            , o = []
            , l = e.querySelectorAll(":scope thead th")
            , s = "foot" === t ? e.querySelectorAll(":scope tfoot tr") : e.querySelectorAll(":scope tbody tr");
        if (0 == s.length)
            return {
                headers: a,
                rowHeaders: r,
                values: n,
                colors: o
            };
        const i = s[0].getElementsByTagName("th").length > 0 ? 1 : 0;
        for (let e = i; e < l.length; e++) {
            const t = l[e];
            a.push(t.textContent),
                n.push([]),
                o.push(t.getAttribute("data-chart-color"))
        }
        for (let e = 0; e < s.length; e++) {
            const t = s[e];
            1 == i && r.push(t.getElementsByTagName("th")[0].textContent);
            const a = t.getElementsByTagName("td");
            for (let e = 0; e < a.length; e++) {
                const t = a[e].textContent;
                n[e].push(parseFloat(t))
            }
        }
        return {
            headers: a,
            rowHeaders: r,
            values: n,
            colors: o
        }
    }
    static updateVirtualColRowTable(e, t, a) {
        let r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : null
            , n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : null
            , o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : null;
        const l = TableUtil.collectHeaders(t).sort(null == r ? (e, t) => t[0].localeCompare(e[0]) : r)
            , s = []
            , i = []
            , c = []
            , d = [];
        l.forEach(e => {
            const t = null == n ? e : n(e);
            s.push(t),
                i.push(t.toLowerCase()),
                d.push([])
        }
        );
        for (const [e, a] of Object.entries(t)) {
            c.push(null == o ? e : o(e));
            for (let e = 0; e < l.length; e++)
                d[e].push(a[l[e]])
        }
        a({
            headers: s,
            rowHeaders: c,
            values: d,
            colors: i
        }),
            e.setAttribute("data-last-updated", Date.now())
    }
    static createSimpleRow(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = document.createElement("tr");
        return TableUtil.createRowTh(r).textContent = t,
            r.insertCell().textContent = a ? String(e[t]) : e[t],
            r
    }
}
TableUtil.tableComparer = (e, t) => (a, r) => {
    return n = TableUtil.getCellValues(t ? a : r, e),
        o = TableUtil.getCellValues(t ? r : a, e),
        Util.compareValueArrays(n, o);
    var n, o
}
    ;
class TeamUtil {
    static updateTeamsTable(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : "lg";
        const n = "true" == e.getAttribute("data-ladder-format-show")
            , o = "false" !== e.getAttribute("data-ladder-last-played-show")
            , l = e.getElementsByTagName("tbody")[0];
        a && ElementUtil.removeChildren(l);
        let s = 0
            , i = null;
        for (let e = 0; e < t.result.length; e++) {
            const a = t.result[e]
                , c = l.insertRow();
            if (-1 == a.id) {
                c.setAttribute("data-team-alternative-data", a.alternativeData),
                    s++;
                continue
            }
            c.setAttribute("data-team-id", a.id),
                a.dateTime && c.setAttribute("data-team-date-time", a.dateTime);
            const d = TeamUtil.isCheaterTeam(a);
            n && (c.insertCell().appendChild(TeamUtil.createTeamFormatInfo(a)),
                null != i && a.league.queueType != i && c.classList.add("section-splitter")),
                TeamUtil.appendRankInfo(TableUtil.createRowTh(c), t, a, d ? -1 : s),
                TableUtil.insertCell(c, "rating").textContent = a.rating,
                TeamUtil.appendLeagueDiv(c.insertCell(), a),
                c.insertCell().appendChild(ElementUtil.createImage("flag/", a.region.toLowerCase(), "table-image-long")),
                c.appendChild(TeamUtil.createMembersCell(a, r)),
                TeamUtil.appendGamesInfo(c.insertCell(), a),
                c.insertCell().textContent = Math.round(a.wins / (a.wins + a.losses) * 100),
                o && c.appendChild(TeamUtil.createLastPlayedCell(a)),
                c.appendChild(TeamUtil.createMiscCell(a)),
                d ? c.classList.add("team-cheater") : s++,
                i = a.league.queueType
        }
        $(e).popover({
            html: !0,
            boundary: "body",
            placement: "auto",
            trigger: "hover",
            selector: '[data-toggle="popover"]',
            content: function () {
                return TeamUtil.createDynamicPopoverContent($(this)[0]).outerHTML
            }
        })
    }
    static isCheaterTeam(e) {
        return e.members.find(e => 1 == e.restrictions)
    }
    static createDynamicPopoverContent(e) {
        let t;
        switch (e.getAttribute("data-ctype")) {
            case "rank":
                t = TeamUtil.createDynamicRankTable(e);
                break;
            case "games":
                t = TeamUtil.createDynamicGamesTable(e);
                break;
            case "league":
                t = TeamUtil.createDynamicLeagueTable(e);
                break;
            case "last-played":
                t = TeamUtil.createDynamicLastPlayedContent(e);
                break;
            default:
                throw new Error("invalid popover data type")
        }
        return t
    }
    static createTeamFormatInfo(e) {
        const t = EnumUtil.enumOfId(e.league.queueType, TEAM_FORMAT)
            , a = EnumUtil.enumOfId(e.league.teamType, TEAM_TYPE);
        return document.createTextNode(Util.getTeamFormatAndTeamTypeString(t, a))
    }
    static appendRankInfo(e, t, a, r) {
        const n = -1 == r || Util.isUndefinedRank(a.globalRank) ? "-" : Util.NUMBER_FORMAT.format(a.globalRank)
            , o = -1 == r ? "-" : null != t.meta ? Util.DECIMAL_FORMAT.format(Util.calculateRank(t, r) / t.meta.totalCount * 100) : Util.isUndefinedRank(a.globalRank) ? "" : Util.DECIMAL_FORMAT.format(a.globalRank / a.globalTeamCount * 100);
        e.setAttribute("data-toggle", "popover"),
            e.setAttribute("data-ctype", "rank");
        const l = '<div class="text-nowrap">\n            <span>'.concat(n, '</span>\n            <span class="text-secondary font-weight-lighter">').concat(isNaN(o) ? "" : "(" + o + "%)", "</span>\n            </div>");
        e.innerHTML = l
    }
    static getTeamFromElement(e) {
        const t = e.closest("tr")
            , a = t.getAttribute("data-team-id")
            , r = t.getAttribute("data-team-date-time")
            , n = Model.DATA.get(ViewUtil.getView(e));
        return (n.get(VIEW_DATA.TEAMS) ? n.get(VIEW_DATA.TEAMS).result.find(e => e.id == a && (!r || e.dateTime == r)) : null) || n.get(VIEW_DATA.SEARCH).result.find(e => e.id == a)
    }
    static createDynamicRankTable(e) {
        const t = Model.DATA.get(ViewUtil.getView(e))
            , a = (t.get(VIEW_DATA.TEAMS) || t.get(VIEW_DATA.SEARCH),
                TeamUtil.getTeamFromElement(e));
        if (TeamUtil.isCheaterTeam(a)) {
            const e = document.createElement("span");
            return e.textContent = "No rank info available",
                e
        }
        const r = TableUtil.createTable(["Scope", "Rank", "Total", "Top%"], !1)
            , n = r.querySelector("tbody");
        return n.appendChild(TeamUtil.createRankRow(a, "global", a.globalTeamCount)),
            n.appendChild(TeamUtil.createRankRow(a, "region", a.regionTeamCount)),
            n.appendChild(TeamUtil.createRankRow(a, "league", a.leagueTeamCount)),
            r
    }
    static createRankRow(e, t, a) {
        const r = document.createElement("tr");
        TableUtil.createRowTh(r).textContent = t;
        const n = e[t + "Rank"];
        return Util.isUndefinedRank(n) ? (r.insertCell().textContent = "-",
            r.insertCell().textContent = Util.NUMBER_FORMAT.format(a),
            r.insertCell().textContent = "-") : (r.insertCell().textContent = Util.NUMBER_FORMAT.format(n),
                r.insertCell().textContent = Util.NUMBER_FORMAT.format(a),
                r.insertCell().textContent = Util.DECIMAL_FORMAT.format(n / a * 100)),
            r
    }
    static appendGamesInfo(e, t) {
        e.setAttribute("data-toggle", "popover"),
            e.setAttribute("data-ctype", "games"),
            e.appendChild(document.createTextNode(t.wins + t.losses + t.ties))
    }
    static createDynamicGamesTable(e) {
        const t = TeamUtil.getTeamFromElement(e)
            , a = TableUtil.createTable(["Type", "Count"], !1)
            , r = a.querySelector("tbody");
        return r.appendChild(TableUtil.createSimpleRow(t, "wins")),
            r.appendChild(TableUtil.createSimpleRow(t, "losses")),
            r.appendChild(TableUtil.createSimpleRow(t, "ties")),
            a
    }
    static createDynamicLeagueTable(e) {
        const t = TeamUtil.getTeamFromElement(e)
            , a = TeamUtil.getGlobalLeagueRange(t)
            , r = TeamUtil.getTeamRegionLeagueRange(t)
            , n = TableUtil.createTable(["Type", "League"], !1)
            , o = n.querySelector("tbody");
        let l = o.insertRow();
        return TableUtil.createRowTh(l).textContent = "Top% Global",
            l.insertCell().appendChild(TeamUtil.createLeagueDivFromEnum(a.league, a.tierType)),
            l = o.insertRow(),
            TableUtil.createRowTh(l).textContent = "Top% Region",
            l.insertCell().appendChild(TeamUtil.createLeagueDivFromEnum(r.league, r.tierType)),
            n
    }
    static createDynamicLastPlayedContent(e) {
        const t = TeamUtil.getTeamFromElement(e);
        return ElementUtil.createElement("span", null, "last-played-details", t.lastPlayed ? Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(t.lastPlayed)) : "unknown")
    }
    static getTeamRegionLeagueRange(e) {
        return Util.getLeagueRange(e.regionRank, e.regionTeamCount)
    }
    static getGlobalLeagueRange(e) {
        if (e.globalRank <= Object.values(REGION).length * SC2Restful.GM_COUNT)
            return {
                league: LEAGUE.GRANDMASTER,
                tierType: 0
            };
        const t = e.globalRank / e.globalTeamCount * 100;
        return Object.values(TIER_RANGE).find(e => t <= e.bottomThreshold)
    }
    static createMemberInfo(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : "lg";
        const n = document.createElement("span");
        return n.classList.add("team-member-info", "col-" + r + (e.members.length > 1 ? "-6" : "-12"), "col-md-12"),
            n.appendChild(TeamUtil.createPlayerLink(e, t, a)),
            n
    }
    static createPlayerLink(e, t, a) {
        const r = document.createElement("a");
        r.classList.add("player-link", "w-100", "h-100", "d-inline-block"),
            null != Session.currentFollowing && Object.values(Session.currentFollowing).filter(e => e.followingAccountId == t.account.id).length > 0 && r.classList.add("text-success"),
            r.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?type=character&id=").concat(t.character.id, "&m=1")),
            r.setAttribute("data-character-id", t.character.id),
            r.addEventListener("click", CharacterUtil.showCharacterInfo);
        const n = document.createElement("span");
        return n.classList.add("player-link-container"),
            a && n.appendChild(TeamUtil.createRacesElem(t)),
            n.appendChild(TeamUtil.createNameElem(t)),
            null != t.restrictions && n.appendChild(ElementUtil.createCheaterFlag(t.restrictions ? CHEATER_FLAG.CHEATER : CHEATER_FLAG.SUSPICIOUS, !1)),
            t.proNickname && n.appendChild(ElementUtil.createProFlag()),
            r.appendChild(n),
            r
    }
    static createNameElem(e) {
        const t = Util.unmaskName(e)
            , a = document.createElement("span");
        if (a.classList.add("player-name-container"),
            null != t.unmaskedTeam) {
            const e = document.createElement("span");
            e.classList.add("player-team"),
                e.textContent = t.unmaskedTeam,
                a.appendChild(e)
        }
        const r = document.createElement("span");
        if (r.classList.add("player-name"),
            r.textContent = Util.convertFakeName(e, t.unmaskedName),
            a.appendChild(r),
            t.maskedName.toLowerCase() != t.unmaskedName.toLowerCase() || t.maskedTeam && t.maskedTeam != t.unmaskedTeam) {
            const r = document.createElement("span");
            if (r.classList.add("player-name-masked-container"),
                null != t.maskedTeam) {
                const e = document.createElement("span");
                e.classList.add("player-team-masked"),
                    e.textContent = t.maskedTeam,
                    r.appendChild(e)
            }
            const n = document.createElement("span");
            n.classList.add("player-name-masked"),
                n.textContent = Util.convertFakeName(e, t.maskedName),
                r.appendChild(n),
                a.appendChild(r)
        }
        return a
    }
    static createRacesElem(e) {
        const t = new Map;
        t.set(RACE.TERRAN, void 0 === e.terranGamesPlayed ? 0 : e.terranGamesPlayed),
            t.set(RACE.PROTOSS, void 0 === e.protossGamesPlayed ? 0 : e.protossGamesPlayed),
            t.set(RACE.ZERG, void 0 === e.zergGamesPlayed ? 0 : e.zergGamesPlayed),
            t.set(RACE.RANDOM, void 0 === e.randomGamesPlayed ? 0 : e.randomGamesPlayed);
        let a = 0;
        for (const e of t.values())
            a += e;
        const r = document.createElement("span");
        if (r.classList.add("race-percentage-container", "mr-1", "text-nowrap", "d-inline-block"),
            0 == a) {
            const e = document.createElement("span");
            return e.classList.add("race-percentage-entry", "c-divider-slash", "text-secondary"),
                e.appendChild(ElementUtil.createNoRaceImage()),
                r.appendChild(e),
                r
        }
        const n = new Map;
        for (const [e, r] of t.entries())
            0 != r && n.set(e, Math.round(r / a * 100));
        const o = new Map([...n.entries()].sort((e, t) => t[1] - e[1]));
        if (o.size > 0)
            for (const [e, t] of o.entries()) {
                if (0 == t)
                    continue;
                const a = document.createElement("span");
                if (a.classList.add("race-percentage-entry", "c-divider-slash", "text-secondary"),
                    a.appendChild(ElementUtil.createImage("race/", e.name, "table-image table-image-square")),
                    t < 100) {
                    const r = document.createElement("span");
                    r.classList.add("race-percentage", "race-percentage-" + e.name, "text-secondary"),
                        r.textContent = t,
                        a.appendChild(r)
                }
                r.appendChild(a)
            }
        else
            r.appendChild(ElementUtil.createNoRaceImage());
        return r
    }
    static createMembersCell(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "lg";
        const a = document.createElement("td");
        a.classList.add("complex", "cell-main", "team");
        const r = document.createElement("span");
        r.classList.add("row", "no-gutters");
        for (const a of e.members)
            r.appendChild(TeamUtil.createMemberInfo(e, a, !0, t));
        return a.appendChild(r),
            a
    }
    static appendLeagueDiv(e, t) {
        e.setAttribute("data-toggle", "popover"),
            e.setAttribute("data-ctype", "league"),
            e.appendChild(TeamUtil.createLeagueDiv(t))
    }
    static createLeagueDiv(e) {
        const t = EnumUtil.enumOfId(e.league.type, LEAGUE);
        return TeamUtil.createLeagueDivFromEnum(t, e.tierType)
    }
    static createLeagueDivFromEnum(e, t) {
        const a = document.createElement("div");
        return a.classList.add("text-nowrap"),
            a.appendChild(ElementUtil.createImage("league/", e.name, "table-image table-image-square mr-1")),
            a.appendChild(ElementUtil.createImage("league/", "tier-" + (null != t ? t + 1 : 1), "table-image-additional" + (null == t ? " invisible" : ""))),
            a
    }
    static createLastPlayedCell(e) {
        const t = document.createElement("td");
        if (!e.lastPlayed)
            return t;
        t.classList.add("last-played", "text-truncate");
        const a = luxon.Duration.fromMillis(Date.now() - Util.parseIsoDateTime(e.lastPlayed));
        return t.textContent = a.toLargestUnitString(),
            t.setAttribute("data-ctype", "last-played"),
            t.setAttribute("data-toggle", "popover"),
            a.milliseconds <= TeamUtil.TEAM_ONLINE_DURATION ? t.classList.add("text-success") : a.milliseconds >= TeamUtil.TEAM_OLD_DURATION && t.classList.add("text-secondary"),
            t
    }
    static createMiscCell(e) {
        const t = document.createElement("td");
        t.classList.add("text-nowrap", "misc", "text-right");
        const a = ElementUtil.createTagButton("a", "table-image table-image-square background-cover mr-3 d-inline-block chart-line-img");
        return a.setAttribute("href", TeamUtil.getTeamMmrHistoryHref([e])),
            a.setAttribute("target", "_blank"),
            a.setAttribute("rel", "noopener"),
            t.appendChild(a),
            t.appendChild(BufferUtil.createToggleElement(BufferUtil.teamBuffer, e)),
            t
    }
    static isAlternativelyUpdatedTeam(e) {
        return ALTERNATIVE_UPDATE_REGIONS.length > 0 && ALTERNATIVE_UPDATE_REGIONS.includes(e.region) && null == Session.currentSeasonsMap.get(e.region).get(e.season + 1) || 46 == e.season || 47 == e.season
    }
    static getFavoriteRace(e) {
        let t = e.terranGamesPlayed || 0
            , a = RACE.TERRAN;
        for (const r of Object.values(RACE)) {
            const n = e[r.name + "GamesPlayed"] || 0;
            n > t && (a = r,
                t = n)
        }
        return a
    }
    static getTeamLegacyUid(e) {
        return e.queueType + "-" + EnumUtil.enumOfId(e.teamType, TEAM_TYPE).code + "-" + EnumUtil.enumOfName(e.region, REGION).code + "-" + e.legacyId
    }
    static getTeamMmrHistoryParams(e) {
        const t = new URLSearchParams;
        t.append("type", "team-mmr");
        for (const a of e)
            t.append("teamLegacyUid", TeamUtil.getTeamLegacyUid(a));
        return t
    }
    static getTeamMmrHistoryHref(e) {
        return "".concat(ROOT_CONTEXT_PATH, "team/history?").concat(TeamUtil.getTeamMmrHistoryParams(e).toString())
    }
    static updateTeamMmr() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        null == e && (e = TeamUtil.getTeamMmrHistoryParams(Array.from(BufferUtil.teamBuffer.buffer.values())));
        const t = e.toString()
            , a = {
                params: t
            };
        return Util.setGeneratingStatus(STATUS.BEGIN),
            TeamUtil.updateTeamMmrModel(e).then(e => {
                TeamUtil.updateTeamMmrView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS),
                    Session.isHistorical || HistoryUtil.pushState(a, document.title, "?" + t + "#team-mmr"),
                    Session.currentSearchParams = t,
                    Session.isHistorical || HistoryUtil.updateActiveTabs()
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static updateTeamMmrModel(e) {
        const t = new URLSearchParams;
        for (const a of e.getAll("teamLegacyUid"))
            t.append("legacyUid", a);
        const a = "".concat(ROOT_CONTEXT_PATH, "api/team/history/common?").concat(t.toString());
        return Session.beforeRequest().then(e => fetch(a)).then(Session.verifyJsonResponse).then(e => {
            const t = [];
            for (const a of Object.values(e))
                t.push(a.teams[a.teams.length - 1]),
                    a.states = CharacterUtil.expandMmrHistory(a.states);
            return t.sort((e, t) => t.rating - e.rating),
                Model.DATA.get(VIEW.TEAM_MMR).set(VIEW_DATA.SEARCH, {
                    result: t
                }),
                Model.DATA.get(VIEW.TEAM_MMR).set(VIEW_DATA.VAR, e),
                e
        }
        )
    }
    static updateTeamMmrView() {
        const e = Model.DATA.get(VIEW.TEAM_MMR).get(VIEW_DATA.VAR)
            , t = document.getElementById("team-mmr-season-last").checked
            , a = document.getElementById("team-mmr-depth").value
            , r = a > 0 ? new Date(Date.now() - 24 * a * 60 * 60 * 1e3) : null
            , n = document.getElementById("team-mmr-y-axis").value
            , o = CharacterUtil.mmrYValueGetter(n)
            , l = document.getElementById("team-mmr-x-type").checked ? "time" : "category"
            , s = document.getElementById("team-mmr-leagues").checked
            , i = Model.DATA.get(VIEW.TEAM_MMR).get(VIEW_DATA.SEARCH)
            , c = i.result.length > 0 ? i.result[0].members[0].character.region : "EU";
        TeamUtil.updateTeamsTable(document.querySelector("#team-mmr-teams-table"), i);
        let d = []
            , u = 0;
        const m = [];
        for (const [a, r] of Object.entries(e)) {
            const e = r.teams[r.teams.length - 1]
                , a = TeamUtil.generateTeamName(e);
            m.push(a);
            const n = CharacterUtil.getLastSeasonTeamSnapshotDates(r.states);
            if (!t)
                for (const e of r.states)
                    e.group = {
                        name: a,
                        order: u
                    },
                        e.teamState.dateTime = new Date(e.teamState.dateTime),
                        d.push(e);
            for (const e of r.teams) {
                const r = CharacterUtil.convertTeamToTeamSnapshot(e, n, t);
                r.group = {
                    name: a,
                    order: u
                },
                    d.push(r)
            }
            u++
        }
        d = TeamUtil.filterTeamMmrHistory(d, r),
            d.sort((e, t) => e.teamState.dateTime.getTime() - t.teamState.dateTime.getTime()),
            d.forEach(CharacterUtil.calculateMmrHistoryTopPercentage);
        const p = Util.groupBy(d, e => e.teamState.dateTime.getTime())
            , h = []
            , g = [];
        for (const [e, t] of p.entries()) {
            g.push(t),
                h[e] = {};
            for (const a of t)
                h[e][a.group.name] = o(a)
        }
        ChartUtil.CHART_RAW_DATA.set("team-mmr-table", {
            rawData: g,
            additionalDataGetter: TeamUtil.getAdditionalMmrHistoryData
        }),
            ChartUtil.setCustomConfigOption("team-mmr-table", "region", c),
            TableUtil.updateVirtualColRowTable(document.getElementById("team-mmr-table"), h, e => {
                CharacterUtil.decorateMmrPoints(e, g, m, (e, t) => e.find(e => e.group.name == t), s),
                    ChartUtil.CHART_RAW_DATA.get("team-mmr-table").data = e
            }
                , null, null, "time" == l ? e => parseInt(e) : e => Util.DATE_TIME_FORMAT.format(new Date(parseInt(e)))),
            TeamUtil.updateTeamMmrFilters(d, r)
    }
    static filterTeamMmrHistory(e, t) {
        return null != t && (e = e.filter(e => e.teamState.dateTime.getTime() > t.getTime())),
            e
    }
    static updateTeamMmrFilters(e, t) {
        document.getElementById("team-mmr-filters").textContent = "(" + e.length + " entries" + (null != t ? ", starting from " + Util.DATE_FORMAT.format(t) : "") + ")"
    }
    static getAdditionalMmrHistoryData(e, t, a, r) {
        const n = [];
        t.datasets.forEach(e => n.push(e.label));
        const o = n[r]
            , l = Object.values(e)[a].find(e => e.group.name == o)
            , s = [];
        return s.push(l.season),
            l.tierType = l.tier,
            s.push(TeamUtil.createLeagueDiv(l)),
            s.push(l.teamState.rating),
            s.push(CharacterUtil.createMmrHistoryGamesFromTeamState(l)),
            CharacterUtil.appendAdditionalMmrHistoryRanks(l, s),
            s
    }
    static generateTeamMmrTitle(e, t) {
        const a = Model.DATA.get(VIEW.TEAM_MMR).get(VIEW_DATA.SEARCH).result;
        if (!a || 0 == a.length)
            return "Team MMR history";
        const r = [];
        for (const e of a)
            r.push(TeamUtil.generateTeamName(e, !1));
        return "".concat(r.join(" | "), " team MMR history")
    }
    static generateTeamMmrDescription(e, t) {
        const a = Model.DATA.get(VIEW.TEAM_MMR).get(VIEW_DATA.VAR);
        if (!a || 0 == a.length)
            return "Complete team MMR history";
        let r = 0;
        for (const e of Object.values(a))
            r += e.teams.length + e.states.length;
        return "Complete team MMR history, ".concat(Object.entries(a).length, " teams, ").concat(r, " entries.")
    }
    static enhanceMmrForm() {
        document.getElementById("team-mmr-depth").addEventListener("input", TeamUtil.onMmrInput),
            document.getElementById("team-mmr-season-last").addEventListener("change", e => TeamUtil.updateTeamMmrView()),
            document.getElementById("team-mmr-y-axis").addEventListener("change", e => {
                CharacterUtil.setMmrYAxis(e.target.value, e.target.getAttribute("data-chartable")),
                    TeamUtil.updateTeamMmrView()
            }
            ),
            document.getElementById("team-mmr-x-type").addEventListener("change", e => window.setTimeout(TeamUtil.updateTeamMmrView, 1)),
            document.getElementById("team-mmr-leagues").addEventListener("change", e => TeamUtil.updateTeamMmrView())
    }
    static afterEnhance() {
        const e = document.getElementById("team-mmr-y-axis");
        e && CharacterUtil.setMmrYAxis(e.value, e.getAttribute("data-chartable"))
    }
    static onMmrInput(e) {
        const t = ElementUtil.INPUT_TIMEOUTS.get(e.target.id);
        null != t && window.clearTimeout(t),
            ElementUtil.INPUT_TIMEOUTS.set(e.target.id, window.setTimeout(TeamUtil.updateTeamMmrView, ElementUtil.INPUT_TIMEOUT))
    }
    static generateTeamName(e) {
        let t = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        const a = [];
        a.push(EnumUtil.enumOfId(e.queueType, TEAM_FORMAT).name);
        for (const t of e.members) {
            const e = Util.unmaskName(t);
            a.push(e.unmaskedName + "(" + (e.maskedName.toLowerCase() != e.unmaskedName.toLowerCase() ? e.maskedName + ", " : "") + TeamUtil.getFavoriteRace(t).name.substring(0, 1) + ")")
        }
        return t && a.push(e.id),
            a.join(", ")
    }
    static createTeamFromSnapshot(e, t) {
        let a = {};
        return Object.assign(a, e),
            Object.assign(a, t.teamState),
            a.league = t.league,
            a.leagueType = t.league.type,
            a.tierType = t.tier,
            a.lastPlayed = t.teamState.dateTime,
            t.teamState.wins ? a.losses = t.teamState.games - t.teamState.wins : a.wins = e.wins,
            a
    }
    static getTeams(e) {
        return Session.beforeRequest().then(t => fetch("".concat(ROOT_CONTEXT_PATH, "api/teams?").concat(e.toString()))).then(Session.verifyJsonResponse)
    }
    static fuzzyTeamSearchParams(e) {
        const t = parseInt(e.get("rating"));
        t && (e.delete("rating"),
            e.append("ratingMin", Math.max(t - TeamUtil.TEAM_SEARCH_MMR_OFFSET, 1)),
            e.append("ratingMax", t + TeamUtil.TEAM_SEARCH_MMR_OFFSET));
        const a = parseInt(e.get("wins"));
        return a && (e.delete("wins"),
            e.append("winsMin", Math.max(a - TeamUtil.TEAM_SEARCH_GAMES_OFFSET, 0)),
            e.append("winsMax", a)),
            e
    }
    static loadTeamSearchModel(e) {
        return TeamUtil.getTeams(TeamUtil.fuzzyTeamSearchParams(e)).then(e => {
            const t = Model.DATA.get(VIEW.TEAM_SEARCH);
            t.set(VIEW_DATA.SEARCH, {
                result: e
            }),
                t.set(VIEW_DATA.VAR, e)
        }
        )
    }
    static updateTeamSearchModel() {
        const e = Model.DATA.get(VIEW.TEAM_SEARCH);
        e && TeamUtil.sortTeamSearchModel(e)
    }
    static sortTeamSearchModel(e) {
        const t = e.get(VIEW_DATA.VAR);
        if (0 == t.length)
            return;
        const a = localStorage.getItem("search-team-sort") || "lastPlayedTimestamp";
        if ("lastPlayedTimestamp" == a && !t[0].lastPlayedTimestamp)
            for (const e of t)
                e.lastPlayedTimestamp = Util.parseIsoDateTime(e.lastPlayed).getTime();
        t.sort((e, t) => t[a] - e[a])
    }
    static updateTeamSearchView() {
        const e = Model.DATA.get(VIEW.TEAM_SEARCH).get(VIEW_DATA.SEARCH)
            , t = document.querySelector("#team-search-teams");
        TeamUtil.updateTeamsTable(t, e),
            t.classList.remove("d-none")
    }
    static updateTeams(e) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            TeamUtil.loadTeamSearchModel(e).then(t => {
                TeamUtil.updateTeamSearchModel(),
                    TeamUtil.updateTeamSearchView(),
                    Util.setGeneratingStatus(STATUS.SUCCESS);
                const a = new URLSearchParams(e);
                a.append("type", "team-search");
                const r = a.toString()
                    , n = {
                        params: r
                    };
                Session.isHistorical || HistoryUtil.pushState(n, document.title, "?" + r + "#search-team"),
                    Session.currentSearchParams = r,
                    Session.isHistorical || HistoryUtil.updateActiveTabs()
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static onTeamSearch(e) {
        e.preventDefault();
        const t = new URLSearchParams(new FormData(e.target));
        return TeamUtil.updateTeams(t)
    }
    static onTeamSort(e) {
        Model.DATA.get(VIEW.TEAM_SEARCH).get(VIEW_DATA.VAR) && (TeamUtil.updateTeamSearchModel(),
            TeamUtil.updateTeamSearchView())
    }
    static enhanceTeamSearch() {
        const e = document.querySelector("#form-search-team");
        e && e.addEventListener("submit", TeamUtil.onTeamSearch);
        const t = document.querySelector("#search-team-sort");
        t && t.addEventListener("change", () => window.setTimeout(TeamUtil.onTeamSort, 1))
    }
    static createTeamGroupBaseParams(e, t, a, r) {
        const n = new URLSearchParams;
        return e && e.forEach(e => n.append("id", e)),
            t && t.forEach(e => n.append("teamLegacyUid", e)),
            null != a && n.append("seasonMin", a),
            null != r && n.append("seasonMax", r),
            n
    }
    static createHistoryParams(e, t, a, r, n) {
        const o = TeamUtil.createTeamGroupBaseParams(e, t);
        return a && o.append("groupBy", a.fullName),
            r && o.append("from", r.toISOString()),
            n && o.append("to", n.toISOString()),
            o
    }
    static getHistory(e, t, a, r, n, o, l) {
        const s = TeamUtil.createHistoryParams(e, t, a, r, n);
        o && o.forEach(e => s.append("static", e.fullName)),
            l && l.forEach(e => s.append("history", e.fullName));
        const i = ROOT_CONTEXT_PATH + "api/team-histories?" + s.toString();
        return Session.beforeRequest().then(e => fetch(i)).then(Session.verifyJsonResponse)
    }
    static getHistorySummary(e, t, a, r, n, o, l) {
        const s = TeamUtil.createHistoryParams(e, t, a, r, n);
        o && o.forEach(e => s.append("static", e.fullName)),
            l && l.forEach(e => s.append("summary", e.fullName));
        const i = ROOT_CONTEXT_PATH + "api/team-history-summaries?" + s.toString();
        return Session.beforeRequest().then(e => fetch(i)).then(Session.verifyJsonResponse)
    }
    static getTeamGroup(e, t, a, r) {
        const n = TeamUtil.createTeamGroupBaseParams(e, t, a, r)
            , o = ROOT_CONTEXT_PATH + "api/teams?" + n.toString();
        return Session.beforeRequest().then(e => fetch(o)).then(Session.verifyJsonResponse)
    }
    static createLegacyUid(e, t, a, r) {
        return e.code + "-" + t.code + "-" + a.code + "-" + r
    }
    static createLegacyIdSection(e) {
        return e.realm + "." + e.id + "." + (e.race || "")
    }
    static createLegacyId(e) {
        return e.map(TeamUtil.createLegacyIdSection).join("~")
    }
    static parseLegacyId(e) {
        const t = e.split(".");
        return {
            realm: parseInt(t[0]),
            id: parseInt(t[1]),
            race: "" !== t[2] ? EnumUtil.enumOfId(parseInt(t[2]), RACE) : null
        }
    }
    static createLegacyIdsForAllRaces(e) {
        const t = structuredClone(e);
        return Object.values(RACE).map(e => (t.race = e.code,
            TeamUtil.createLegacyIdSection(t)))
    }
    static createLegacyUidsForAllRaces(e, t, a, r) {
        return TeamUtil.createLegacyIdsForAllRaces(r).map(r => TeamUtil.createLegacyUid(e, t, a, r))
    }
    static createLegacyUidFromHistoryStaticData(e) {
        return TeamUtil.createLegacyUid(EnumUtil.enumOfId(e[TEAM_HISTORY_STATIC_COLUMN.QUEUE_TYPE.fullName], TEAM_FORMAT), EnumUtil.enumOfId(e[TEAM_HISTORY_STATIC_COLUMN.TEAM_TYPE.fullName], TEAM_TYPE), EnumUtil.enumOfId(e[TEAM_HISTORY_STATIC_COLUMN.REGION.fullName], REGION), e[TEAM_HISTORY_STATIC_COLUMN.LEGACY_ID.fullName])
    }
}
TeamUtil.TEAM_SEARCH_MMR_OFFSET = 50,
    TeamUtil.TEAM_SEARCH_GAMES_OFFSET = 2,
    TeamUtil.TEAM_ONLINE_DURATION = 24e5,
    TeamUtil.TEAM_OLD_DURATION = 12096e5;
class ViewUtil {
    static getView(e) {
        const t = e.getAttribute("data-proxy");
        t && (e = document.getElementById(t));
        const a = e.closest("[data-view-name]").getAttribute("data-view-name");
        return EnumUtil.enumOfName(a, VIEW, !1) || a
    }
}
class FormUtil {
    static getFormErrors(e) {
        const t = [];
        for (const a of e.querySelectorAll(":scope .group-checkbox"))
            Array.from(a.querySelectorAll(':scope input[type="checkbox"]')).filter(e => e.checked).length > 0 || t.push("You must select at least one " + a.getAttribute("data-name"));
        return FormUtil.getGreaterThenErrors(e, t),
            t.join(". ")
    }
    static getGreaterThenErrors(e, t) {
        for (const a of e.querySelectorAll(":scope [data-greater-than]")) {
            const e = a.getAttribute("data-greater-than-inclusive")
                , r = document.querySelector(a.getAttribute("data-greater-than"));
            if (!a.value || !r.value)
                continue;
            const n = "number" == a.getAttribute("type") ? parseFloat(a.value) : a.value;
            (e ? n >= r.value : n > r.value) || t.push("".concat(a.getAttribute("data-name"), " must be greater than ").concat("true" === e ? "or equal to" : "", " ").concat(r.getAttribute("data-name")))
        }
    }
    static verifyForm(e, t) {
        const a = FormUtil.getFormErrors(e);
        return a ? (t.textContent = a,
            t.classList.remove("d-none"),
            !1) : (t.classList.add("d-none"),
                !0)
    }
    static setFormState(e, t) {
        for (const [a, r] of t) {
            const t = e.querySelector(':scope [name="' + a + '"]');
            t && ElementUtil.changeInputValue(t, r)
        }
    }
    static setMultiSelectState(e, t) {
        e.querySelectorAll("option").forEach(e => {
            t.includes(e.value) ? e.setAttribute("selected", "selected") : e.removeAttribute("selected")
        }
        )
    }
    static formDataToObject(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = {};
        for (const [n, o] of e.entries())
            if (n.startsWith(t)) {
                const e = a && "string" == typeof o ? o.trim() : o;
                r[n.substring(t.length)] = "" == e ? null : e
            }
        return r
    }
    static setFormStateFromObject(e, t, a) {
        Object.entries(t).forEach(t => {
            const r = e.querySelector(':scope [name="' + a + t[0] + '"]');
            if (null != r)
                if ("radio" == r.getAttribute("type")) {
                    const r = e.querySelector(':scope [name="' + a + t[0] + '"][value="' + t[1] + '"]');
                    r && ElementUtil.changeInputValue(r, !0)
                } else
                    ElementUtil.changeInputValue(r, null == t[1] ? "" : t[1])
        }
        )
    }
    static setFormStateFromArray(e, t, a) {
        const r = Array.from(e.querySelectorAll(":scope .clone-ctl")).find(e => null != document.querySelector("#" + e.getAttribute("data-clone-source") + ' [name="' + a + '"]'));
        document.querySelectorAll("#" + r.getAttribute("data-clone-destination") + " ." + r.getAttribute("data-clone-class") + ":not(#" + r.getAttribute("data-clone-source") + ")").forEach(e => e.remove());
        for (const e of t)
            ElementUtil.changeInputValue(ElementUtil.cloneElement(r).querySelector(':scope [name="' + a + '"]'), e)
    }
    static resetForm(e) {
        e.querySelectorAll(":scope .clone-ctl").forEach(t => {
            e.querySelectorAll(":scope ." + t.getAttribute("data-clone-class") + ":not(#" + t.getAttribute("data-clone-source") + ")").forEach(e => e.remove())
        }
        ),
            e.reset()
    }
    static selectAndFocusOnInput(e, t) {
        e.focus({
            preventScroll: t
        }),
            e.select()
    }
    static setInputStatsExcludingGroup(e, t, a) {
        if (e.getAttribute("data-active-group") != t || e.getAttribute("data-active-state") != a) {
            for (const r of e.querySelectorAll(":scope input"))
                r.getAttribute("data-group") != t && (r.disabled = a);
            for (const r of e.querySelectorAll(":scope select"))
                r.getAttribute("data-group") != t && (r.disabled = a);
            e.setAttribute("data-active-group", t),
                e.setAttribute("data-active-state", a)
        }
    }
    static onInputGroupInput(e) {
        const t = e.target.getAttribute("data-group")
            , a = e.target.value && e.target.value.length > 0 || e.target.checked;
        FormUtil.setInputStatsExcludingGroup(e.target.closest("form"), t, a)
    }
    static enhanceFormGroups() {
        for (const e of document.querySelectorAll("input[data-group]"))
            e.addEventListener("input", FormUtil.onInputGroupInput),
                e.addEventListener("change", FormUtil.onInputGroupInput)
    }
    static linkInputStateBindings() {
        document.querySelectorAll("[data-state-link-id]").forEach(e => {
            const t = document.getElementById(e.getAttribute("data-state-link-id"));
            t.addEventListener("change", FormUtil.onInputStateLinkChange),
                t.addEventListener("input", FormUtil.onInputStateLinkChange)
        }
        )
    }
    static onInputStateLinkChange(e) {
        document.querySelectorAll('[data-state-link-id="' + e.target.id + '"]').forEach(t => FormUtil.setInputLinkState(t, e.target))
    }
    static setInputLinkState(e, t) {
        const a = e.getAttribute("data-state-link-values");
        if (a.startsWith("c-multiple")) {
            const r = "c-multiple-single" == a ? 1 : 2
                , n = Math.min(t.querySelectorAll("option:checked").length, 2);
            e.disabled = n != r
        } else {
            const r = t.checked || t.value;
            e.disabled = !a.split(",").some(e => e == r)
        }
    }
    static initInputStateLinks() {
        for (const e of Util.groupBy(document.querySelectorAll("[data-state-link-id]"), e => e.getAttribute("data-state-link-id")).entries()) {
            const t = document.getElementById(e[0]);
            e[1].forEach(e => FormUtil.setInputLinkState(e, t))
        }
    }
    static enhanceFormConfirmations() {
        for (const e of document.querySelectorAll("form.confirmation"))
            e.addEventListener("submit", FormUtil.confirmFormSubmission)
    }
    static confirmFormSubmission(e) {
        return e.preventDefault(),
            BootstrapUtil.showConfirmationModal(e.target.getAttribute("data-confirmation-text"), e.target.getAttribute("data-confirmation-description"), e.target.getAttribute("data-confirmation-action-name"), e.target.getAttribute("data-confirmation-action-class")).then(t => (1 == t && e.target.submit(),
                Promise.resolve(t)))
    }
    static enhanceFormInputGroupFilters() {
        document.querySelectorAll(".filtered-input-filter").forEach(e => {
            e.addEventListener("input", FormUtil.onFormInputGroupFilter),
                e.addEventListener("keydown", FormUtil.onFormInputGroupFilterKeyDown)
        }
        ),
            document.querySelectorAll(".filtered-input-group input").forEach(e => e.addEventListener("click", FormUtil.onFormInputGroupInputClick))
    }
    static onFormInputGroupFilter(e) {
        FormUtil.filterFormInputGroup(e.target)
    }
    static filterFormInputGroup(e) {
        let t = e.value.toLowerCase();
        "true" == e.getAttribute("data-trim") && (t = t.trim()),
            document.querySelectorAll(e.getAttribute("data-filtered-input-group")).forEach(e => {
                let a = 0;
                e.querySelectorAll(":scope .filtered-input-container").forEach(e => {
                    t.length > 0 && e.querySelector(":scope label").textContent.toLowerCase().includes(t) ? (e.classList.remove("d-none"),
                        a++) : e.classList.add("d-none")
                }
                ),
                    FormUtil.setFormInputGroupActiveInput(e, FormUtil.getActiveOrFirstFilteredInputGroupOption(e)),
                    e.setAttribute("data-valid-option-count", a),
                    a > 0 ? e.classList.remove("d-none") : e.classList.add("d-none")
            }
            )
    }
    static getActiveOrFirstFilteredInputGroupOption(e) {
        const t = Array.from(e.querySelectorAll(":scope .filtered-input-container:not(.d-none) input"));
        return 0 == t.length ? null : t.find(e => e.checked) || t[0]
    }
    static setFormInputGroupActiveInput(e, t) {
        const a = document.querySelector('.filtered-input-filter[data-filtered-input-group="#' + e.id + '"]');
        if (null != t)
            t.checked = !0,
                e.setAttribute("data-active-option", t.value),
                a.classList.remove("text-danger"),
                a.removeAttribute("pattern");
        else {
            const t = e.getAttribute("data-active-option");
            null != t && (e.querySelector(':scope input[value="' + t + '"').checked = !1),
                a.classList.add("text-danger"),
                a.setAttribute("pattern", "")
        }
    }
    static getFormInputGroupLabelByValue(e, t) {
        if (null == t)
            return null;
        const a = e.querySelector(':scope input[value="' + t + '"]').id;
        return document.querySelector('label[for="' + a + '"]').textContent
    }
    static setInputGroupFilterByValue(e, t) {
        let a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        const r = e.getAttribute("data-filtered-input-group")
            , n = document.querySelector(r);
        e.value = FormUtil.getFormInputGroupLabelByValue(n, t),
            e.dispatchEvent(new Event("input", {
                bubbles: !0
            })),
            a && "1" == n.getAttribute("data-valid-option-count") && document.querySelectorAll(r).forEach(e => e.classList.add("d-none"))
    }
    static onFormInputGroupInputClick(e) {
        FormUtil.setInputGroupFilterByValue(document.querySelector('[data-filtered-input-group="#' + e.target.closest(".filtered-input-group").id + '"]'), e.target.value)
    }
    static navigateInputGroupOptions(e, t) {
        const a = e.querySelectorAll(":scope .filtered-input-container:not(.d-none) input");
        if (0 == a.length)
            return;
        const r = Array.from(a).findIndex(e => e.checked)
            , n = t ? Math.min(r + 1, a.length - 1) : Math.max(r - 1, 0);
        FormUtil.setFormInputGroupActiveInput(e, a[n])
    }
    static onFormInputGroupFilterKeyDown(e) {
        const t = document.querySelector(e.target.getAttribute("data-filtered-input-group"));
        switch (e.key) {
            case "ArrowDown":
                FormUtil.navigateInputGroupOptions(t, !0);
                break;
            case "ArrowUp":
                FormUtil.navigateInputGroupOptions(t, !1);
                break;
            case "Enter":
                e.preventDefault();
                const a = Array.from(t.querySelectorAll(":scope .filtered-input-container:not(.d-none) input")).find(e => e.checked);
                null != a && FormUtil.setInputGroupFilterByValue(e.target, a.value)
        }
    }
    static updateCsrfForm(e) {
        return Session.getCsrf().then(t => (e.querySelector(':scope [name="' + t.parameterName + '"]').value = t.token,
            e))
    }
}
class ClanUtil {
    static updateClanSearchModel(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null
            , a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : ClanUtil.DEFAULT_SORT;
        const r = EnumUtil.enumOfProperty("field", a.field, CLAN_CURSOR)
            , n = new URLSearchParams("?" + e);
        null != t && n.append(t.direction.relativePosition, t.token),
            n.append("sort", a.toPrefixedString());
        const o = Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH)
            , l = {
                formParams: e,
                cursor: r,
                navigationCursor: t,
                sort: a
            };
        o && null != t || ClanUtil.updateClanSearchPaginationConfig(Number.parseFloat(n.get(l.cursor.minParamName)) || CLAN_MIN_ADDITIONAL_CURSOR_FILTER, Number.parseFloat(n.get(l.cursor.maxParamName)) || CLAN_MAX_ADDITIONAL_CURSOR_FILTER, l.cursor.getter);
        const s = n.get("tagOrName").trim()
            , i = s && s.length > 0
            , c = i ? "".concat(ROOT_CONTEXT_PATH, "api/clans?query=").concat(encodeURIComponent(s)) : "".concat(ROOT_CONTEXT_PATH, "api/clans?").concat(n.toString());
        return Session.beforeRequest().then(e => fetch(c)).then(Session.verifyJsonResponse).then(e => ClanUtil.extractModelData(e, l, i))
    }
    static extractModelData(e, t, a) {
        if (a)
            Model.DATA.get(VIEW.CLAN_SEARCH).set(VIEW_DATA.SEARCH, {
                searchResult: PaginationUtil.resultToPagedResult(e),
                params: t
            });
        else {
            var r, n;
            const a = (null === (r = t.navigationCursor) || void 0 === r ? void 0 : r.direction) || NAVIGATION_DIRECTION.FORWARD
                , l = 0 == e.result.length;
            if (e.meta = PaginationUtil.createCursorMeta(e, null == t.navigationCursor || null == (null === (n = e.navigation) || void 0 === n ? void 0 : n[NAVIGATION_DIRECTION.BACKWARD.relativePosition]), a),
                l) {
                var o;
                const e = Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH);
                if (null != (null == e || null === (o = e.searchResult) || void 0 === o ? void 0 : o.meta))
                    return PaginationUtil.setEmptyResultMeta(e.searchResult.meta, a),
                        e
            }
            Model.DATA.get(VIEW.CLAN_SEARCH).set(VIEW_DATA.SEARCH, {
                searchResult: e,
                params: t
            })
        }
        return Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH)
    }
    static updateClanSearchPaginationConfig(e, t, a) {
        PaginationUtil.PAGINATIONS.set("clan-search", new Pagination(".pagination-clan-search", [], ClanUtil.clanSearchPaginationPageClick))
    }
    static updateClanSearchView() {
        const e = Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH);
        ClanUtil.updateClanTable(document.querySelector("#search-result-clan"), e.searchResult.result);
        PaginationUtil.PAGINATIONS.get("clan-search").update(e.searchResult);
        document.getElementById("search-result-clan-all").classList.remove("d-none")
    }
    static updateClanTable(e, t) {
        const a = e.querySelector(":scope tbody");
        ElementUtil.removeChildren(a);
        for (const e of t) {
            const t = a.insertRow();
            if (t.setAttribute("data-clan-id", e.id),
                e.avgLeagueType) {
                const a = EnumUtil.enumOfId(e.avgLeagueType, LEAGUE);
                t.insertCell().appendChild(TeamUtil.createLeagueDivFromEnum(a, null))
            } else
                t.insertCell();
            t.insertCell().appendChild(ElementUtil.createImage("flag/", e.region.toLowerCase(), "table-image-long")),
                t.insertCell().appendChild(ClanUtil.createClanTagElem(e)),
                t.insertCell().textContent = e.activeMembers,
                t.insertCell().textContent = e.members,
                t.insertCell().textContent = e.avgRating,
                t.insertCell().textContent = Util.DECIMAL_FORMAT.format(e.games / e.activeMembers / CLAN_STATS_DEPTH_DAYS);
            const r = t.insertCell();
            r.classList.add("cell-main", "complex"),
                r.textContent = e.name;
            const n = t.insertCell();
            n.classList.add("text-nowrap", "misc", "text-right"),
                n.appendChild(BufferUtil.createToggleElement(BufferUtil.clanBuffer, e))
        }
    }
    static updateClanSearch(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null
            , a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : ClanUtil.DEFAULT_SORT;
        return Util.setGeneratingStatus(STATUS.BEGIN),
            ClanUtil.updateClanSearchModel(e, t, a).then(e => {
                const t = Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH).params
                    , a = new URLSearchParams(t.formParams);
                a.append("type", "clan-search"),
                    null != t.navigationCursor && a.append(t.navigationCursor.direction.relativePosition, t.navigationCursor.token),
                    a.append("sort", t.sort.toPrefixedString());
                const r = a.toString();
                ClanUtil.updateClanSearchView(),
                    Util.scrollIntoViewById("search-result-clan-all"),
                    Util.setGeneratingStatus(STATUS.SUCCESS),
                    Session.isHistorical || HistoryUtil.pushState({}, document.title, "?" + r + "#search-clan"),
                    Session.currentSearchParams = r
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static clanSearchPaginationPageClick(e) {
        e.preventDefault();
        const t = Model.DATA.get(VIEW.CLAN_SEARCH).get(VIEW_DATA.SEARCH);
        ClanUtil.updateClanSearch(t.params.formParams, Cursor.fromElementAttributes(e.target, "data-page-"), t.params.sort)
    }
    static enhanceClanSearchForm() {
        const e = document.querySelector("#form-search-clan");
        e.addEventListener("submit", t => {
            if (t.preventDefault(),
                !FormUtil.verifyForm(e, e.querySelector(":scope .error-out")))
                return;
            const a = new FormData(e)
                , r = a.get("sortBy") || CLAN_CURSOR.ACTIVE_MEMBERS.field;
            a.delete("sortBy");
            for (const e of ClanUtil.REQUIRED_CURSOR_PARAMETERS)
                a.delete(e);
            ClanUtil.updateClanSearch(Util.urlencodeFormData(a), null, new SortParameter(r, ClanUtil.DEFAULT_SORT.order))
        }
        )
    }
    static createClanTagElem(e) {
        const t = ElementUtil.createElement("a", null, "clan-auto-search", e.tag);
        return t.setAttribute("href", encodeURI("".concat(ROOT_CONTEXT_PATH, "?type=group&clanId=").concat(e.id, "#group-group"))),
            t.addEventListener("click", GroupUtil.onGroupLinkClick),
            t
    }
    static showClanGroup(e) {
        return e.preventDefault(),
            GroupUtil.loadAndShowGroup(Util.getHrefUrlSearchParams(e.target))
    }
    static getClanFromElement(e) {
        const t = e.closest("tr").getAttribute("data-clan-id")
            , a = Model.DATA.get(ViewUtil.getView(e)).get(VIEW_DATA.SEARCH);
        return (a.clans || a.searchResult.result).find(e => e.id == t)
    }
    static generateClanName(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        return "[".concat(e.tag, "]") + (t && e.name ? " ".concat(e.name) : "")
    }
    static updateClanHistoryTable(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = e.querySelector(":scope tbody");
        a && ElementUtil.removeChildren(r);
        for (const e of t.events) {
            const a = r.insertRow()
                , n = t.characters.get(e.playerCharacterId)
                , o = t.clans.get(e.clanId)
                , l = EnumUtil.enumOfName(e.type, CLAN_MEMBER_EVENT_TYPE);
            a.insertCell().textContent = Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e.created)),
                TableUtil.insertCell(a, "text-right").appendChild(TeamUtil.createMemberInfo(n, n.members)),
                a.insertCell().appendChild(l.element.cloneNode()),
                a.insertCell().appendChild(ElementUtil.createImage("flag/", o.region.toLowerCase(), "table-image-long")),
                TableUtil.insertCell(a, "cell-main text-left").appendChild(ClanUtil.createClanTagElem(o))
        }
    }
}
ClanUtil.REQUIRED_CURSOR_PARAMETERS = ["sort"],
    ClanUtil.DEFAULT_SORT = new SortParameter(CLAN_CURSOR.ACTIVE_MEMBERS.field, SORTING_ORDER.DESC);
class Buffer {
    constructor(e, t, a, r, n) {
        this.toggleClass = e,
            this.attribute = t,
            this.updateModel = r,
            this.updateView = n,
            this.itemGetter = a,
            this.buffer = new Map
    }
    update() {
        this.updateModel(this),
            this.updateView(this)
    }
    add(e) {
        this.buffer.set(e.id, e),
            this.update()
    }
    remove(e) {
        this.buffer.delete(e.id),
            this.update()
    }
    clear() {
        this.buffer.clear(),
            document.querySelectorAll("." + this.toggleClass + ".remove").forEach(e => e.classList.replace("remove", "add")),
            this.update()
    }
    static toggle(e, t) {
        const a = e.itemGetter(t.target)
            , r = t.target.classList.contains("remove")
            , n = "[" + e.attribute + '="' + a.id + '"] .' + e.toggleClass;
        r ? (e.remove(a),
            document.querySelectorAll(n).forEach(e => {
                e.classList.remove("remove"),
                    e.classList.add("add")
            }
            )) : (e.add(a),
                document.querySelectorAll(n).forEach(e => {
                    e.classList.add("remove"),
                        e.classList.remove("add")
                }
                ))
    }
}
class BufferUtil {
    static clear() {
        BufferUtil.teamBuffer.clear(),
            BufferUtil.clanBuffer.clear()
    }
    static updateView() {
        const e = document.querySelector("#team-buffer");
        document.querySelector("#team-buffer-count").textContent = BufferUtil.teamBuffer.buffer.size,
            document.querySelector("#team-buffer-clan-count").textContent = BufferUtil.clanBuffer.buffer.size;
        0 == BufferUtil.teamBuffer.buffer.size + BufferUtil.clanBuffer.buffer.size ? e.classList.add("d-none") : e.classList.remove("d-none"),
            BufferUtil.updateTeamMmrLink(),
            BufferUtil.updateVersusLink(),
            BufferUtil.updateGroupLink(),
            BufferUtil.updateCopyLink()
    }
    static updateTeamMmrLink() {
        const e = document.querySelector("#team-buffer-mmr");
        BufferUtil.teamBuffer.buffer.size > 0 ? (e.setAttribute("href", TeamUtil.getTeamMmrHistoryHref(Array.from(BufferUtil.teamBuffer.buffer.values()))),
            e.classList.remove("d-none")) : e.classList.add("d-none")
    }
    static updateVersusLink() {
        const e = new URLSearchParams;
        for (const t of BufferUtil.teamBuffer.buffer.values())
            e.append("team" + (t.bufferGroup ? t.bufferGroup : 1), TeamUtil.getTeamLegacyUid(t));
        for (const t of BufferUtil.clanBuffer.buffer.values())
            e.append("clan" + (t.bufferGroup ? t.bufferGroup : 1), t.id);
        const t = localStorage.getItem("matches-type-versus");
        null != t && "all" != t && e.append("matchType", t);
        const a = document.querySelector("#team-buffer-versus");
        e.getAll("team1").length + e.getAll("clan1").length > 0 && e.getAll("team2").length + e.getAll("clan2").length > 0 ? (a.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?type=versus&m=1&").concat(e.toString())),
            a.classList.remove("d-none")) : a.classList.add("d-none")
    }
    static updateGroupLink() {
        const e = new URLSearchParams
            , t = document.querySelector("#team-buffer-group");
        for (const t of BufferUtil.clanBuffer.buffer.values())
            e.append("clanId", t.id);
        e.getAll("clanId").length > 0 ? (t.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?type=group&m=1&").concat(e.toString())),
            t.classList.remove("d-none")) : t.classList.add("d-none")
    }
    static updateCopyLink() {
        const e = document.querySelectorAll("#team-buffer .action-team");
        BufferUtil.teamBuffer.buffer.size > 0 ? e.forEach(e => e.classList.remove("disabled")) : e.forEach(e => e.classList.add("disabled"))
    }
    static updateGenericTeamLegacyUidLink(e, t) {
        if (BufferUtil.teamBuffer.buffer.size > 0) {
            e.classList.remove("disabled");
            const a = new URLSearchParams;
            BufferUtil.teamBuffer.buffer.forEach(e => a.append("teamLegacyUid", e.legacyUid)),
                e.setAttribute("href", t + a.toString())
        } else
            e.classList.add("disabled"),
                e.setAttribute("href", "#")
    }
    static updateChatMmrCommandLink() {
        BufferUtil.updateGenericTeamLegacyUidLink(document.querySelector("#team-buffer-chat-mmr-command"), "https://sc2-pulse.github.io/chat-mmr/?")
    }
    static updateTeamStatsVerificationLink() {
        BufferUtil.updateGenericTeamLegacyUidLink(document.querySelector("#team-buffer-team-stats-verification"), "https://sc2-pulse.github.io/team-stats-verification/?")
    }
    static updateToolsMenu() {
        BufferUtil.updateChatMmrCommandLink(),
            BufferUtil.updateTeamStatsVerificationLink()
    }
    static copyCharacterId(e) {
        e.preventDefault();
        const t = Array.from(BufferUtil.teamBuffer.buffer.values()).flatMap(e => e.members).map(e => e.character.id).join(",");
        return navigator.clipboard.writeText(t)
    }
    static copyClanId(e) {
        e.preventDefault();
        const t = Array.from(BufferUtil.teamBuffer.buffer.values()).flatMap(e => e.members).map(e => e.clan).filter(e => e).map(e => e.id)
            , a = Array.from(BufferUtil.clanBuffer.buffer.values()).map(e => e.id)
            , r = t.concat(a).join(",");
        return navigator.clipboard.writeText(r)
    }
    static copyTeamLegacyUid(e) {
        e.preventDefault();
        const t = Array.from(BufferUtil.teamBuffer.buffer.values()).flatMap(e => e.legacyUid).join(",");
        return navigator.clipboard.writeText(t)
    }
    static enhance() {
        document.querySelector("#team-buffer-clear").addEventListener("click", BufferUtil.clear),
            document.querySelector("#team-buffer-versus").addEventListener("click", VersusUtil.onVersusLinkClick),
            document.querySelector("#team-buffer-group").addEventListener("click", GroupUtil.onGroupLinkClick),
            document.querySelector("#team-buffer-copy-character-id").addEventListener("click", BufferUtil.copyCharacterId),
            document.querySelector("#team-buffer-copy-team-legacy-uid").addEventListener("click", BufferUtil.copyTeamLegacyUid),
            document.querySelector("#team-buffer-copy-clan-id").addEventListener("click", BufferUtil.copyClanId),
            $("#team-buffer-tools-dropdown").on("show.bs.dropdown", BufferUtil.updateToolsMenu)
    }
    static createToggleElement(e, t) {
        const a = e.buffer.has(t.id)
            , r = ElementUtil.createTagButton("div", "table-image table-image-square background-cover team-buffer-toggle d-inline-block " + (a ? "remove" : "add"));
        return r.addEventListener("click", t => Buffer.toggle(e, t)),
            r
    }
    static appendGroupElements(e) {
        for (const t of e.querySelectorAll(":scope tbody tr")) {
            t.children[t.children.length - 1].prepend(BufferUtil.createGroupSelect(BufferUtil.getTeamOrClanFromElement(t)))
        }
    }
    static createGroupSelect(e) {
        const t = BufferUtil.GROUP_SELECT_ELEMENT.cloneNode(!0);
        return t.value = e.bufferGroup ? e.bufferGroup : 1,
            t.addEventListener("change", e => {
                BufferUtil.getTeamOrClanFromElement(e.target).bufferGroup = e.target.value,
                    BufferUtil.updateVersusLink()
            }
            ),
            t
    }
    static getTeamOrClanFromElement(e) {
        return e.closest("tr").getAttribute("data-team-id") ? TeamUtil.getTeamFromElement(e) : ClanUtil.getClanFromElement(e)
    }
}
BufferUtil.teamBuffer = new Buffer("team-buffer-toggle", "data-team-id", e => TeamUtil.getTeamFromElement(e), e => {
    Model.DATA.get(VIEW.TEAM_BUFFER).set(VIEW_DATA.SEARCH, {
        result: Array.from(e.buffer.values())
    })
}
    , e => {
        const t = document.querySelector("#team-buffer-teams");
        0 == e.buffer.size ? t.classList.add("d-none") : t.classList.remove("d-none"),
            TeamUtil.updateTeamsTable(t, {
                result: Array.from(BufferUtil.teamBuffer.buffer.values())
            }),
            BufferUtil.appendGroupElements(t),
            BufferUtil.updateView()
    }
),
    BufferUtil.clanBuffer = new Buffer("team-buffer-toggle", "data-clan-id", e => ClanUtil.getClanFromElement(e), e => {
        Model.DATA.get(VIEW.CLAN_BUFFER).set(VIEW_DATA.SEARCH, {
            searchResult: {
                result: Array.from(e.buffer.values())
            }
        })
    }
        , e => {
            const t = document.querySelector("#team-buffer-clans");
            0 == e.buffer.size ? t.classList.add("d-none") : t.classList.remove("d-none"),
                ClanUtil.updateClanTable(t, Array.from(e.buffer.values())),
                BufferUtil.appendGroupElements(t),
                BufferUtil.updateView()
        }
    ),
    BufferUtil.GROUP_SELECT_ELEMENT = document.createElement("select"),
    BufferUtil.GROUP_SELECT_ELEMENT.classList.add("form-control", "width-initial", "d-inline-block", "mr-3", "buffer-group"),
    BufferUtil.GROUP_SELECT_ELEMENT.innerHTML = '<option value="1" selected="selected">G1</option>\n    <option value="2">G2</option>';
class MatchUtil {
    static updateMatchTable(e, t, a, r) {
        let n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : null
            , o = !(arguments.length > 5 && void 0 !== arguments[5]) || arguments[5];
        const l = e.querySelector(":scope tbody");
        o && ElementUtil.removeChildren(l);
        const s = t
            , i = [];
        for (let o = 0; o < s.length; o++) {
            const c = s[o]
                , d = Util.groupBy(c.participants, e => e.participant.decision)
                , u = l.childNodes.length
                , m = []
                , p = c.participants.sort((e, t) => t.participant.decision.localeCompare(e.participant.decision));
            for (const e of p)
                if (e.team) {
                    if (0 == m.length || m[m.length - 1].id != e.team.id) {
                        const t = r ? TeamUtil.createTeamFromSnapshot(e.team, e.teamState) : e.team;
                        t.matchParticipant = e,
                            m.push(t)
                    }
                } else
                    m.push({
                        id: -1,
                        alternativeData: e.participant.playerCharacterId + "," + e.participant.decision
                    });
            i.push(...m),
                TeamUtil.updateTeamsTable(e, {
                    result: m
                }, !1, "xl"),
                MatchUtil.decorateTeams(d, m, l, u, a, r, n);
            const h = l.childNodes[u];
            h.classList.add("section-splitter");
            const g = document.createElement("td");
            g.setAttribute("rowspan", m.length),
                g.textContent = c.map.name,
                h.prepend(g);
            const S = document.createElement("td");
            S.setAttribute("rowspan", m.length),
                S.textContent = c.match.type.replace(/_/g, ""),
                h.prepend(S);
            const A = document.createElement("td");
            A.setAttribute("rowspan", m.length),
                A.textContent = MatchUtil.generateMatchLengthString(t, o),
                h.prepend(A);
            const T = document.createElement("td");
            T.setAttribute("rowspan", m.length),
                T.textContent = Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(c.match.date)),
                h.prepend(T)
        }
        return {
            teams: i,
            validMatches: s
        }
    }
    static getDecisionClass(e) {
        return "WIN" == e ? "bg-success-fade-1" : "LOSS" == e ? "bg-danger-fade-1" : "bg-secondary-fade-1"
    }
    static decorateTeams(e, t, a, r, n, o, l) {
        const s = l ? null : MatchUtil.findMainTeam(t, n);
        for (let i = 0; i < t.length; i++) {
            const i = a.childNodes[r]
                , c = i.getAttribute("data-team-id")
                , d = document.createElement("td");
            if (d.classList.add("text-capitalize-first"),
                !c) {
                MatchUtil.appendUnknownMatchParticipant(i, d, n),
                    r++;
                continue
            }
            let u;
            for (const t of e.values()) {
                const e = t.find(e => e.team && e.team.id == c);
                if (e) {
                    u = e;
                    break
                }
            }
            o && u && MatchUtil.addMmrChange(i, u);
            const m = u ? u.participant.decision : e.get("WIN") && e.get("WIN").find(e => e.team && e.team.id == c) ? "WIN" : "LOSS"
                , p = t.find(e => e.id == c)
                , h = i.querySelector(":scope .team")
                , g = MatchUtil.getDecisionClass(m);
            h.classList.add(g),
                s && c == s.id || l && p.members.find(e => n({
                    team: p,
                    member: e
                })) ? (h.classList.add("font-weight-bold"),
                    d.classList.add("font-weight-bold", g),
                    MatchUtil.appendInvisibleVersusLink(i)) : MatchUtil.appendVersusLink(i, s, p, l),
                u && u.twitchVodUrl && MatchUtil.prependTwitchVodLink(i, u),
                d.textContent = m,
                i.prepend(d),
                r++
        }
    }
    static createMmrChangeElem(e) {
        if (!e)
            return null;
        const t = document.createElement("span");
        return t.classList.add(e > 0 ? "text-success" : "text-danger", "rating-change"),
            t.textContent = Util.NUMBER_FORMAT_DIFF.format(e),
            t
    }
    static addMmrChange(e, t) {
        const a = MatchUtil.createMmrChangeElem(t.participant.ratingChange);
        if (!a)
            return;
        const r = e.querySelector(":scope .rating")
            , n = r.textContent;
        ElementUtil.removeChildren(r);
        const o = ElementUtil.createElement("span", null, "text-nowrap");
        o.appendChild(ElementUtil.createElement("span", null, "", n)),
            o.appendChild(a),
            r.appendChild(o)
    }
    static findMainTeam(e, t) {
        for (const a of e.filter(e => e.members))
            if (a.members.find(e => t({
                team: a,
                member: e
            })))
                return a;
        return null
    }
    static appendInvisibleVersusLink(e) {
        const t = VersusUtil.createEmptyVersusLink();
        t.classList.add("invisible"),
            e.querySelector(":scope .misc").prepend(t)
    }
    static appendVersusLink(e, t, a, r) {
        let n;
        if (n = r ? r + "&team2=" + encodeURIComponent(TeamUtil.getTeamLegacyUid(a)) : t && a ? VersusUtil.getVersusUrl("matches-type") + "&team1=" + encodeURIComponent(TeamUtil.getTeamLegacyUid(t)) + "&team2=" + encodeURIComponent(TeamUtil.getTeamLegacyUid(a)) : null,
            n) {
            const t = VersusUtil.createEmptyVersusLink();
            t.setAttribute("href", n),
                t.addEventListener("click", VersusUtil.onVersusLinkClick),
                e.querySelector(":scope .misc").prepend(t)
        }
    }
    static prependTwitchVodLink(e, t) {
        const a = document.createElement("a");
        a.setAttribute("href", t.twitchVodUrl),
            a.setAttribute("target", "_blank"),
            a.setAttribute("rel", "noopener"),
            a.setAttribute("title", "Twitch VOD" + (t.subOnlyTwitchVod ? "(sub only)" : "")),
            a.setAttribute("class", "table-image table-image-square background-cover mr-3 d-inline-block twitch-img" + (t.subOnlyTwitchVod ? "-warning" : "")),
            e.querySelector(":scope .misc").prepend(a)
    }
    static appendUnknownMatchParticipant(e, t, a) {
        const r = e.getAttribute("data-team-alternative-data").split(",")
            , n = parseInt(r[0]);
        t.textContent = r[1];
        const o = a(n)
            , l = MatchUtil.getDecisionClass(r[1]);
        e.prepend(t),
            e.insertCell(),
            e.insertCell(),
            e.insertCell(),
            e.insertCell();
        const s = e.insertCell();
        s.classList.add("text-left", l),
            o && (t.classList.add(l, "font-weight-bold"),
                s.classList.add("font-weight-bold"));
        const i = document.createElement("span");
        i.classList.add("row", "no-gutters");
        const c = document.createElement("a");
        c.setAttribute("data-character-id", n),
            c.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?type=character&id=").concat(n, "&m=1")),
            c.addEventListener("click", CharacterUtil.showCharacterInfo),
            c.classList.add("player-link", "col-md-12", "col-lg-12"),
            c.textContent = n,
            i.appendChild(c),
            s.appendChild(i),
            e.insertCell(),
            e.insertCell(),
            e.insertCell(),
            e.insertCell()
    }
    static generateMatchLengthString(e, t) {
        try {
            const a = e[t]
                , r = EnumUtil.enumOfName(a.match.type.replace(/_/g, ""), TEAM_FORMAT);
            if (a.participants.length == 2 * r.memberCount && a.match.duration)
                return Math.round(a.match.duration / 60) + "m";
            {
                const a = MatchUtil.calculateMatchLengthSeconds(e, t);
                return -1 == a ? "" : Math.round(a / 60) + "m"
            }
        } catch (e) { }
        const a = MatchUtil.calculateMatchLengthSeconds(e, t);
        return -1 == a ? "" : Math.round(a / 60) + "m"
    }
    static calculateMatchLengthSeconds(e, t) {
        if (t == e.length - 1)
            return -1;
        const a = (new Date(e[t].match.date).getTime() - new Date(e[t + 1].match.date).getTime()) / 1e3 - MATCH_DURATION_OFFSET;
        return a < 0 || a > MatchUtil.MATCH_DURATION_MAX_SECONDS ? -1 : a
    }
}
MatchUtil.MATCH_DURATION_MAX_SECONDS = 5400;
class VersusUtil {
    static updateVersusWithNewType(e) {
        const t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.VAR).params;
        return t.delete("type"),
            e && "all" != e && t.append("type", e),
            VersusUtil.updateFromParams(VersusUtil.apiParamsToUrlParams(t))
    }
    static updateFromParams(e) {
        return VersusUtil.updateVersus(e.getAll("clan1"), e.getAll("team1"), e.getAll("clan2"), e.getAll("team2"), e.getAll("matchType"))
    }
    static updateVersus(e, t, a, r, n) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            VersusUtil.updateVersusModel(e, t, a, r, n).then(VersusUtil.updateVersusView).then(e => {
                Util.setGeneratingStatus(STATUS.SUCCESS);
                const t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.VAR)
                    , a = VersusUtil.apiParamsToUrlParams(t.params).toString();
                HistoryUtil.pushState({}, document.title, "?" + a + "#versus"),
                    Session.currentSearchParams = a
            }
            ).then(e => BootstrapUtil.showModal("versus-modal")).catch(e => Session.onPersonalException(e))
    }
    static updateVersusModel(e, t, a, r, n) {
        const o = new URLSearchParams;
        Util.addParams(o, "clan1", e),
            Util.addParams(o, "team1", t),
            Util.addParams(o, "clan2", a),
            Util.addParams(o, "team2", r),
            Util.addParams(o, "type", n);
        const l = ROOT_CONTEXT_PATH + "api/versus/common?" + o.toString();
        return Session.beforeRequest().then(e => fetch(l)).then(Session.verifyJsonResponse).then(e => (Model.DATA.get(VIEW.VERSUS).set(VIEW_DATA.SEARCH, e),
            Model.DATA.get(VIEW.VERSUS).set(VIEW_DATA.VAR, {
                params: o
            }),
            VersusUtil.initDynamicViews(),
            Model.DATA.get("versusClans1").set(VIEW_DATA.SEARCH, {
                searchResult: {
                    result: e.clansGroup1
                }
            }),
            Model.DATA.get("versusTeams1").set(VIEW_DATA.TEAMS, {
                result: e.teamsGroup1
            }),
            Model.DATA.get("versusClans2").set(VIEW_DATA.SEARCH, {
                searchResult: {
                    result: e.clansGroup2
                }
            }),
            Model.DATA.get("versusTeams2").set(VIEW_DATA.TEAMS, {
                result: e.teamsGroup2
            }),
            e))
    }
    static initDynamicViews() {
        Model.DATA.get("versusClans1") || (Model.DATA.set("versusClans1", new Map),
            Model.DATA.set("versusTeams1", new Map),
            Model.DATA.set("versusClans2", new Map),
            Model.DATA.set("versusTeams2", new Map))
    }
    static updateVersusView() {
        const e = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.SEARCH)
            , t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.VAR);
        VersusUtil.updateVersusHeader(e);
        const a = VersusUtil.apiParamsToUrlParams(t.params);
        a.delete("team2"),
            a.delete("clan2");
        const r = MatchUtil.updateMatchTable(document.querySelector("#matches-versus"), e.matches.result, t => !Number.isInteger(t) && (e.clansGroup1 && e.clansGroup1.some(e => e.id == t.member.character.clanId) || e.teamsGroup1 && e.teamsGroup1.some(e => e.queueType == t.team.queueType && e.region == t.team.region && e.legacyId == t.team.legacyId)), "false" != localStorage.getItem("matches-historical-mmr-versus"), "".concat(ROOT_CONTEXT_PATH, "versus?").concat(a.toString()));
        Model.DATA.get(VIEW.VERSUS).set(VIEW_DATA.TEAMS, {
            result: r.teams
        }),
            r.validMatches.length >= MATCH_BATCH_SIZE ? document.querySelector("#load-more-matches-versus").classList.remove("d-none") : document.querySelector("#load-more-matches-versus").classList.add("d-none");
        const n = new URLSearchParams;
        let o = t.params.get("type");
        return o = o || "all",
            n.append("matches-type", o),
            t.changedMatchType = (localStorage.getItem("matches-type-versus") || "all") != (t.params.get("type") || "all"),
            FormUtil.setFormState(document.querySelector("#matches-form-versus"), n),
            Promise.resolve()
    }
    static updateVersusHeader(e) {
        VersusUtil.updateVersusClans(document.querySelector("#versus-clans1"), e.clansGroup1),
            VersusUtil.updateVersusTeams(document.querySelector("#versus-teams1"), e.teamsGroup1),
            VersusUtil.updateVersusClans(document.querySelector("#versus-clans2"), e.clansGroup2),
            VersusUtil.updateVersusTeams(document.querySelector("#versus-teams2"), e.teamsGroup2),
            document.querySelector("#versus-result-1").textContent = e.summary.wins,
            document.querySelector("#versus-result-2").textContent = e.summary.losses
    }
    static updateVersusTeams(e, t) {
        TeamUtil.updateTeamsTable(e, {
            result: t
        }, !0, "xl"),
            t.length > 0 ? e.classList.remove("d-none") : e.classList.add("d-none")
    }
    static updateVersusClans(e, t) {
        ClanUtil.updateClanTable(e, t),
            t.length > 0 ? e.classList.remove("d-none") : e.classList.add("d-none")
    }
    static loadNextMatches(e) {
        e.preventDefault(),
            Util.setGeneratingStatus(STATUS.BEGIN);
        const t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.SEARCH).matches.result
            , a = t[t.length - 1];
        VersusUtil.loadNextMatchesModel(a.match.date, a.match.type, a.map.id, a.match.region, Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.VAR).params).then(e => {
            e.result.length > 0 && VersusUtil.updateVersusView(),
                e.result.length < MATCH_BATCH_SIZE && document.querySelector("#load-more-matches-versus").classList.add("d-none"),
                Util.setGeneratingStatus(STATUS.SUCCESS)
        }
        ).catch(e => Session.onPersonalException(e))
    }
    static loadNextMatchesModel(e, t, a, r, n) {
        const o = new URLSearchParams(n);
        return o.append("dateCursor", e),
            o.append("typeCursor", t),
            o.append("mapCursor", a),
            o.append("regionCursor", r),
            Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/versus/matches?").concat(o.toString()))).then(Session.verifyJsonResponse).then(e => {
                const t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.SEARCH);
                return t.matches.result = t.matches.result.concat(e.result),
                    e
            }
            )
    }
    static enhance() {
        document.querySelector("#load-more-matches-versus").addEventListener("click", VersusUtil.loadNextMatches),
            document.querySelector("#matches-historical-mmr-versus").addEventListener("change", e => window.setTimeout(VersusUtil.updateVersusView, 1)),
            document.querySelector("#matches-type-versus").addEventListener("change", e => window.setTimeout(e => {
                const t = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.VAR);
                t.changedMatchType ? t.changedMatchType = !1 : VersusUtil.updateVersusWithNewType(localStorage.getItem("matches-type-versus"))
            }
                , 1))
    }
    static generateVersusTitle() {
        const e = []
            , t = "Versus"
            , a = Model.DATA.get(VIEW.VERSUS).get(VIEW_DATA.SEARCH);
        return a ? (a.clansGroup1 && a.clansGroup1.forEach(t => e.push(ClanUtil.generateClanName(t))),
            a.teamsGroup1 && a.teamsGroup1.forEach(t => e.push(TeamUtil.generateTeamName(t, !1))),
            e.push("VS"),
            a.clansGroup2 && a.clansGroup2.forEach(t => e.push(ClanUtil.generateClanName(t))),
            a.teamsGroup2 && a.teamsGroup2.forEach(t => e.push(TeamUtil.generateTeamName(t, !1))),
            e.length > 1 ? e.join(" ") : t) : t
    }
    static apiParamsToUrlParams(e) {
        const t = new URLSearchParams(e.toString());
        return t.get("type") && t.append("matchType", t.get("type")),
            t.set("type", "versus"),
            t.set("m", "1"),
            t
    }
    static createEmptyVersusLink() {
        return ElementUtil.createElement("a", null, "font-weight-bold d-inline-block mr-3 link-versus", "VS", [["rel", "noopener"], ["target", "_blank"], ["role", "button"]])
    }
    static getVersusUrl() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "matches-type-versus";
        const t = localStorage.getItem(e);
        return "".concat(ROOT_CONTEXT_PATH, "?type=versus&m=1").concat(t && "all" != t ? "&matchType=" + encodeURIComponent(t) : "")
    }
    static onVersusLinkClick(e) {
        e.preventDefault();
        const t = e.target.getAttribute("href");
        VersusUtil.updateFromParams(new URLSearchParams(t.substring(t.indexOf("?"))))
    }
}
class VODUtil {
    static getMatches(e, t) {
        const a = new URLSearchParams(e);
        null != t && a.append(t.direction.relativePosition, t.token),
            a.append("vod", "");
        const r = "".concat(ROOT_CONTEXT_PATH, "api/matches?").concat(a.toString());
        return Session.beforeRequest().then(e => fetch(r)).then(Session.verifyJsonResponse)
    }
    static updateModel(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        return e.get("durationMin") && e.set("durationMin", 60 * e.get("durationMin")),
            e.get("durationMax") && e.set("durationMax", 60 * e.get("durationMax")),
            VODUtil.getMatches(e, t).then(a => {
                if (null == t)
                    Model.DATA.get(VIEW.VOD_SEARCH).set(VIEW_DATA.SEARCH, a);
                else {
                    const e = Model.DATA.get(VIEW.VOD_SEARCH).get(VIEW_DATA.SEARCH);
                    e.result = e.result.concat(a.result),
                        e.navigation = a.navigation
                }
                return Model.DATA.get(VIEW.VOD_SEARCH).set(VIEW_DATA.VAR, {
                    params: e
                }),
                    a.result.length < MATCH_BATCH_SIZE ? document.querySelector("#load-more-matches-vod").classList.add("d-none") : document.querySelector("#load-more-matches-vod").classList.remove("d-none"),
                    Promise.resolve(a)
            }
            )
    }
    static updateView() {
        const e = Model.DATA.get(VIEW.VOD_SEARCH).get(VIEW_DATA.SEARCH).result;
        document.querySelector("#search-result-vod-all").classList.remove("d-none");
        const t = MatchUtil.updateMatchTable(document.querySelector("#matches-vod"), e, e => e.team && e.team.matchParticipant.twitchVodUrl, "false" != localStorage.getItem("matches-historical-mmr-vod"));
        return Model.DATA.get(VIEW.VOD_SEARCH).set(VIEW_DATA.TEAMS, {
            result: t.teams
        }),
            Promise.resolve()
    }
    static update(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        return Util.setGeneratingStatus(STATUS.BEGIN),
            VODUtil.updateModel(e, t).then(VODUtil.updateView).then(t => {
                Util.setGeneratingStatus(STATUS.SUCCESS);
                const a = new URLSearchParams(e);
                a.append("type", "vod-search");
                const r = a.toString();
                return Session.isHistorical || HistoryUtil.pushState({}, document.title, "?" + r + "#search-vod"),
                    Session.currentSearchParams = r,
                    Promise.resolve()
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static loadNextMatches(e) {
        e.preventDefault();
        const t = Model.DATA.get(VIEW.VOD_SEARCH).get(VIEW_DATA.SEARCH).navigation[NAVIGATION_DIRECTION.FORWARD.relativePosition];
        VODUtil.update(Model.DATA.get(VIEW.VOD_SEARCH).get(VIEW_DATA.VAR).params, null != t ? new Cursor(t, NAVIGATION_DIRECTION.FORWARD) : null)
    }
    static enhance() {
        document.querySelector("#load-more-matches-vod").addEventListener("click", VODUtil.loadNextMatches);
        const e = document.getElementById("form-search-vod");
        e.addEventListener("submit", t => {
            t.preventDefault(),
                FormUtil.verifyForm(e, e.querySelector(":scope .error-out")) && VODUtil.update(new URLSearchParams(new FormData(t.target)))
        }
        ),
            document.querySelector("#matches-historical-mmr-vod").addEventListener("change", e => window.setTimeout(VODUtil.updateView, 1))
    }
}
class RevealUtil {
    static enhanceCtl() {
        const e = document.querySelector("#modal-reveal-player");
        e && ($(e).on("show.bs.modal", RevealUtil.onModalShow),
            document.querySelector("#modal-reveal-player-input").addEventListener("input", e => window.setTimeout(RevealUtil.onFilterChange, 1)),
            document.querySelector("#modal-reveal-player-form").addEventListener("submit", RevealUtil.onReveal),
            document.querySelector("#modal-reveal-import-player-form").addEventListener("submit", RevealUtil.onImportProfile),
            document.querySelector("#pro-player-edit").addEventListener("click", RevealUtil.onEditProPlayer),
            document.querySelector("#pro-player-new").addEventListener("click", RevealUtil.onNewProPlayer),
            document.querySelector("#reveal-player-edit-form").addEventListener("submit", RevealUtil.onSaveProPlayer),
            document.querySelectorAll("#modal-reveal-player .log .ctl-reload").forEach(e => e.addEventListener("change", e => window.setTimeout(RevealUtil.reloadLogEntries, 1))),
            ElementUtil.infiniteScroll(document.querySelector("#modal-reveal-player .log .container-indicator-loading-default"), RevealUtil.updateLogEntriesContainer))
    }
    static resetModel() {
        Model.DATA.set(RevealUtil.MODEL_NAME, {
            log: {
                accounts: new Map,
                proPlayers: new Map,
                entries: []
            }
        })
    }
    static onModalShow() {
        var e;
        RevealUtil.resetModel();
        const t = null === (e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR)) || void 0 === e || null === (e = e.members) || void 0 === e ? void 0 : e.proId
            , a = document.querySelector("#modal-reveal-player-form")
            , r = document.querySelector('#modal-reveal-player button[form="modal-reveal-player-form"][type="submit"]')
            , n = document.querySelector("#modal-reveal-player-input");
        return null == t ? (n.disabled = !1,
            a.setAttribute("data-reveal-mode", "reveal"),
            FormUtil.filterFormInputGroup(n),
            r.disabled = 0 == document.querySelector("#modal-reveal-player-players").getAttribute("data-valid-option-count"),
            r.textContent = "Reveal",
            r.classList.add("btn-success"),
            r.classList.remove("btn-danger")) : (n.disabled = !0,
                a.setAttribute("data-reveal-mode", "unlink"),
                FormUtil.setInputGroupFilterByValue(n, t),
                r.disabled = !1,
                r.textContent = "Unlink",
                r.classList.remove("btn-success"),
                r.classList.add("btn-danger")),
            RevealUtil.updateLog()
    }
    static onFilterChange() {
        document.querySelector('#modal-reveal-player button[form="modal-reveal-player-form"][type="submit"]').disabled = 0 == document.querySelector("#modal-reveal-player-players").getAttribute("data-valid-option-count")
    }
    static onReveal(e) {
        e.preventDefault();
        const t = "reveal" == e.target.getAttribute("data-reveal-mode") ? "POST" : "DELETE"
            , a = new FormData(e.target).get("player")
            , r = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members.character;
        return RevealUtil.reveal(r.accountId, a, t).then(e => CharacterUtil.showCharacterInfo(null, r.id, !1)).then(e => BootstrapUtil.hideActiveModal()).then(e => BootstrapUtil.showTab("player-stats-player-tab"))
    }
    static reveal(e, t, a) {
        return Util.setGeneratingStatus(STATUS.BEGIN),
            Session.beforeRequest().then(r => fetch("".concat(ROOT_CONTEXT_PATH, "api/reveal/").concat(e, "/").concat(t), Util.addCsrfHeader({
                method: a
            }))).then(Session.verifyResponse).then(e => Util.setGeneratingStatus(STATUS.SUCCESS)).catch(e => Session.onPersonalException(e))
    }
    static onImportProfile(e) {
        e.preventDefault();
        const t = new FormData(e.target);
        return Util.setGeneratingStatus(STATUS.BEGIN),
            RevealUtil.importProfile(t.get("url")).then(e => {
                RevealUtil.renderAndSelectProPlayer(e, document.querySelector("#modal-reveal-player-players")),
                    Util.setGeneratingStatus(STATUS.SUCCESS)
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static importProfile(e) {
        const t = new FormData;
        return t.set("url", e),
            Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/reveal/import"), Util.addCsrfHeader({
                method: "POST",
                body: t
            }))).then(Session.verifyJsonResponse)
    }
    static renderProPlayerInputGroup(e) {
        const t = ElementUtil.createFilteredInputGroup("reveal-player-" + e.id, "player", e.id);
        return t.querySelector(":scope label").textContent = RevealUtil.renderProPlayer(e),
            t
    }
    static renderProPlayer(e) {
        return "".concat(e.nickname).concat(e.name ? ", " + e.name : "").concat(e.country ? " " + Util.countryCodeToEmoji(e.country) : "")
    }
    static renderAndSelectProPlayer(e, t) {
        const a = RevealUtil.renderProPlayer(e)
            , r = t.querySelector(':scope input[value="' + e.id + '"]');
        null != r ? t.querySelector(':scope label[for="' + r.id + '"]').textContent = a : t.appendChild(RevealUtil.renderProPlayerInputGroup(e));
        const n = document.querySelector('input[data-filtered-input-group="#' + t.id + '"]');
        n.disabled || FormUtil.setInputGroupFilterByValue(n, e.id)
    }
    static onSaveProPlayer(e) {
        e.preventDefault();
        const t = new FormData(e.target)
            , a = FormUtil.formDataToObject(t, "pro-player-", !0);
        null != a.name && (a.name = a.name.replace(/\s\s+/g, " "));
        const r = t.getAll("link-url").map(e => e.trim()).filter(e => "" != e)
            , n = e.target.closest(".container-loading");
        return Util.resetLoadingIndicator(n),
            Util.load(n, () => RevealUtil.saveProPlayer({
                proPlayer: a,
                links: r
            }), !0)
    }
    static saveProPlayer(e) {
        return Session.beforeRequest().then(t => fetch("".concat(ROOT_CONTEXT_PATH, "api/reveal/player/edit"), Util.addCsrfHeader({
            method: "POST",
            body: JSON.stringify(e),
            headers: {
                "Content-Type": "application/json"
            }
        }))).then(Session.verifyJsonResponse).then(e => (RevealUtil.renderAndSelectProPlayer(e.proPlayer, document.querySelector("#modal-reveal-player-players")),
            RevealUtil.editProPlayer(e),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static onEditProPlayer(e) {
        const t = new FormData(document.querySelector("#modal-reveal-player-form")).get("player");
        if (null == t)
            return void RevealUtil.onNewProPlayer(e);
        const a = e.target.closest(".container-loading");
        Util.resetLoadingIndicator(a),
            Util.load(a, () => RevealUtil.getPlayer(t).then(e => {
                const t = RevealUtil.editProPlayer(e);
                return $("#reveal-player-edit-form").collapse("show"),
                    t
            }
            ))
    }
    static editProPlayer(e) {
        const t = document.querySelector("#reveal-player-edit-form");
        FormUtil.setFormStateFromObject(t, e.proPlayer, "pro-player-"),
            FormUtil.setInputGroupFilterByValue(t.querySelector(':scope [name="country-search"]'), e.proPlayer.country);
        const a = null != e.links ? e.links.filter(e => PRO_PLAYER_EDIT_ALLOWED_LINK_TYPES.has(e.type)).map(e => e.url) : [];
        return FormUtil.setFormStateFromArray(t, a, "link-url"),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }
    }
    static onNewProPlayer(e) {
        const t = document.querySelector("#reveal-player-edit-form");
        FormUtil.resetForm(t),
            $(t).collapse("show")
    }
    static getPlayer(e) {
        const t = new URLSearchParams;
        return t.append("proPlayerId", e),
            GroupUtil.getGroup(t).then(e => e.proPlayers[0])
    }
    static getLog(e, t, a, r, n) {
        let o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : 30;
        const l = new URLSearchParams;
        return l.append("limit", o),
            e && (l.append("idCursor", e.id),
                l.append("createdCursor", e.created)),
            t && l.append("accountId", t),
            a && l.append("authorAccountId", a),
            r && l.append("action", r.fullName),
            null != n && l.append("excludeSystemAuthor", n),
            Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/reveal/log?").concat(l.toString()))).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static blame(e, t, a) {
        return e ? RevealUtil.getLog(null, t.accountId, null, AUDIT_LOG_ACTION.INSERT).then(e => {
            if (!e || 0 == e.result.length)
                return null;
            const t = e.result.find(e => "pro_player_account" == e.table);
            if (!t)
                return null;
            if (!t.authorAccountId)
                return [t, null];
            const a = new URLSearchParams;
            return a.append("accountId", t.authorAccountId),
                Promise.all([Promise.resolve(t), GroupUtil.getGroup(a, !0)])
        }
        ).then(e => {
            var t;
            e ? (a.textContent = "Revealed by " + ((null === (t = e[1]) || void 0 === t || null === (t = t.accounts[0]) || void 0 === t ? void 0 : t.battleTag) || RevealUtil.LOG_SYSTEM_USER_NAME) + " on " + Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e[0].created)),
                a.appendChild(ElementUtil.createElement("div", null, "c-divider-hr"))) : a.textContent = ""
        }
        ) : (a.textContent = "",
            Promise.resolve())
    }
    static getRevealers() {
        return Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/user/role/REVEALER"))).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static updateLogRevealers() {
        const e = document.querySelector("#reveal-log-revealer");
        return e.querySelectorAll(":scope option").length > 2 ? Promise.resolve() : RevealUtil.getRevealers().then(t => {
            t && (t.sort((e, t) => e.id - t.id).map(e => ElementUtil.createElement("option", null, null, CharacterUtil.renderAccount(e), [["value", e.id]])).forEach(t => e.appendChild(t)),
                Session.restoreState(e.parentElement))
        }
        )
    }
    static fillLogModel(e) {
        const t = {};
        for (const e of GroupUtil.PARAMETER_KEYS)
            t[e] = new Set;
        for (const a of e) {
            a.dataJson = JSON.parse(a.data),
                a.changedData && (a.changedDataJson = JSON.parse(a.changedData));
            for (const [e, r] of Object.entries(a.dataJson)) {
                if (!e.endsWith("_id"))
                    continue;
                const a = Util.snakeCaseToCamelCase(e);
                t[a] && t[a].add(r)
            }
            a.authorAccountId && t.accountId.add(a.authorAccountId)
        }
        const a = new URLSearchParams;
        for (const [e, r] of Object.entries(t))
            for (const t of r)
                a.append(e, t);
        const r = Model.DATA.get(RevealUtil.MODEL_NAME).log;
        return GroupUtil.getGroup(a, !0).then(t => {
            for (const [e, a] of Object.entries(t))
                a && a.forEach(t => r[e].set(t.id || t[e.substring(0, e.length - 1)].id, t));
            return e
        }
        )
    }
    static renderLogEntry(e, t) {
        const a = ElementUtil.createElement("article", null, "entry d-flex flex-column gap-1 mb-4");
        return a.appendChild(RevealUtil.renderLogEntryHeader(e, t)),
            a.appendChild(RevealUtil.renderLogEntryContent(e, t)),
            a
    }
    static renderLogEntryContent(e, t) {
        const a = ElementUtil.createElement("div", null, "content d-flex flex-column gap-1 px-2");
        return a.appendChild(RevealUtil.renderLogEntryEntities(e, t)),
            a.appendChild(RevealUtil.renderLogEntryData(e)),
            a
    }
    static renderLogEntryEntities(e, t) {
        const a = ElementUtil.createElement("div", null, "entities d-flex flex-wrap-gap");
        for (const [r, n] of Object.entries(e.dataJson)) {
            if (!r.endsWith("_id"))
                continue;
            const e = Util.snakeCaseToCamelCase(r)
                , o = RevealUtil.logDataKeyToModelKey(e);
            if (!t[o])
                continue;
            const l = t[o].get(n);
            if (!l)
                continue;
            const s = RevealUtil.LOG_ENTITY_RENDERERS.get(e);
            if (!s)
                continue;
            const i = new URLSearchParams;
            i.append(e, n),
                a.appendChild(GroupUtil.createGroupLink(i, s(l), !1))
        }
        return 0 == a.children.length && a.classList.add("d-none"),
            a
    }
    static logDataKeyToModelKey(e) {
        return e.substring(0, e.length - 2) + "s"
    }
    static renderLogEntryData(e) {
        const t = RevealUtil.getLogEntryDataRenderKeys(e);
        if (0 == t.length)
            return ElementUtil.createElement("div", null, "d-none");
        const a = TableUtil.createTable([], !0)
            , r = a.querySelector(":scope tbody");
        for (const a of t) {
            const t = TableUtil.createSimpleRow(e.dataJson, a, !0)
                , n = e.changedDataJson && void 0 !== e.changedDataJson[a];
            n && t.children.item(1).classList.add("text-danger"),
                TableUtil.insertCell(t, "text-success").textContent = n ? String(e.changedDataJson[a]) : "",
                r.appendChild(t)
        }
        return a
    }
    static getLogEntryDataRenderKeys(e) {
        switch (e.table) {
            case "pro_player_account":
                {
                    const t = EnumUtil.enumOfFullName(e.action, AUDIT_LOG_ACTION);
                    if (t == AUDIT_LOG_ACTION.INSERT || t == AUDIT_LOG_ACTION.DELETE)
                        return [];
                    break
                }
            case "social_media_link":
                {
                    const t = EnumUtil.enumOfFullName(e.action, AUDIT_LOG_ACTION);
                    if (t == AUDIT_LOG_ACTION.INSERT || t == AUDIT_LOG_ACTION.DELETE)
                        return ["url"]
                }
        }
        return Object.keys(e.dataJson)
    }
    static renderLogEntryHeader(e, t) {
        const a = ElementUtil.createElement("header", null, "bg-transparent-05 d-flex flex-wrap-gap p-2");
        return a.appendChild(ElementUtil.createElement("address", null, "author", e.authorAccountId ? CharacterUtil.renderAccount(t.accounts.get(e.authorAccountId) || {
            id: e.authorAccountId
        }) : RevealUtil.LOG_SYSTEM_USER_NAME)),
            a.appendChild(RevealUtil.renderLogEntryAction(e.action)),
            a.appendChild(ElementUtil.createElement("span", null, "table-name text-info", e.table)),
            a.appendChild(ElementUtil.createElement("time", null, "text-secondary", Util.DATE_TIME_FORMAT.format(Util.parseIsoDateTime(e.created))), [["datetime", e.created]]),
            a
    }
    static renderLogEntryAction(e) {
        const t = EnumUtil.enumOfFullName(e, AUDIT_LOG_ACTION);
        return ElementUtil.createElement("span", null, "action " + RevealUtil.getLogActionClass(t), t.fullName)
    }
    static getLogActionClass(e) {
        switch (e) {
            case AUDIT_LOG_ACTION.INSERT:
                return "text-success";
            case AUDIT_LOG_ACTION.DELETE:
                return "text-danger";
            case AUDIT_LOG_ACTION.UPDATE:
                return "text-warning";
            default:
                return ""
        }
    }
    static updateLogEntries() {
        let e;
        const t = Model.DATA.get(RevealUtil.MODEL_NAME).log;
        t && t.entries && t.entries.length > 0 && (e = t.entries[t.entries.length - 1]);
        const a = localStorage.getItem("reveal-log-revealer") || "EXCLUDE_SYSTEM"
            , r = parseInt(a)
            , n = localStorage.getItem("reveal-log-action") || "ALL";
        return RevealUtil.getLog(e, null, isNaN(r) ? null : r, "ALL" != n ? EnumUtil.enumOfFullName(n, AUDIT_LOG_ACTION) : null, "EXCLUDE_SYSTEM" == a).then(e => {
            if (!e || 0 == e.result.length)
                return {
                    data: null,
                    status: LOADING_STATUS.COMPLETE
                };
            const a = document.querySelector("#reveal-log-entries");
            return RevealUtil.fillLogModel(e.result).then(e => (e.map(e => RevealUtil.renderLogEntry(e, t)).forEach(e => a.appendChild(e)),
                t.entries = t.entries.concat(e),
            {
                data: e,
                status: LOADING_STATUS.NONE
            }))
        }
        )
    }
    static resetLogEntries() {
        ElementUtil.removeChildren(document.querySelector("#reveal-log-entries")),
            Util.resetLoadingIndicator(document.querySelector("#reveal-log-entries-container")),
            Model.DATA.get(RevealUtil.MODEL_NAME).log.entries = []
    }
    static reloadLogEntries() {
        return RevealUtil.resetLogEntries(),
            RevealUtil.updateLogEntriesContainer()
    }
    static updateLogEntriesContainer() {
        const e = document.querySelector("#reveal-log-entries-container");
        return Util.load(e, RevealUtil.updateLogEntries)
    }
    static updateLog() {
        const e = Model.DATA.get(VIEW.CHARACTER).get(VIEW_DATA.VAR).members
            , t = document.querySelector("#modal-reveal-player .log");
        return ElementUtil.executeTask("#modal-reveal-player", () => RevealUtil.blame(null != e.proId, e.character, t.querySelector(":scope .blame"))),
            RevealUtil.updateLogRevealers().then(RevealUtil.reloadLogEntries)
    }
}
RevealUtil.LOG_SYSTEM_USER_NAME = "System",
    RevealUtil.MODEL_NAME = "reveal",
    RevealUtil.LOG_ENTITY_RENDERERS = new Map([["accountId", CharacterUtil.renderAccount], ["proPlayerId", e => RevealUtil.renderProPlayer(e.proPlayer)]]);
class GroupUtil {
    static getGroup(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1]
            , a = {};
        if (t) {
            const t = GroupUtil.getGroupCache(e);
            if (e = t.missedParams,
                a = t.cached,
                0 == e.size)
                return Promise.resolve(a)
        }
        const r = "".concat(ROOT_CONTEXT_PATH, "api/entities?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(r)).then(Session.verifyJsonResponse).then(e => t ? (GroupUtil.cacheGroup(e),
            Util.concatObject(a, e),
            e) : e)
    }
    static getGroupCache(e) {
        const t = new URLSearchParams(e)
            , a = {
                cached: {},
                missedParams: t,
                params: e
            };
        for (const e of new Set(t.keys())) {
            const r = GroupUtil.mapGroupCacheKey(e);
            a.cached[r] = [],
                GroupUtil.CACHE[r] || (GroupUtil.CACHE[r] = new Map);
            for (const n of t.getAll(e)) {
                const o = GroupUtil.CACHE[r].get(parseInt(n));
                o && (a.cached[r].push(o),
                    t.delete(e, n))
            }
        }
        return a
    }
    static mapGroupCacheKey(e) {
        return e.substring(0, e.length - 2) + "s"
    }
    static cacheGroup(e) {
        for (const [t, a] of Object.entries(e))
            GroupUtil.CACHE[t] || (GroupUtil.CACHE[t] = new Map),
                a.forEach(e => GroupUtil.CACHE[t].set(e.id, e))
    }
    static loadGroupModel(e) {
        return GroupUtil.getGroup(e).then(e => (Model.DATA.get(VIEW.GROUP).get(VIEW_DATA.VAR).group = e,
            Model.DATA.get(VIEW.GROUP).get(VIEW_DATA.SEARCH).clans = e.clans,
            e))
    }
    static updateGroup(e, t) {
        t.querySelectorAll("section").forEach(e => e.classList.add("d-none")),
            e.characters && e.characters.length > 0 && GroupUtil.updateGroupSection(t => CharacterUtil.updateCharacters(t, e.characters), t.querySelector(":scope .table-character")),
            e.clans && e.clans.length > 0 && GroupUtil.updateGroupSection(t => ClanUtil.updateClanTable(t, e.clans), t.querySelector(":scope .table-clan")),
            e.proPlayers && e.proPlayers.length > 0 && GroupUtil.updateGroupSection(t => ElementUtil.updateGenericContainer(t, e.proPlayers.map(CharacterUtil.renderLadderProPlayerGroupLink)), t.querySelector(":scope .players")),
            e.accounts && e.accounts.length > 0 && GroupUtil.updateGroupSection(t => ElementUtil.updateGenericContainer(t, e.accounts.map(CharacterUtil.createAccountGroupLink)), t.querySelector(":scope .accounts"))
    }
    static updateGroupSection(e, t) {
        e(t),
            t.closest("section").classList.remove("d-none")
    }
    static createHeaderText(e) {
        let t;
        e.clans && e.clans.length > 0 ? t = ClanUtil.generateClanName(e.clans[0], !0) : e.proPlayers && e.proPlayers.length > 0 ? t = CharacterUtil.renderLadderProPlayer(e.proPlayers[0]) : e.accounts && e.accounts.length > 0 ? t = CharacterUtil.renderAccount(e.accounts[0]) : e.characters && e.characters.length > 0 && (t = Util.unmaskName(e.characters[0].members).unmaskedName);
        const a = (e.clans && e.clans.length || 0) + (e.proPlayers && e.proPlayers.length || 0) + (e.accounts && e.accounts.length || 0) + (e.characters && e.characters.length || 0) - 1;
        return a > 0 && (t += "(+".concat(a, ")")),
            t
    }
    static generatePageTitle(e, t) {
        const a = Model.DATA.get(VIEW.GROUP).get(VIEW_DATA.VAR);
        return a && a.group ? GroupUtil.createHeaderText(a.group) + " - " + ElementUtil.getTabTitle(t) : "Group"
    }
    static updateRequiredMetadata(e, t) {
        return GroupUtil.loadGroupModel(e).then(e => {
            GroupUtil.updateGroup(e, t.querySelector(":scope .character-group")),
                t.querySelector(":scope .modal-title").textContent = GroupUtil.createHeaderText(e)
        }
        )
    }
    static getTeams(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/character-teams?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse)
    }
    static createTeamParams(e, t, a) {
        const r = new URLSearchParams(e);
        return r.append("queue", t),
            r.append("season", a),
            r
    }
    static updateTeamModel(e, t) {
        return GroupUtil.getTeams(t).then(t => {
            Model.DATA.get(e).get(VIEW_DATA.SEARCH).teams = t;
            const a = Model.DATA.get(e).get(VIEW_DATA.TEAMS);
            return a.result = a.result ? a.result.concat(t) : t,
                t
        }
        )
    }
    static updateTeamView(e) {
        const t = ViewUtil.getView(e)
            , a = Model.DATA.get(t).get(VIEW_DATA.SEARCH).teams;
        TeamUtil.updateTeamsTable(e.querySelector(":scope .table-team"), {
            result: a || []
        })
    }
    static updateTeams(e, t, a) {
        const r = ViewUtil.getView(e)
            , n = Model.DATA.get(r).get(VIEW_DATA.VAR)
            , o = GroupUtil.createTeamParams(n.groupParams, t, a)
            , l = e.querySelector(":scope .group-teams");
        return GroupUtil.updateTeamModel(r, o).then(e => (GroupUtil.updateTeamView(l),
        {
            data: e,
            status: LOADING_STATUS.COMPLETE
        }))
    }
    static resetTeams(e) {
        Util.resetLoadingIndicator(e);
        const t = ViewUtil.getView(e);
        Model.DATA.get(t).get(VIEW_DATA.SEARCH).teams = [],
            ElementUtil.removeChildren(e.querySelector(":scope .teams tbody"))
    }
    static getCharacters(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/characters?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(t)).then(e => Session.verifyJsonResponse(e, [200, 404]))
    }
    static updateCharacters(e, t) {
        const a = t.querySelector(":scope .group-characters");
        return Util.load(a, () => GroupUtil.getCharacters(e).then(e => {
            const r = ViewUtil.getView(t);
            return Model.DATA.get(r).get(VIEW_DATA.SEARCH).characters = e,
                CharacterUtil.updateCharacters(a.querySelector(":scope .table-character"), e),
            {
                data: e,
                status: LOADING_STATUS.COMPLETE
            }
        }
        ))
    }
    static getMatches(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/character-matches?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse)
    }
    static createMatchesParams(e, t, a) {
        var r;
        const n = new URLSearchParams(t.groupParams);
        if ((null == e || null === (r = e.result) || void 0 === r ? void 0 : r.length) > 0) {
            var o;
            const a = null === (o = e.navigation) || void 0 === o ? void 0 : o[NAVIGATION_DIRECTION.FORWARD.relativePosition];
            null != a && n.append(NAVIGATION_DIRECTION.FORWARD.relativePosition, a),
                t.matchType && n.append("type", t.matchType)
        } else
            "all" != a && (t.matchType = a,
                n.append("type", a));
        return n
    }
    static updateMatches(e, t) {
        const a = ViewUtil.getView(e)
            , r = e.querySelector(":scope .group-matches")
            , n = Model.DATA.get(a).get(VIEW_DATA.SEARCH).matches
            , o = Model.DATA.get(a).get(VIEW_DATA.VAR)
            , l = GroupUtil.createMatchesParams(n, o, t);
        return GroupUtil.getMatches(l).then(e => 0 == e.result.length ? {
            status: LOADING_STATUS.COMPLETE
        } : (null != n ? (n.result = n.result.concat(e.result),
            n.navigation = e.navigation) : Model.DATA.get(a).get(VIEW_DATA.SEARCH).matches = e,
            GroupUtil.updateMatchesView(r, e.result),
        {
            data: e,
            status: null == e.navigation[NAVIGATION_DIRECTION.FORWARD.relativePosition] ? LOADING_STATUS.COMPLETE : LOADING_STATUS.NONE
        }))
    }
    static updateMatchesView(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const r = ViewUtil.getView(e)
            , n = Model.DATA.get(r).get(VIEW_DATA.VAR)
            , o = MatchUtil.updateMatchTable(e.querySelector(":scope .matches"), t, e => GroupUtil.isMainMatchParticipant(e, n.groupParams), "false" != localStorage.getItem("matches-historical-mmr-" + r.name), null, a)
            , l = Model.DATA.get(r).get(VIEW_DATA.TEAMS);
        l.result = a ? o.teams : l.result ? l.result.concat(o.teams) : o.teams
    }
    static isMainMatchParticipant(e, t) {
        return !Number.isInteger(e) && (e.member.clan && e.member.clan.id && t.getAll("clanId").some(t => e.member.clan.id == t) || t.getAll("characterId").some(t => e.member.character.id == t))
    }
    static resetMatches(e) {
        Util.resetLoadingIndicator(e);
        const t = ViewUtil.getView(e);
        ElementUtil.removeChildren(e.querySelector(":scope .matches tbody")),
            Model.DATA.get(t).get(VIEW_DATA.SEARCH).matches = []
    }
    static getClanHistory(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/clan-histories?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(t)).then(Session.verifyJsonResponse)
    }
    static createClanHistoryParams(e, t) {
        var a;
        const r = new URLSearchParams(t.groupParams)
            , n = null == e || null === (a = e.navigation) || void 0 === a ? void 0 : a[NAVIGATION_DIRECTION.FORWARD.relativePosition];
        return null != n && r.append(NAVIGATION_DIRECTION.FORWARD.relativePosition, n),
            r
    }
    static updateClanHistory(e) {
        const t = ViewUtil.getView(e)
            , a = e.querySelector(":scope .group-clan")
            , r = Model.DATA.get(t).get(VIEW_DATA.SEARCH)
            , n = Model.DATA.get(t).get(VIEW_DATA.VAR)
            , o = GroupUtil.createClanHistoryParams(r.clanHistory, n);
        return GroupUtil.getClanHistory(o).then(e => null == e.result ? {
            status: LOADING_STATUS.COMPLETE
        } : (GroupUtil.mapClanHistory(e.result),
            null != r.clanHistory ? (r.clanHistory.result = Util.addAllCollections(e.result, r.clanHistory.result),
                r.clanHistory.navigation = e.navigation) : r.clanHistory = e,
            ClanUtil.updateClanHistoryTable(a.querySelector(":scope .clan-history"), e.result),
        {
            data: e,
            status: null == e.navigation[NAVIGATION_DIRECTION.FORWARD.relativePosition] ? LOADING_STATUS.COMPLETE : LOADING_STATUS.NONE
        }))
    }
    static mapClanHistory(e) {
        e.clans = Util.toMap(e.clans, e => e.id),
            e.characters = Util.toMap(e.characters, e => e.members.character.id)
    }
    static getLinks(e) {
        const t = "".concat(ROOT_CONTEXT_PATH, "api/character-links?").concat(e.toString());
        return Session.beforeRequest().then(e => fetch(t)).then(e => Session.verifyJsonResponse(e, [200, 500]))
    }
    static resetLinksView(e) {
        ElementUtil.removeChildren(e.querySelector(":scope .links"))
    }
    static resetLinksModel(e) {
        var t;
        null === (t = Model.DATA.get(e).get(VIEW_DATA.SEARCH)) || void 0 === t || delete t.links
    }
    static resetLinks(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        GroupUtil.resetLinksModel(ViewUtil.getView(e)),
            GroupUtil.resetLinksView(e),
            t && Util.resetLoadingIndicatorTree(e.querySelector(":scope .group-links"))
    }
    static groupLinkData(e, t) {
        const a = e.flatMap(e => e.failedTypes).length > 0;
        return {
            type: t,
            failed: a,
            status: a ? LOADING_STATUS.ERROR : LOADING_STATUS.COMPLETE,
            links: e.flatMap(e => e.links)
        }
    }
    static calculateMissingCharacters(e, t, a) {
        const r = new Set(e.filter(e => e.links.length > 0).map(e => e.playerCharacterId));
        return {
            missing: a.filter(e => !r.has(e.members.character.id)),
            excluded: t.slice(a.length)
        }
    }
    static renderLinkErrors(e) {
        const t = ElementUtil.createElement("ul", null, "errors mx-auto text-danger");
        for (const a of e)
            for (const e of a.errors)
                t.appendChild(ElementUtil.createElement("li", null, a.type.name + " error", a.type.name + ": " + e));
        return t
    }
    static renderMissingLinkCharacters(e, t, a, r) {
        const n = ElementUtil.createElement("h4", null, "text-warning", t + " ")
            , o = ElementUtil.createIcoFontElement("info", a, "text-primary", [["data-toggle", "tooltip"]]);
        n.appendChild(o);
        const l = CharacterUtil.renderCharacters(e, n);
        return null != r && l.classList.add(...r),
            l
    }
    static updateLinksView(e) {
        var t;
        const a = ViewUtil.getView(e)
            , r = null === (t = Model.DATA.get(a).get(VIEW_DATA.SEARCH).links) || void 0 === t ? void 0 : t.data;
        if (!r)
            return;
        const n = e.querySelector(".links")
            , o = ElementUtil.createElement("div", null, "container-links d-flex flex-center-wrap-gap");
        n.appendChild(o),
            n.appendChild(ElementUtil.createElement("div", null, "c-divider-hr my-0")),
            r.map(e => e.errors.length).reduce((e, t) => e + t, 0) > 0 && n.appendChild(GroupUtil.renderLinkErrors(r));
        for (const e of r) {
            var l, s;
            if (null == e.data)
                continue;
            const t = ElementUtil.createElement("a", null, "social-media", null, [["href", e.data], ["target", "_blank"], ["rel", "noopener"]]);
            t.appendChild(ElementUtil.createImage("logo/", e.type.name, "", null, null, "png")),
                o.appendChild(t),
                0 != (null === (l = e.missing) || void 0 === l || null === (l = l.missing) || void 0 === l ? void 0 : l.length) && n.appendChild(GroupUtil.renderMissingLinkCharacters(e.missing.missing, "Missing " + e.type.name + " characters", "Profiles that don't exist on " + e.type.name, ["missing", e.type.name])),
                0 != (null === (s = e.missing) || void 0 === s || null === (s = s.excluded) || void 0 === s ? void 0 : s.length) && n.appendChild(GroupUtil.renderMissingLinkCharacters(e.missing.excluded, "Excluded " + e.type.name + " characters", "Inactive profiles(based on 1v1 stats) that have been excluded to meet the " + e.type.name + " group limit(" + GroupUtil.LINK_OPERATIONS.get(e.type).activeCharactersMax + ")", ["excluded", e.type.name]))
        }
    }
    static loadCharacterLinks(e, t) {
        const a = new URLSearchParams;
        return a.append("type", t.fullName),
            e.forEach(e => a.append("characterId", e.members.character.id)),
            GroupUtil.getLinks(a)
    }
    static getActiveCharacters(e, t) {
        return -1 === t || e.length <= t ? e : null == e[t].currentStats.rating && null == e[t].previousStats.rating ? e.slice(0, t) : null
    }
    static getLinksFromCharacters(e, t) {
        const a = GroupUtil.LINK_OPERATIONS.get(t)
            , r = GroupUtil.getActiveCharacters(e, a.activeCharactersMax);
        return null == r ? {
            errors: ["Active profile limit exceeded(" + (e.findLastIndex(e => null != e.currentStats.rating || null != e.previousStats.rating) + 1 || e.length) + "/" + a.activeCharactersMax + ")"],
            status: LOADING_STATUS.ERROR,
            type: t
        } : a.load(r).then(n => {
            const o = GroupUtil.groupLinkData(n, t);
            return o.missing = GroupUtil.calculateMissingCharacters(n, e, r),
                o.errors = [],
                a.generate(o)
        }
        )
    }
    static updateLinks(e) {
        GroupUtil.resetLinks(e);
        const t = ViewUtil.getView(e)
            , a = Model.DATA.get(t).get(VIEW_DATA.VAR);
        return GroupUtil.updateCharacters(a.groupParams, e).then(e => {
            const a = Model.DATA.get(t).get(VIEW_DATA.SEARCH).characters;
            if (null == a || 0 == a.length) {
                const e = new Error("No characters found");
                throw e.characterStatus = LOADING_STATUS.COMPLETE,
                e
            }
            const r = Array.from(a);
            return r.sort((e, t) => t.currentStats.gamesPlayed - e.currentStats.gamesPlayed || t.previousStats.gamesPlayed - e.previousStats.gamesPlayed || t.totalGamesPlayed - e.totalGamesPlayed),
                Promise.allSettled(Array.from(GroupUtil.LINK_OPERATIONS.keys()).map(e => GroupUtil.getLinksFromCharacters(r, e)))
        }
        ).then(a => {
            const r = {
                data: a.map(e => e.value),
                status: a.map(e => {
                    var t;
                    return null === (t = e.value) || void 0 === t ? void 0 : t.status
                }
                ).some(e => e == LOADING_STATUS.ERROR) || Util.getAllSettledLoadingStatus(a) == LOADING_STATUS.ERROR ? LOADING_STATUS.ERROR : LOADING_STATUS.COMPLETE
            };
            return Model.DATA.get(t).get(VIEW_DATA.SEARCH).links = r,
                GroupUtil.updateLinksView(e),
                Util.throwFirstSettledError(a),
                r
        }
        ).catch(e => {
            if (null != e.characterStatus)
                return {
                    data: null,
                    status: e.characterStatus
                };
            throw e
        }
        )
    }
    static enqueueUpdateLinks() {
        const e = document.querySelector("#group")
            , t = e.querySelector("#group-links");
        return Util.load(t, () => GroupUtil.updateLinks(e))
    }
    static loadAndShowGroup(e) {
        document.querySelectorAll("#group .container-loading").forEach(e => ElementUtil.executeTask(e.id, () => e.querySelectorAll(":scope tbody").forEach(ElementUtil.removeChildren)));
        const t = e instanceof URLSearchParams ? e : Util.mapToUrlSearchParams(e)
            , a = GroupUtil.fullUrlSearchParams(t);
        Model.DATA.get(VIEW.GROUP).set(VIEW_DATA.VAR, {
            groupParams: t,
            fullGroupParams: a
        }),
            Model.reset(VIEW.GROUP, [VIEW_DATA.SEARCH, VIEW_DATA.TEAMS]),
            document.querySelectorAll("#group .container-loading").forEach(Util.resetLoadingIndicator);
        const r = document.querySelector("#group");
        return Util.setGeneratingStatus(STATUS.BEGIN),
            GroupUtil.updateRequiredMetadata(t, r).then(e => {
                BootstrapUtil.showModal("group"),
                    Util.setGeneratingStatus(STATUS.SUCCESS);
                const t = a.toString();
                Session.isHistorical || HistoryUtil.pushState({}, document.title, "?" + t + "#group-group"),
                    Session.currentSearchParams = t
            }
            ).catch(e => Session.onPersonalException(e))
    }
    static fullUrlSearchParams(e) {
        const t = new URLSearchParams;
        return t.append("type", "group"),
            t.append("m", "1"),
            new URLSearchParams("?" + t.toString() + "&" + e.toString())
    }
    static onGroupLinkClick(e) {
        return e.preventDefault(),
            GroupUtil.loadAndShowGroup(Util.deleteSearchParams(Util.getHrefUrlSearchParams(e.target.closest("a"))))
    }
    static createGroupLink(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : ""
            , a = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        const r = document.createElement("a");
        r.textContent = t;
        const n = GroupUtil.fullUrlSearchParams(e);
        return r.setAttribute("href", "".concat(ROOT_CONTEXT_PATH, "?").concat(n.toString(), "#group-group")),
            a ? r.addEventListener("click", GroupUtil.onGroupLinkClick) : r.setAttribute("target", "_blank"),
            r
    }
    static enhance() {
        GroupUtil.enhanceMisc(),
            GroupUtil.enhanceTeams(),
            ElementUtil.ELEMENT_TASKS.set("group-characters-tab", e => GroupUtil.updateCharacters(Model.DATA.get(VIEW.GROUP).get(VIEW_DATA.VAR).groupParams, document.querySelector("#group"))),
            GroupUtil.enhanceMatches(),
            GroupUtil.enhanceClanHistory(),
            GroupUtil.enhanceLinks()
    }
    static enhanceMisc() {
        document.querySelectorAll(".group-link").forEach(e => e.addEventListener("click", GroupUtil.onGroupLinkClick))
    }
    static updateGroupTeams() {
        const e = document.querySelector("#group")
            , t = e.querySelector(":scope .group-teams")
            , a = new FormData(document.querySelector("#group-teams-form"));
        return Util.load(t, () => GroupUtil.updateTeams(e, a.get("queue"), a.get("season")))
    }
    static enhanceTeams() {
        ElementUtil.ELEMENT_TASKS.set("group-teams-tab", GroupUtil.updateGroupTeams),
            document.querySelectorAll("#group-teams-form .form-control").forEach(e => e.addEventListener("change", e => {
                const t = e.target.closest(".group-teams");
                ElementUtil.executeTask(t.id, () => {
                    GroupUtil.resetTeams(t),
                        GroupUtil.updateGroupTeams()
                }
                )
            }
            ))
    }
    static enhanceMatches() {
        const e = document.querySelector("#group")
            , t = e.querySelector(":scope .group-matches");
        ElementUtil.infiniteScroll(document.querySelector("#group .group-matches .container-indicator-loading-default"), () => Util.load(t, e => GroupUtil.updateMatches(document.querySelector("#group"), localStorage.getItem("matches-type-group") || "all"))),
            document.querySelector("#matches-historical-mmr-group").addEventListener("change", e => window.setTimeout(e => GroupUtil.updateMatchesView(t, Model.DATA.get(VIEW.GROUP).get(VIEW_DATA.SEARCH).matches, !0), 1)),
            document.querySelector("#matches-type-group").addEventListener("change", a => window.setTimeout(a => {
                ElementUtil.executeTask(t.id, () => {
                    GroupUtil.resetMatches(t),
                        Util.load(t, () => GroupUtil.updateMatches(e, localStorage.getItem("matches-type-group") || "all"))
                }
                )
            }
                , 1))
    }
    static enhanceClanHistory() {
        ElementUtil.infiniteScroll(document.querySelector("#group .group-clan .container-indicator-loading-default"), () => Util.load(document.querySelector("#group .group-clan"), e => GroupUtil.updateClanHistory(document.querySelector("#group"))))
    }
    static enhanceLinks() {
        ElementUtil.ELEMENT_TASKS.set("group-links-tab", GroupUtil.enqueueUpdateLinks)
    }
}
GroupUtil.CACHE = {},
    GroupUtil.PARAMETER_KEYS = new Set(["characterId", "accountId", "proPlayerId", "clanId"]),
    GroupUtil.LINK_OPERATIONS = new Map([[SOCIAL_MEDIA.REPLAY_STATS, {
        activeCharactersMax: 20,
        load: e => GroupUtil.loadCharacterLinks(e, SOCIAL_MEDIA.REPLAY_STATS),
        generate: e => {
            var t;
            if (e.failed || 0 == (null == e || null === (t = e.links) || void 0 === t ? void 0 : t.length))
                return e;
            const a = e.links.map(e => encodeURIComponent(e.relativeUrl));
            return a.sort(),
                e.data = SOCIAL_MEDIA.REPLAY_STATS.baseUserUrl + "/" + a.join(","),
                e
        }
    }]]);
class CommunityUtil {
    static enhance() {
        CommunityUtil.enhanceStreams()
    }
    static enhanceStreams() {
        const e = new IntervalExecutor(() => (ElementUtil.setLoadingIndicator(document.querySelector("#search-stream"), LOADING_STATUS.NONE),
            Util.load(document.querySelector("#search-stream"), () => CommunityUtil.updateStreams())), () => "#search-stream" == window.location.hash, 6e4, 3);
        CommunityUtil.STREAM_UPDATER = e,
            ElementUtil.DOCUMENT_VISIBILITY_TASKS.set("#search-stream", t => {
                t ? e.executeAndReschedule() : e.stop()
            }
            ),
            ElementUtil.ELEMENT_TASKS.set("search-stream-tab", e.executeAndReschedule.bind(e)),
            CommunityUtil.enhanceStreamFilters("#stream-filters", CommunityUtil.STREAM_UPDATER.executeAndReschedule.bind(CommunityUtil.STREAM_UPDATER))
    }
    static enhanceFeaturedStreams() {
        const e = new IntervalExecutor(CommunityUtil.updateFeaturedStreams, () => !document.hidden, 6e4, 3);
        CommunityUtil.FEATURED_STREAM_UPDATER = e,
            e.executeAndReschedule(),
            document.addEventListener("visibilitychange", () => {
                document.hidden ? e.stop() : e.executeAndReschedule()
            }
            ),
            CommunityUtil.enhanceStreamFilters("#stream-filters-featured", CommunityUtil.FEATURED_STREAM_UPDATER.executeAndReschedule.bind(CommunityUtil.FEATURED_STREAM_UPDATER))
    }
    static enhanceStreamFilters(e, t) {
        document.querySelectorAll(e + " .stream-filter-ctl").forEach(e => e.addEventListener("SELECT" == e.tagName ? "change" : "click", e => window.setTimeout(t, 1))),
            document.querySelectorAll(e + " .ctl-delay").forEach(e => e.addEventListener("input", e => ElementUtil.clearAndSetInputTimeout(e.target.id, t))),
            document.querySelectorAll(e).forEach(e => e.addEventListener("submit", e => e.preventDefault()))
    }
    static updateAllStreams() {
        CommunityUtil.STREAM_UPDATER && CommunityUtil.STREAM_UPDATER.executeAndReschedule(),
            CommunityUtil.FEATURED_STREAM_UPDATER && CommunityUtil.FEATURED_STREAM_UPDATER.executeAndReschedule()
    }
    static updateFeaturedStreams() {
        return CommunityUtil.getStreams(CommunityUtil.getStreamServices("-featured"), null != localStorage.getItem("stream-sort-by-featured") ? SortParameter.fromPrefixedString(localStorage.getItem("stream-sort-by-featured")) : CommunityUtil.DEFAULT_FEATURED_STREAM_SORT, localStorage.getItem("stream-identified-only-featured") || "true", CommunityUtil.getStreamRaces("-featured"), "false" === localStorage.getItem("stream-language-preferred-featured") ? null : Util.getPreferredLanguages(), CommunityUtil.getStreamTeamFormats("-featured"), localStorage.getItem("stream-rating-min-featured"), localStorage.getItem("stream-rating-max-featured"), localStorage.getItem("stream-limit-player-featured") || 5, localStorage.getItem("stream-lax-featured") || "false").then(e => {
            e.streams = CommunityUtil.filterSecondaryPlayerStreams(e.streams),
                CommunityUtil.updateFeaturedStreamView(e)
        }
        )
    }
    static filterSecondaryPlayerStreams(e) {
        const t = new Set;
        return e.filter(e => null == e.proPlayer || !t.has(e.proPlayer.proPlayer.id) && (t.add(e.proPlayer.proPlayer.id),
            !0))
    }
    static createStreamUrlParameters(e, t, a, r, n, o, l, s, i, c) {
        const d = new URLSearchParams;
        return null != e && e.forEach(e => d.append("service", e)),
            null != t && d.append("sort", t.toPrefixedString()),
            null != a && d.append("identifiedOnly", a),
            null != r && r.forEach(e => d.append("race", e.fullName)),
            null != n && n.forEach(e => d.append("language", e)),
            null != o && o.forEach(e => d.append("teamFormat", e.formatName)),
            null != l && d.append("ratingMin", l),
            null != s && d.append("ratingMax", s),
            null != i && d.append("limitPlayer", i),
            null != c && d.append("lax", c),
            d
    }
    static getStreamServices() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "";
        return STREAM_SERVICES.filter(t => "false" !== localStorage.getItem("stream-service-" + t + e))
    }
    static getStreamRaces() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "";
        return Object.values(RACE).filter(t => "false" !== localStorage.getItem("stream-race-" + t.fullName + e))
    }
    static getStreamTeamFormats() {
        let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "";
        const t = localStorage.getItem("stream-team-format" + e) || "all";
        return "all" === t ? Object.values(TEAM_FORMAT) : EnumUtil.enumOfName(t, TEAM_FORMAT_TYPE).teamFormats
    }
    static getStreams(e, t, a, r, n, o, l, s, i, c) {
        const d = CommunityUtil.createStreamUrlParameters(e, t, a, r, n, o, l, s, i, c);
        return Session.beforeRequest().then(e => fetch("".concat(ROOT_CONTEXT_PATH, "api/streams?").concat(d.toString()))).then(e => Session.verifyJsonResponse(e, [200, 500]))
    }
    static updateStreamModel(e, t, a, r, n, o, l, s, i, c) {
        return CommunityUtil.getStreams(e, t, a, r, n, o, l, s, i, c).then(e => (Model.DATA.get(VIEW.STREAM_SEARCH).set(VIEW_DATA.SEARCH, e),
        {
            data: e,
            status: 0 == e.errors.length ? LOADING_STATUS.COMPLETE : LOADING_STATUS.ERROR
        }))
    }
    static updateStreamView() {
        const e = Model.DATA.get(VIEW.STREAM_SEARCH).get(VIEW_DATA.SEARCH);
        return CommunityUtil.updateStreamContainer(e, document.querySelector("#search-stream .streams")),
        {
            data: e,
            status: 0 == e.errors.length ? LOADING_STATUS.COMPLETE : LOADING_STATUS.ERROR
        }
    }
    static updateStreams() {
        return FormUtil.verifyForm(document.querySelector("#stream-filters"), document.querySelector("#search-stream .error-out")) ? CommunityUtil.updateStreamModel(CommunityUtil.getStreamServices(), null != localStorage.getItem("stream-sort-by") ? SortParameter.fromPrefixedString(localStorage.getItem("stream-sort-by")) : CommunityUtil.DEFAULT_STREAM_SORT, localStorage.getItem("stream-identified-only") || "false", CommunityUtil.getStreamRaces(), "true" === localStorage.getItem("stream-language-preferred") ? Util.getPreferredLanguages() : null, CommunityUtil.getStreamTeamFormats(), localStorage.getItem("stream-rating-min"), localStorage.getItem("stream-rating-max"), localStorage.getItem("stream-limit-player"), localStorage.getItem("stream-lax") || "true").then(CommunityUtil.updateStreamView) : Promise.resolve({
            data: null,
            status: LOADING_STATUS.COMPLETE
        })
    }
    static updateFeaturedStreamView(e) {
        document.querySelectorAll(".streams-featured").forEach(t => CommunityUtil.updateStreamContainer(e, t, !0))
    }
    static updateStreamContainer(e, t) {
        let a = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        if ((!(arguments.length > 3 && void 0 !== arguments[3]) || arguments[3]) && ElementUtil.removeChildren(t),
            e.streams)
            for (const r of e.streams)
                t.appendChild(CommunityUtil.renderStream(r, a))
    }
    static renderStream(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const a = ElementUtil.createElement("article", "stream-" + e.stream.service + "-" + e.stream.id, "stream")
            , r = ElementUtil.createElement("a", null, "unstyled" + (t && null != e.featured ? " analytics-featured-" + e.featured.toLowerCase() : ""), null, [["href", e.stream.url], ["target", "_blank"]]);
        return r.appendChild(CommunityUtil.renderStreamThumbnail(e)),
            r.appendChild(CommunityUtil.renderStreamBody(e, t)),
            a.appendChild(r),
            a
    }
    static renderStreamBody(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const a = ElementUtil.createElement("div", null, "body d-flex");
        a.appendChild(CommunityUtil.renderStreamProfile(e));
        const r = ElementUtil.createElement("div", null, "body-text");
        return r.appendChild(CommunityUtil.renderStreamHeader(e)),
            r.appendChild(CommunityUtil.renderStreamMetaData(e, t)),
            a.appendChild(r),
            a
    }
    static renderStreamHeader(e) {
        const t = ElementUtil.createElement("header");
        return t.appendChild(CommunityUtil.renderStreamTitle(e)),
            t.appendChild(CommunityUtil.renderStreamStreamer(e)),
            t.appendChild(ElementUtil.createElement("div", null, "viewers", e.stream.viewerCount, [["title", "viewers"]])),
            t
    }
    static renderStreamTitle(e) {
        return ElementUtil.createElement("h4", null, "title font-weight-bold text-truncate", e.stream.title, [["title", e.stream.title]])
    }
    static renderStreamThumbnail(e) {
        return CommunityUtil.addRegionalCdnAttributes(e, ElementUtil.addLoadClassWatcher(ElementUtil.createElement("img", null, "thumbnail", null, [["loading", "lazy"], ["src", e.stream.thumbnailUrl], ["alt", "Stream preview"]])))
    }
    static renderStreamProfile(e) {
        return e.stream.profileImageUrl ? CommunityUtil.addRegionalCdnAttributes(e, ElementUtil.addLoadClassWatcher(ElementUtil.createElement("img", null, "profile", null, [["loading", "lazy"], ["src", e.stream.profileImageUrl], ["alt", "Profile img"]]))) : ElementUtil.createElement("span", null, "profile c-empty", null, [["title", "No profile image"]])
    }
    static addRegionalCdnAttributes(e, t) {
        return "BILIBILI" == e.stream.service && t.setAttribute("referrerpolicy", "same-origin"),
            t
    }
    static renderStreamStreamer(e) {
        const t = e.proPlayer ? CharacterUtil.renderLadderProPlayer(e.proPlayer) : e.stream.userName;
        return ElementUtil.createElement("address", null, "streamer text-truncate", t, [["title", t]])
    }
    static renderStreamMetaData(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const a = ElementUtil.createElement("footer", null, "meta");
        null != e.team && a.appendChild(CommunityUtil.renderStreamTeamLink(e));
        const r = ElementUtil.createElement("div", null, "tags");
        if (r.appendChild(ElementUtil.createElement("div", null, "service icofont-" + e.stream.service.toLowerCase(), null, [["title", e.stream.service]])),
            null != e.stream.language) {
            const t = Util.LANGUAGE_NAMES.of(e.stream.language);
            r.appendChild(ElementUtil.createElement("div", null, "language language-code text-secondary", e.stream.language, [["title", t]])),
                r.appendChild(ElementUtil.createElement("div", null, "language language-name text-secondary", t, [["title", "language"]]))
        }
        return t && null != e.featured && r.appendChild(ElementUtil.createElement("div", null, "featured text-info", e.featured)),
            a.appendChild(r),
            a
    }
    static renderStreamTeamLink(e) {
        const t = TeamUtil.getTeamMmrHistoryHref([e.team])
            , a = ElementUtil.createElement("a", null, "unstyled team-link", null, [["href", t], ["target", "_blank"]]);
        return a.appendChild(CommunityUtil.renderStreamTeam(e)),
            a
    }
    static renderStreamTeam(e) {
        const t = e.team;
        if (!t)
            return null;
        const a = ElementUtil.createElement("div", null, "team d-flex flex-wrap-gap-05 align-items-center container-m-0" + (null == t.lastPlayed || Date.now() - Util.parseIsoDateTime(t.lastPlayed).getTime() > CURRENT_FEATURED_TEAM_MAX_DURATION_OFFSET ? " text-secondary" : ""))
            , r = ElementUtil.createElement("span", null, "format", EnumUtil.enumOfId(t.queueType, TEAM_FORMAT).name)
            , n = ElementUtil.createImage("flag/", t.region.toLowerCase(), "table-image-long")
            , o = TeamUtil.createLeagueDiv(t);
        o.classList.add("d-flex", "flex-wrap-gap-05", "align-items-center");
        const l = t.members.find(t => t.proNickname == e.proPlayer.proPlayer.nickname)
            , s = TeamUtil.createRacesElem(l)
            , i = ElementUtil.createElement("span", null, "mmr", t.rating + " MMR");
        return a.appendChild(r),
            a.appendChild(n),
            a.appendChild(o),
            a.appendChild(s),
            a.appendChild(i),
            a
    }
}
CommunityUtil.DEFAULT_STREAM_SORT = new SortParameter("rating", SORTING_ORDER.DESC),
    CommunityUtil.DEFAULT_FEATURED_STREAM_SORT = new SortParameter("topPercentRegion", SORTING_ORDER.DESC);
class MatrixUI {
    constructor(e, t, a, r) {
        let n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : THEME.LIGHT
            , o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : null
            , l = arguments.length > 6 && void 0 !== arguments[6] ? arguments[6] : (e, t) => t;
        this.id = e,
            this.data = t,
            this.mainParameter = a,
            this.renderParameters = r,
            this.afterValueMutation = o,
            this.toStringConverter = l,
            this.highlightMidPoint = 0,
            this.theme = n,
            this.useDataColors = !0,
            this.series = null,
            this.categories = null,
            this.cells = null,
            this.node = null,
            this.afterDataProcessing = null,
            MatrixUI.OBJECTS.set(e, this)
    }
    static getCellType(e, t) {
        return 0 == e ? 0 == t ? CELL_TYPE.SUMMARY_CELL : CELL_TYPE.SUMMARY_ROW : 0 == t ? CELL_TYPE.SUMMARY_COLUMN : CELL_TYPE.DATA
    }
    static calculateHighlightRange(e, t, a, r, n) {
        const o = r.map(e => e[n])
            , l = {
                min: null != e ? e : Math.min(...o),
                mid: t,
                max: null != a ? a : Math.max(...o)
            };
        return l.minSize = l.mid - l.min,
            l.maxSize = l.max - l.mid,
            l
    }
    setTheme(e) {
        this.theme = e
    }
    setSeriesComparator(e) {
        this.seriesComparator = e
    }
    setUseDataColors(e) {
        this.useDataColors = e
    }
    setAfterDataProcessing(e) {
        this.afterDataProcessing = e
    }
    getCategories() {
        return null == this.categories && (this.categories = this.processCategories()),
            this.categories
    }
    processCategories() {
        const e = new Map;
        return e.set("Total", 0),
            [...new Set(this.data.flatMap(e => e.values).map(e => e.category))].sort().forEach((t, a) => e.set(t, a + 1)),
            e
    }
    getSeries() {
        return null == this.series && (this.series = this.processSeries()),
            this.series
    }
    processSeries() {
        const e = new Map;
        return e.set("Total", 0),
            this.data.map(e => e.name).forEach((t, a) => e.set(t, a + 1)),
            e
    }
    getSummaryCell() {
        return this.cells ? [this.cells[0][0]] : null
    }
    getSummaryRow() {
        return this.cells ? this.cells[0].slice(1, this.cells[0].length) : null
    }
    getSummaryColumns() {
        return this.cells ? this.cells.slice(1, this.cells.length).map(e => e[0]) : null
    }
    getDataCells() {
        return this.cells ? this.cells.slice(1, this.cells.length).map(e => e.slice(1, e.length)).flat(1) : null
    }
    getCells(e) {
        return null == e ? this.cells : e.getCells(this)
    }
    processCells() {
        const e = this.getSeries()
            , t = this.getCategories()
            , a = new Array(e.size)
            , r = Util.emptyClone(this.data[0].values[0].value);
        for (const n of this.data) {
            const o = e.get(n.name);
            a[o] = new Array(t.size),
                a[o][0] = r;
            for (const e of n.values)
                a[o][t.get(e.category)] = e.value
        }
        return a[0] = this.processSeriesSummaryCells(a),
            this.processCategorySummaryCells(a),
            a
    }
    processSeriesSummaryCells(e) {
        const t = new Array(e[1].length);
        for (let a = 0; a < t.length; a++) {
            const r = Util.addObjects(e.map(e => e[a]).filter(e => null != e));
            null != this.afterValueMutation && this.afterValueMutation(r),
                t[a] = r
        }
        return t
    }
    processCategorySummaryCells(e) {
        for (let t = 0; t < e.length; t++) {
            const a = Util.addObjects(e[t].filter(e => null != e));
            null != this.afterValueMutation && this.afterValueMutation(a),
                e[t][0] = a
        }
    }
    processData() {
        null == this.cells && (this.cells = this.processCells(),
            this.afterDataProcessing && this.afterDataProcessing())
    }
    clear() {
        this.cells = null,
            this.clearNode()
    }
    render() {
        this.processData();
        const e = this.getSeries()
            , t = this.getCategories()
            , a = [""].concat(Array.from(t.keys()))
            , r = TableUtil.createTable(a)
            , n = r.querySelector(":scope table");
        n.className = "",
            n.classList.add("matrix", "sticky", "mx-auto");
        const o = r.querySelector(":scope tbody")
            , l = Array.from(e.keys());
        for (let e = 0; e < l.length; e++) {
            const t = this.cells[e]
                , a = document.createElement("tr");
            TableUtil.createRowTh(a).textContent = l[e];
            for (const e of t) {
                const t = document.createElement("td");
                if (e)
                    for (const a of this.renderParameters)
                        t.appendChild(ElementUtil.createElement("div", null, "parameter", this.toStringConverter(a, e[a]), [["data-parameter-name", a]]));
                a.appendChild(t)
            }
            o.appendChild(a)
        }
        return this.node = r,
            this.applyMainParameter(),
            this.highlightMinMax(),
            r
    }
    getNode() {
        return this.node
    }
    removeNode() {
        this.getNode().parentNode && this.getNode().parentNode.removeChild(this.getNode())
    }
    clearNode() {
        this.removeNode(),
            this.node = null
    }
    remove() {
        this.removeNode(),
            MatrixUI.OBJECTS.delete(this.id)
    }
    setMainParameter(e) {
        this.mainParameter = e
    }
    applyMainParameter() {
        this.node.querySelectorAll(":scope .parameter.main").forEach(e => e.classList.remove("main")),
            this.node.querySelectorAll(':scope .parameter[data-parameter-name="' + this.mainParameter + '"]').forEach(e => e.classList.add("main"))
    }
    setHighlightRange(e, t, a) {
        if (null == t)
            throw new Error("Highlight mid is required");
        if (e > a)
            throw new Error("Invalid boundaries, min should be less than max");
        if (t < e || t > a)
            throw new Error("Highlight mid is out of boundaries");
        this.processData();
        const r = new Map;
        for (const n of Object.values(CELL_TYPE))
            r.set(n, MatrixUI.calculateHighlightRange(e, t, a, this.getCells(n), this.mainParameter));
        r.get(CELL_TYPE.SUMMARY_CELL).mid = this.getCells(CELL_TYPE.SUMMARY_CELL)[0][this.mainParameter],
            this.highlightRanges = r
    }
    highlight() {
        this.highlightMinMax()
    }
    highlightMinMax() {
        const e = this.node.querySelector(":scope tbody");
        for (let t = 0; t < this.cells.length; t++) {
            const a = e.children[t]
                , r = 0 != t ? this.data[t - 1] : null
                , n = this.useDataColors && r && r.backgroundColors || MatrixUI.HIGHLIGHT_BACKGROUND_COLORS
                , o = this.useDataColors && r && r.colors || MatrixUI.HIGHLIGHT_COLORS;
            for (let e = 0; e < this.cells[t].length; e++) {
                const r = this.cells[t][e];
                if (!r)
                    continue;
                const l = r[this.mainParameter];
                if (null == l)
                    continue;
                const s = this.highlightRanges.get(MatrixUI.getCellType(t, e))
                    , i = l - s.mid
                    , c = i < 0 ? s.minSize : s.maxSize
                    , d = Math.min(Math.abs(i) / c * MatrixUI.HIGHLIGHT_MAX_OPACITY, MatrixUI.HIGHLIGHT_MAX_OPACITY)
                    , u = this.getBackgroundHighlightColor(n, i, d)
                    , m = 0 == i ? o.neutral : i < 0 ? o.negative : o.positive;
                a.children[e + 1].setAttribute("style", "background-color: " + u + "; color: " + m + ";")
            }
        }
    }
    getBackgroundHighlightColor(e, t, a) {
        const r = e[this.theme.name][t < 0 ? "negative" : "positive"];
        return Util.changeFullRgbaAlpha(r, a)
    }
}
MatrixUI.OBJECTS = new Map,
    MatrixUI.HIGHLIGHT_MAX_OPACITY = .4,
    MatrixUI.HIGHLIGHT_NEGATIVE_COLOR = "rgba(220, 53, 69)",
    MatrixUI.HIGHLIGHT_NEUTRAL_COLOR = "rgba(128, 128, 128)",
    MatrixUI.HIGHLIGHT_POSITIVE_COLOR = "rgba(40, 167, 69)",
    MatrixUI.HIGHLIGHT_COLORS = {
        negative: MatrixUI.HIGHLIGHT_NEGATIVE_COLOR,
        neutral: MatrixUI.HIGHLIGHT_NEUTRAL_COLOR,
        positive: MatrixUI.HIGHLIGHT_POSITIVE_COLOR
    },
    MatrixUI.HIGHLIGHT_NEGATIVE_BACKGROUND_COLOR_DARK = "rgba(110, 26, 35, 1)",
    MatrixUI.HIGHLIGHT_POSITIVE_BACKGROUND_COLOR_DARK = "rgba(20, 83, 35, 1)",
    MatrixUI.HIGHLIGHT_NEGATIVE_BACKGROUND_COLOR_LIGHT = "rgba(220, 53, 69, 1) ",
    MatrixUI.HIGHLIGHT_POSITIVE_BACKGROUND_COLOR_LIGHT = "rgba(40, 167, 69, 1) ",
    MatrixUI.HIGHLIGHT_BACKGROUND_COLORS = {
        dark: {
            negative: MatrixUI.HIGHLIGHT_NEGATIVE_BACKGROUND_COLOR_DARK,
            positive: MatrixUI.HIGHLIGHT_POSITIVE_BACKGROUND_COLOR_DARK
        },
        light: {
            negative: MatrixUI.HIGHLIGHT_NEGATIVE_BACKGROUND_COLOR_LIGHT,
            positive: MatrixUI.HIGHLIGHT_POSITIVE_BACKGROUND_COLOR_LIGHT
        }
    };
const CELL_TYPE = Object.freeze({
    SUMMARY_CELL: {
        name: "summaryCell",
        order: 1,
        getCells: e => e.getSummaryCell()
    },
    SUMMARY_ROW: {
        name: "summaryRow",
        order: 2,
        getCells: e => e.getSummaryRow()
    },
    SUMMARY_COLUMN: {
        name: "summaryColumn",
        order: 3,
        getCells: e => e.getSummaryColumns()
    },
    DATA: {
        name: "data",
        order: 4,
        getCells: e => e.getDataCells()
    }
});
function ownKeys(e, t) {
    var a = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
        var r = Object.getOwnPropertySymbols(e);
        t && (r = r.filter(function (t) {
            return Object.getOwnPropertyDescriptor(e, t).enumerable
        })),
            a.push.apply(a, r)
    }
    return a
}
function _objectSpread(e) {
    for (var t = 1; t < arguments.length; t++) {
        var a = null != arguments[t] ? arguments[t] : {};
        t % 2 ? ownKeys(Object(a), !0).forEach(function (t) {
            _defineProperty(e, t, a[t])
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a)) : ownKeys(Object(a)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(a, t))
        })
    }
    return e
}
function _defineProperty(e, t, a) {
    return (t = _toPropertyKey(t)) in e ? Object.defineProperty(e, t, {
        value: a,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : e[t] = a,
        e
}
function _toPropertyKey(e) {
    var t = _toPrimitive(e, "string");
    return "symbol" == typeof t ? t : t + ""
}
function _toPrimitive(e, t) {
    if ("object" != typeof e || !e)
        return e;
    var a = e[Symbol.toPrimitive];
    if (void 0 !== a) {
        var r = a.call(e, t || "default");
        if ("object" != typeof r)
            return r;
        throw new TypeError("@@toPrimitive must return a primitive value.")
    }
    return ("string" === t ? String : Number)(e)
}
class EnhancementUtil {
    static enhance() {
        EnhancementUtil.enhanceSelects(document)
    }
    static enhanceSelects(e) {
        e.querySelectorAll("select.enhanced").forEach(e => {
            const t = $(e);
            t.select2(_objectSpread({
                allowClear: !0,
                placeholder: "Select an option"
            }, e.hasAttribute("multiple") && {
                width: "100%"
            })),
                t.on("select2:select select2:unselect select2:clear", EnhancementUtil.onEnhancedSelectChange)
        }
        )
    }
    static onEnhancedSelectChange(e) {
        e.target.dispatchEvent(new Event("change"))
    }
}
