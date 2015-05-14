function thumbnailFunction(){
	
	var dialID = localStorage.getItem('dialID');
	var favicons = new Array();
	var resolved_favicons = new Array();
	var links = document.getElementsByTagName('link');
	var dialsObject = null;
	
	chrome.storage.sync.get( null, function(object){
		dialsObject = {}
		dialsObject[dialID] = object[dialID];
		dialsObject[dialID].setThumb = 0;
		chrome.storage.sync.set(dialsObject);
		
		for(var i=0; i<links.length; i++) {

			var link = links[i];
			var rel = '"' + link.getAttribute("rel") + '"';
			var regexp = /(apple-touch-icon)/i;
			var regexp2 = /(\"icon )|( icon\")|(\"icon\")|( icon )/i;

			if(rel.search(regexp) != -1) {
				favicons.push(link.getAttribute('href'));
			}else if(rel.search(regexp2) != -1) {
				favicons.push(link.getAttribute('href'));
			}
		}

		favicons.forEach(function(icon) {
			if(icon != ""){
				var regexp3 = /(http:)|(https:)/i;
				var regexp4 = /(www)/i;
				var regexp5 = /(\/\/www)/i;
				if(icon.search(regexp3) != -1){
					resolved_favicons.push(icon);
				}else if(icon.search(regexp4) != -1){
					if(icon.search(regexp5) != -1){
						resolved_favicons.push('http:' + icon);
					}else{
						resolved_favicons.push(icon);
					}
				}else{
					resolved_favicons.push(window.location.origin + icon);
				}
			}
		});

		var returnArray = new Array();

		var count = 0;
		resolved_favicons.forEach(function(icon) {
			var img = new Image();
			img.src = icon;
			img.onload = function(){
				var thisArray = [
					this.width,
					icon
				];
				returnArray.push(thisArray);
				returnArray.sort(function(x,y){return y[0]-x[0]});

				count++;
				if(count == resolved_favicons.length){
					if(returnArray[0][0] > 50){
						dialsObject[dialID].thumb = returnArray[0][1];
						chrome.storage.sync.set(dialsObject);
					}
				}
			}
		});
	});
}
thumbnailFunction();