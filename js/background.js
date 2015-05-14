chrome.browserAction.onClicked.addListener( function(tab) {

	chrome.browserAction.setBadgeText({
		'text' : 'wait',
		'tabId' : tab.id
	});
	chrome.browserAction.setBadgeBackgroundColor({
		'color' : '#2C2C2C',
		'tabId' : tab.id
	});
	
	
	function getThumbnailScript(newDialID){
		chrome.tabs.executeScript( tab.id, {
			code : 'localStorage.setItem("dialID",' + newDialID + ');'
		}, function(){
			chrome.tabs.executeScript( tab.id, {
				file : 'js/min/thumbnail.min.js'
			}, function(){
				chrome.browserAction.setBadgeText({
					'text' : 'OK',
					'tabId' : tab.id
				});
				setTimeout(function(){
					chrome.browserAction.setBadgeText({
						'text' : '',
						'tabId' : tab.id
					});
				}, 3000);
			});
		});
	}

	function addNewDial(thisID){
		var dialsObject = {}
		dialsObject[thisID] = {
			'id' : thisID,
			'name' : tab.title,
			'url' : tab.url,
			'thumb' : '',
			'setThumb' : 1,
			'favicon' : tab.favIconUrl,
			"smartGroups": {
				"home" : {
					"morning" : 0,
					"day" : 0,
					"afternoon" : 0,
					"evening" : 0,
					"night" : 0
				},						
				"work" : {
					"morning" : 0,
					"day" : 0,
					"afternoon" : 0,
					"evening" : 0,
					"night" : 0
				}
			}
		}

		chrome.storage.sync.set( dialsObject, function() {
			getThumbnailScript(thisID);
		});
	}
	
	chrome.storage.sync.get( null, function(fullObject){
		
		var objectLength = Object.keys(fullObject).length;
		
		if(objectLength > 1){
			var count = 0;
			var totalCount = objectLength - 1;
			for(var prop in fullObject){
				count++;
				if (count === totalCount) {
					var thisID = fullObject[prop].id;
					thisID++;
					addNewDial(thisID);
				}
			}
		}else{
			addNewDial(1);
		}
	});
	
});