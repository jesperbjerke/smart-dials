"use strict";
var feedly = {
    is_dev : true,
    base_url : function(override){
        override = override || false;
        if(feedly.is_dev && !override){
            return 'sandbox.feedly.com';
        }else{
            return 'cloud.feedly.com';
        }
    },
    redirect_uri : function(override){
        override = override || false;
        if(feedly.is_dev){
            return "http://localhost";
        }else{
            return "http://localhost";
        }
    },
    client_id : function(override){
        override = override || false;
        if(feedly.is_dev){
            return 'sandbox';
        }else{
            return 'live client id';
        }
    },
    client_secret : function(override){
        override = override || false;
        if(feedly.is_dev){
            return '4205DQXBAP99S8SUHXI3';
        }else{
            return 'live client secret';
        }
    },

    setBadgeCounter : function (unreadFeedsCount) {
        if(unreadFeedsCount !== 0){
            $('li[data-target="feedly"] .count').text(unreadFeedsCount).addClass('show');
        }
    },
    /* Runs feeds update and stores unread feeds in cache
     * Callback will be started after function complete
     * */
    updateCounter : function () {
        feedly.apiRequestWrapper("markers/counts", {
            onSuccess: function (response) {
                var unreadCounts = response.unreadcounts;
                var unreadFeedsCount = 0;

                if (appGlobal.options.isFiltersEnabled) {
                    feedly.apiRequestWrapper("subscriptions", {
                        onSuccess: function (response) {
                            unreadCounts.forEach(function (element) {
                                if (appGlobal.options.filters.indexOf(element.id) !== -1) {
                                    unreadFeedsCount += element.count;
                                }
                            });

                            // When feed consists in more than one category, we remove feed which was counted twice or more
                            response.forEach(function (feed) {
                                var numberOfDupesCategories = 0;
                                feed.categories.forEach(function(category){
                                    if(appGlobal.options.filters.indexOf(category.id) !== -1){
                                        numberOfDupesCategories++;
                                    }
                                });
                                if(numberOfDupesCategories > 1){
                                    for (var i = 0; i < unreadCounts.length; i++) {
                                        if (feed.id === unreadCounts[i].id) {
                                            unreadFeedsCount -= unreadCounts[i].count * --numberOfDupesCategories;
                                            break;
                                        }
                                    }
                                }
                            });

                            feedly.setBadgeCounter(unreadFeedsCount);
                        }
                    });
                } else {
                    for (var i = 0; i < unreadCounts.length; i++) {
                        if (appGlobal.globalGroup === unreadCounts[i].id) {
                            unreadFeedsCount = unreadCounts[i].count;
                            break;
                        }
                    }

                    feedly.setBadgeCounter(unreadFeedsCount);
                }
            }
        });
    },

    /* Runs authenticating a user process,
     * then read access token and stores in chrome.storage */
    getAccessToken : function () {
        var state = (new Date()).getTime();
        var url = appGlobal.feedlyApiClient.getMethodUrl("auth/auth", {
            response_type: "code",
            client_id: appGlobal.clientId,
            redirect_uri: "http://localhost",
            scope: "https://cloud.feedly.com/subscriptions",
            state: state
        }, appGlobal.options.useSecureConnection);

        chrome.tabs.create({url: url}, function (authorizationTab) {
            chrome.tabs.onUpdated.addListener(function processCode(tabId, information, tab) {

                var checkStateRegex = new RegExp("state=" + state);
                if (!checkStateRegex.test(information.url)) {
                    return;
                }

                var codeParse = /code=(.+?)(?:&|$)/i;
                var matches = codeParse.exec(information.url);
                if (matches) {
                    appGlobal.feedlyApiClient.request("auth/token", {
                        method: "POST",
                        useSecureConnection: appGlobal.options.useSecureConnection,
                        parameters: {
                            code: matches[1],
                            client_id: appGlobal.clientId,
                            client_secret: appGlobal.clientSecret,
                            redirect_uri: "http://localhost",
                            grant_type: "authorization_code"
                        },
                        onSuccess: function (response) {
                            chrome.storage.sync.set({
                                feedly_api: {
                                    accessToken: response.access_token,
                                    refreshToken: response.refresh_token,
                                    feedlyUserId: response.id
                                }
                            }, function () {
                            });
                            chrome.tabs.onUpdated.removeListener(processCode);
                            chrome.tabs.update(authorizationTab.id, {url: 'chrome://newtab'});
                        }
                    });
                }
            });
        });
    },

    /* Tries refresh access token if possible */
    refreshAccessToken : function (){
        if(!appGlobal.options.refreshToken) return;

        appGlobal.feedlyApiClient.request("auth/token", {
            method: "POST",
            useSecureConnection: appGlobal.options.useSecureConnection,
            parameters: {
                refresh_token: appGlobal.options.refreshToken,
                client_id: appGlobal.clientId,
                client_secret: appGlobal.clientSecret,
                grant_type: "refresh_token"
            },
            onSuccess: function (response) {
                chrome.storage.sync.set({
                    feedly_api: {
                        accessToken: response.access_token,
                        feedlyUserId: response.id
                    }
                }, function () {});
            },
            onComplete: function(){
                appGlobal.tokenIsRefreshing = false;
            }
        });
    },

    /* Writes all application options in chrome storage and runs callback after it */
    writeOptions : function (callback) {
        var options = {};
        for (var option in appGlobal.options) {
            options[option] = appGlobal.options[option];
        }
        chrome.storage.sync.set(
            {
                feedly_api : options
            }, 
            function () {
                if (typeof callback === "function") {
                    callback();
                }
            }
        );
    },

    /* Reads all options from chrome storage and runs callback after it */
    readOptions : function (callback) {
        chrome.storage.sync.get('feedly_api', function (options) {
            var success = false;
            if(options.hasOwnProperty('feedly_api')){
                for (var optionName in options.feedly_api) {
                    if (typeof appGlobal.options[optionName] === "boolean") {
                        appGlobal.options[optionName] = Boolean(options.feedly_api[optionName]);
                    } else if (typeof appGlobal.options[optionName] === "number") {
                        appGlobal.options[optionName] = Number(options.feedly_api[optionName]);
                    } else {
                        appGlobal.options[optionName] = options.feedly_api[optionName];
                    }
                }
                success = true;
            }else{

            }
            if (typeof callback === "function") {
                callback(success);
            }
        });
    },

    apiRequestWrapper : function (methodName, settings) {
        var onSuccess = settings.onSuccess;
        settings.onSuccess = function (response) {
            if (typeof onSuccess === "function") {
                onSuccess(response);
            }
        };

        var onAuthorizationRequired = settings.onAuthorizationRequired;

        settings.onAuthorizationRequired = function (accessToken) {
            if (!appGlobal.tokenIsRefreshing){
                appGlobal.tokenIsRefreshing = true;
                feedly.refreshAccessToken();
            }
            if (typeof onAuthorizationRequired === "function") {
                onAuthorizationRequired(accessToken);
            }
        };

        appGlobal.feedlyApiClient.request(methodName, settings);
    }
};

