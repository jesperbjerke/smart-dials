var evernoteApp = {
	'evernoteHostName' : 'https://sandbox.evernote.com',
	'consumerKey' : 'jesperbjerke',
	'consumerSecret' : 'a7ccc78e8897c093'	
}

var OAuthOptions = {
	consumerKey : evernoteApp.consumerKey,
	consumerSecret : evernoteApp.consumerSecret,
	callbackUrl : "smartDialsOAuth",
	signatureMethod : "HMAC-SHA1",
};
var oauth = OAuth(OAuthOptions);

function evernoteSuccess(data){
	console.log(data);

	var isCallBackConfirmed = false;
	var token = '';
	var vars = data.text.split("&");

	for (var i = 0; i < vars.length; i++) {
		var y = vars[i].split('=');
		if(y[0] === 'oauth_token')  {
			token = y[1];
		}
		else if(y[0] === 'oauth_token_secret') {
			this.oauth_token_secret = y[1];
			localStorage.setItem("oauth_token_secret", y[1]);
		}
		else if(y[0] === 'oauth_callback_confirmed') {
			isCallBackConfirmed = true;
		}
	}

	var ref;

	if(isCallBackConfirmed) {

		chrome.storage.sync.get('settings', function(settingsData){
			settingsData.settings.evernote = {
				'oauth_token' : token,
				'oauth_token_secret' : localStorage.getItem("oauth_token_secret"),
			}
			chrome.storage.sync.set( settingsData, function() {
				chrome.tabs.create({
					url: evernoteApp.evernoteHostName + '/OAuth.action?oauth_token=' + token
				}, function(tab){
					chrome.tabs.onUpdated.addListener( function( tabID, info ){
						if(tabID == tab.id){

							var loc = info.url;
							var verifier = '';
							var oauthToken = '';

							if (loc.indexOf( evernoteApp.evernoteHostName + '/Home.action?smartDialsOAuth?') >= 0) {
								var params = loc.substr(loc.indexOf('?') + 17);

								params = params.split('&');

								for (var i = 0; i < params.length; i++) {

									var y = params[i].split('=');

									if(y[0] === 'oauth_verifier') {
										verifier = y[1];
									}else if(y[0] === 'oauth_token') {
										oauthToken = y[1];
									}
								}
							}

							if((verifier !== '') && (oauthToken !== '')){

								oauth.setVerifier(verifier);
								oauth.setAccessToken([oauthToken, localStorage.getItem("oauth_token_secret")]);

								var getData = {
									'oauth_verifier': verifier
								};

								chrome.tabs.remove( tabID, function(){
									oauth.get(
										evernoteApp.evernoteHostName + '/oauth', 
										function (data){
											evernoteSuccess(data);
										}
									);	
								});
							}
						}
					});
				});
			});
		});

	} else {

		var querystring = $.getQueryParams(data.text);
		var authTokenEvernote = querystring.oauth_token;
		var expires = querystring.edam_expires;
		var noteStoreUrl = querystring.edam_noteStoreUrl;
		// authTokenEvernote can now be used to send request to the Evernote Cloud API

		chrome.storage.sync.get('settings', function(settingsData){
			settingsData.settings.evernote['finalToken'] = authTokenEvernote;
			settingsData.settings.evernote['expires'] = expires;
			settingsData.settings.evernote['noteStoreUrl'] = noteStoreUrl;

			chrome.storage.sync.set( settingsData, function() {
				chrome.tabs.update({
					url : 'chrome://newtab?state=goToEvernote',
					active : true
				});
			});
		});
	}
}

function loginWithEvernote() {
	oauth.get(
		evernoteApp.evernoteHostName + '/oauth', 
		function (data){
			evernoteSuccess(data);
		}
	);
}

$('#authEvernote').click( function(){
	loginWithEvernote();
});

function getEvernoteList(authData, doOutPut){

	console.log(authData);

	var noteStoreTransport = new Thrift.BinaryHttpTransport(authData.noteStoreUrl);
	var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
	var noteStore = new NoteStoreClient(noteStoreProtocol);
	var authToken = authData.finalToken;

	noteStore.listNotebooks(authToken, function (notebooks) {
		console.log(notebooks);
	}, function onerror(error) {
		console.log(error);
	});

}