var FeedlyApiClient = function (accessToken) {

    this.accessToken = accessToken;

    var apiUrl = "http://" + feedly.base_url() + "/v3/";
    var secureApiUrl = "https://" + feedly.base_url() + "/v3/";
    var extensionVersion = chrome.runtime.getManifest().version;

    this.getMethodUrl = function (methodName, parameters, useSecureConnection) {
        if (methodName === undefined) {
            return "";
        }
        var methodUrl = (useSecureConnection ? secureApiUrl : apiUrl) + methodName;

        var queryString = "?";
        for (var parameterName in parameters) {
            queryString += parameterName + "=" + parameters[parameterName] + "&";
        }
        queryString += "av=c" + extensionVersion;

        methodUrl += queryString;

        return methodUrl;
    };

    this.request = function (methodName, settings) {
        var url = this.getMethodUrl(methodName, settings.parameters, settings.useSecureConnection);
        var verb = settings.method || "GET";

        // For bypassing the cache
        if (verb === "GET"){
            url += ((/\?/).test(url) ? "&" : "?") + "ck=" + (new Date()).getTime();
        }

        var request = new XMLHttpRequest();
        if (settings.timeout){
            request.timeout = settings.timeout;
        }
        request.open(verb, url, true);

        if (this.accessToken) {
            request.setRequestHeader("Authorization", "OAuth " + this.accessToken);
        }

        request.onload = function (e) {
            var json;
            try {
                json = JSON.parse(e.target.response);
            } catch (exception) {
                json = {
                    parsingError: exception.message,
                    response: e.target.response
                }
            }
            if (e.target.status === 200) {
                if (typeof settings.onSuccess === "function") {
                    settings.onSuccess(json);
                }
            } else if (e.target.status === 401) {
                if (typeof settings.onAuthorizationRequired === "function") {
                    settings.onAuthorizationRequired(settings.accessToken);
                }
            } else if (e.target.status === 400) {
                if (typeof settings.onError === "function") {
                    settings.onError(json);
                }
            }

            if (typeof settings.onComplete === "function"){
                settings.onComplete(json);
            }
        };

        request.ontimeout = function (e) {
            if (typeof settings.onComplete === "function"){
                settings.onComplete(e);
            }
        };

        var body;
        if (settings.body) {
            body = JSON.stringify(settings.body);
        }
        request.send(body);
    };
};

var appGlobal = {
    feedlyApiClient: new FeedlyApiClient(),
    feedTab: null,
    icons: {
        default: "/images/icon.png",
        inactive: "/images/icon_inactive.png",
        defaultBig: "/images/icon128.png"
    },
    options: {
        _updateInterval: 10, //minutes
        _popupWidth: 380,
        _expandedPopupWidth: 650,

        markReadOnClick: true,
        accessToken: "",
        refreshToken: "",
        showDesktopNotifications: true,
        hideNotificationDelay: 10, //seconds
        showFullFeedContent: false,
        maxNotificationsCount: 5,
        openSiteOnIconClick: false,
        feedlyUserId: "",
        abilitySaveFeeds: false,
        maxNumberOfFeeds: 20,
        forceUpdateFeeds: false,
        useSecureConnection: true,
        expandFeeds: false,
        isFiltersEnabled: false,
        openFeedsInSameTab: false,
        openFeedsInBackground: true,
        filters: [],
        showCounter: true,
        playSound: false,
        oldestFeedsFirst: false,
        resetCounterOnClick: false,
        popupFontSize: 100, //percent
        showCategories: false,

        get updateInterval(){
            var minimumInterval = 10;
            return this._updateInterval >= minimumInterval ? this._updateInterval : minimumInterval;
        },
        set updateInterval(value) {
            return this._updateInterval = value;
        },
        get popupWidth() {
            var maxValue = 750;
            var minValue = 380;
            if (this._popupWidth > maxValue ) {
                return maxValue;
            }
            if (this._popupWidth < minValue){
                return minValue;
            }
            return this._popupWidth;
        },
        set popupWidth(value) {
            this._popupWidth = value;
        },
        get expandedPopupWidth() {
            var maxValue = 750;
            var minValue = 380;
            if (this._expandedPopupWidth > maxValue ) {
                return maxValue;
            }
            if (this._expandedPopupWidth < minValue){
                return minValue;
            }
            return this._expandedPopupWidth;
        },
        set expandedPopupWidth(value) {
            this._expandedPopupWidth = value;
        }
    },
    //Names of options after changes of which scheduler will be initialized
    criticalOptionNames: ["updateInterval", "accessToken", "showFullFeedContent", "openSiteOnIconClick", "maxNumberOfFeeds", "abilitySaveFeeds", "filters", "isFiltersEnabled", "showCounter", "oldestFeedsFirst", "resetCounterOnClick"],
    cachedFeeds: [],
    cachedSavedFeeds: [],
    isLoggedIn: false,
    intervalIds: [],
    clientId: "sandbox",
    clientSecret: "4205DQXBAP99S8SUHXI3",
    tokenIsRefreshing: false,
    get feedlyUrl(){
        return this.options.useSecureConnection ? "https://feedly.com" : "http://feedly.com"
    },
    get savedGroup(){
        return "user/" + this.options.feedlyUserId + "/tag/global.saved";
    },
    get globalGroup(){
        return "user/" + this.options.feedlyUserId + "/category/global.all";
    },
    get globalUncategorized(){
        return "user/" + this.options.feedlyUserId + "/category/global.uncategorized";
    }
};