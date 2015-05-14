//@prepros-prepend ../bower_components/jquery/dist/jquery.min.js
//@prepros-prepend ../bower_components/isotope/dist/isotope.pkgd.min.js
//@prepros-prepend ../bower_components/isotope-packery/packery-mode.pkgd.min.js
//@prepros-prepend ../bower_components/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.concat.min.js
//@prepros-prepend ../bower_components/jquery-dateFormat/dist/jquery-dateFormat.min.js
//@prepros-prepend ../bower_components/colpick/js/colpick.js
//@prepros-prepend feedly.api.js

jQuery.extend({

	getQueryParams : function(str) {
		return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n=n.split("="),this[n[0]]=n[1],this;}.bind({}))[0];
	}

});

$(document).ready( function($){
	
	function shuffleArray(obj) {
		var result;
		var count = 0;
		for (var prop in obj)
			if (Math.random() < 1/++count) result = obj[prop];
		return result;
	}
	
	function randomIntFromInterval(min,max){
		return Math.floor(Math.random()*(max-min+1)+min);
	}
	
	function shadeColor(color, percent) {   
		var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
		return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
	}
	
	function getTimeOfDay(timeStamp){
		timeStamp = timeStamp || new Date().getTime();
		var hours = new Date(timeStamp).getHours();
		var timeOfDay = '';
		//morning
		if (hours >= 6 && hours <= 9){
			timeOfDay = 'morning';
		}
		//day
		if (hours >= 10 && hours <= 12){
			timeOfDay = 'day';
		}
		//afternon
		if (hours >= 13 && hours <= 17){
			timeOfDay = 'afternoon';
		}
		//evening
		if (hours >= 18 && hours <= 21){
			timeOfDay = 'evening';
		}
		//night
		if (hours >= 22 || hours <= 5){
			timeOfDay = 'night';
		}
		return timeOfDay;
	}
	
	var globalSettings = {};
	
	chrome.storage.sync.get( 'settings', function(object){
		if(typeof object.settings === 'undefined'){
			chrome.storage.sync.set({
				'settings' : {
					'features' : {
						'pocket' : true,
						'evernote' : true,
						'feedly' : true,
						'apps' : true,
						'suggestions' : true,
						'beSmart' : true
					},
					'columns' : 5
				}
			}, function(){
				chrome.tabs.reload();
			});
		}else{

			if(typeof object.settings.features.beSmart === 'undefined'){
				object.settings.features.beSmart = true;
				chrome.storage.sync.set(object, function(){
					chrome.tabs.reload();
				});
			}
			
			globalSettings = object.settings;

			if((typeof object.settings.pocket !== 'undefined') && (object.settings.features.pocket === true)){
				getPocketList(object.settings.pocket.token, false);
			}else{
				$('#pocket').addClass('not-logged-in');
				$('#menu li[data-target="pocket"] .popOut-btn').addClass('disabled');
			}

			if(object.settings.features.feedly === true){
				feedly.readOptions(function(success){
					if(success){
						appGlobal.feedlyApiClient.accessToken = appGlobal.options.accessToken;
						feedly.updateCounter();
					}else{
						feedly.getAccessToken();
					}
				});
			}

			getDials();
		}

		for(var feature in object.settings.features){
			var setting = object.settings.features[feature];
			if(setting === false){
				$('#menu li[data-target="' + feature + '"]').hide();
				$('#settings .onoffswitch .onoffswitch-checkbox[data-value="' + feature + '"]').prop('checked', false);
			}
		}

	});
	
	var thisEnvironment = '';
	chrome.storage.local.get( 'environment', function(typeObject){
		if(typeof typeObject.environment === 'undefined'){
			
			$('#setEnvironment').show().addClass('show');
			
			$('#setEnvironment .option').click(function(){
				
				thisEnvironment = $(this).attr('data-value');
				
				chrome.storage.local.set({
					'environment' : thisEnvironment
				}, function(){
					$('#setEnvironment').removeClass('show').delay(500).hide();
					setTimeout( function(){
						chrome.tabs.reload();
					}, 500);
				});
				
			});
			
		}else{
			thisEnvironment = typeObject.environment;
		}
	});
	
	function showSorting(){
		var currentTime = getTimeOfDay();
		
		function originalSort(){
			if(globalSettings.features.beSmart === true){
				$('#dials #topDials').isotope({
					filter : function(){
						var itemFilter = $(this).attr('data-' + thisEnvironment + '-' + currentTime);
						if(itemFilter > 0){
							return true;
						}else{
							return false;
						}
					},
					sortBy : [ thisEnvironment + currentTime ]
				});			
				$('#dials #filteredDials').isotope({
					filter : function(){
						var itemFilter = $(this).attr('data-' + thisEnvironment + '-' + currentTime);
						if(itemFilter === 0){
							return true;
						}else{
							return false;
						}
					},
					sortBy : [ thisEnvironment + currentTime ]
				});	
			}else{
				$('#editDial button').addClass('double');
				$('#editDial button.rearrange').removeClass('disabled');
				
				$('#editDial button.rearrange').click( function(){
					chrome.tabs.update({
						url : 'chrome://newtab?arrange=true',
						active : true
					});
				});
				
				$('#dials #topDials').isotope({
					sortBy : [ thisEnvironment ]
				});
				$arrangeQuery = $.getQueryParams();
				if(typeof $arrangeQuery.arrange !== 'undefined'){
					if($arrangeQuery.arrange === 'true'){
						
						chrome.storage.sync.get(null, function(currentDials){
							var $sortedItems = $('#dials #topDials').data('isotope'),
								keyCount = 1;

							$.each($sortedItems.filteredItems, function(key, item){
								var ID = $(item.element).attr('data-id');
								if(typeof currentDials[ID].order === 'undefined'){
									currentDials[ID].order = {};
									currentDials[ID].order[thisEnvironment] = keyCount;
								}else{
									currentDials[ID].order[thisEnvironment] = keyCount;
								}
								keyCount++;
							});
							
							$('#dials #topDials').find('.column').hover( 
								function(){
									var thisColumn = $(this);
									var thisOr = currentDials[thisColumn.attr('data-id')].order[thisEnvironment];
									
									if(thisOr !== 0 && thisOr !== 1){
										thisColumn.prepend('<span class="move-left arrow_left" title="Move left"></span><span class="move-right arrow_right" title="Move right"></span>');
									}else{
										thisColumn.prepend('<span class="move-right arrow_right" title="Move right"></span>');
									}
									
									var newOr = 1;
									
									function reArrange(newOrder, thisOrder){
										
										$.each(currentDials, function(key, dial){
											if(typeof dial.id !== 'undefined'){
												if(dial.order[thisEnvironment] === newOrder){
													currentDials[dial.id].order[thisEnvironment] = thisOrder;
													$('.column[data-id="' + dial.id + '"]').attr('data-' + thisEnvironment + '-order', thisOrder);
													return false;
												}
											}
										});
										
										currentDials[thisColumn.attr('data-id')].order[thisEnvironment] = newOrder;
										thisColumn.attr('data-' + thisEnvironment + '-order', newOrder);
										$('#dials #topDials .column[data-' + thisEnvironment + '-order="' + thisOrder + '"]').attr('data-' + thisEnvironment + '-order', thisOrder);
										
										$('#dials #topDials').isotope( 'updateSortData' ).isotope();
									}
									
									thisColumn.find('.move-left').click(function(){
										if((thisOr - 1) !== 0){
											newOr = thisOr - 1;
										}else{
											newOr = 1;
										}
										reArrange(newOr, thisOr);
									});
									thisColumn.find('.move-right').click(function(){
										newOr = thisOr + 1;
										reArrange(newOr, thisOr);
									});
								},
								function(){
									$(this).find('.move-left, .move-right').remove();
								}
							);
							
							$('#dials #topDials').prepend('<span id="saveOrder"><span class="icon_floppy"></span> Save current order</span>');
							$('#saveOrder').click(function(){
								chrome.storage.sync.set(currentDials, function(){
									chrome.tabs.update({
										url : 'chrome://newtab',
										active : true
									});
								});
							});
						});
					}
				}
			}
			if(globalSettings.features.suggestions === true){
				$('#dials #suggestedDials').isotope({
					filter : function(){
						var itemFilter = $(this).attr('data-' + currentTime);
						if(itemFilter > 0){
							return true;
						}else{
							return false;
						}
					},
					sortBy : [ currentTime ]
				});
			}
		}
		originalSort();
		
		chrome.omnibox.onInputStarted.addListener(function(){
			if(!$('#dials').hasClass('show')){
				$('.content').removeClass('show');
				$('#dials').addClass('show');
			}
			var qsRegex,
				$container1 = $('#dials #topDials'),
				$container3 = $('#dials #suggestedDials'),
				$quicksearch = $('#dialSearch input#search');

			function debounce( fn, threshold ) {
				var timeout;
				return function debounced() {
					if ( timeout ) {
						clearTimeout( timeout );
					}
					function delayed() {
						fn();
						timeout = null;
					}
					timeout = setTimeout( delayed, threshold || 100 );
				}
			}
			
			chrome.omnibox.onInputChanged.addListener( function(text, suggest){

				qsRegex = new RegExp( text, 'gi' );
					if(text !== ''){
						$container1.isotope({
							filter: function() {
								return qsRegex ? $(this).text().match( qsRegex ) : true;
							}
						});
						$container3.isotope({
							filter: function() {
								return qsRegex ? $(this).text().match( qsRegex ) : true;
							}
						});
					}else{
						originalSort();
					}
				
			});
		});
		
		$('#sortingOptions #optionsInner li[data-value="' + thisEnvironment + '"]').addClass('current');
		$('#sortingOptions #optionsInner li[data-value="' + currentTime + '"]').addClass('current');
		
		$('#sortingOptions #currently')
			.html('<span class="' + thisEnvironment + '">' + thisEnvironment + '</span> <span class="' + currentTime + '">' + currentTime + '</span>');
		
		$('#sortingOptions').on('click', function(){
			$('#sortingOptions').addClass('show');
		});
		
		$('#dials .row').on('click', function(){
			$('#sortingOptions').removeClass('show');
		});
		
		$('#sortingOptions #optionsInner li').on('click', function(){
			var thisData = $(this).attr('data-value');
			if((thisData === 'home') || (thisData === 'work')){
				thisEnvironment = thisData;
				chrome.storage.local.set({
					'environment' : thisEnvironment
				});
			}else{
				currentTime = thisData;
			}
			originalSort();

			$('#sortingOptions #currently')
			.html('<span class="' + thisEnvironment + '">' + thisEnvironment + '</span><span class="' + currentTime + '">' + currentTime + '</span>');
			
			$('#sortingOptions #optionsInner li').removeClass('current');
			$('#sortingOptions #optionsInner li[data-value="' + thisEnvironment + '"]').addClass('current');
			$('#sortingOptions #optionsInner li[data-value="' + currentTime + '"]').addClass('current');
		});
	}
	
	function deleteDial(item){
		item.parent().find('.dialLoader').show().addClass('show undo').html('<span class="arrow_back"></span>');
		var deleteTimeOut = setTimeout( function(){
			item.parent().find('.dialLoader').removeClass('undo').addClass('delete').html('<span class="icon_trash_alt"></span>');
			$('#dials #topDials').isotope( 'remove', item.parent() );
			$('#dials #topDials').isotope( 'layout' );			
			$('#dials #filteredDials').isotope( 'remove', item.parent() );
			$('#dials #filteredDials').isotope( 'layout' );
			var itemID = item.attr('data-id');
			chrome.storage.sync.remove(itemID);
		}, 3000);
		item.parent().find('.dialLoader').on('click', function(){
			clearTimeout(deleteTimeOut);
			$(this).removeClass('show').delay(500).hide();
		});
	}
	
	function onDialClick(object){
		$('.deleteDial').on('click', function(e){
			deleteDial($(this));
		});
		$('.editDial').on('click', function(e){
			var dialID = $(this).attr('data-id');
			chrome.storage.sync.get(dialID, function(dialData){
				var nameIn = $('#editDial').find('input#name');
				var urlIn = $('#editDial').find('input#url');
				nameIn.val(dialData[dialID].name);
				urlIn.val(dialData[dialID].url);

				if(dialData[dialID].thumb === '' || typeof dialData[dialID].thumb === 'undefined'){
					$('#editDial .inputContainer.center').show();
					if(typeof dialData.color === 'undefined'){
						$('#picker').css('border-color','#'+dialData.color);
					}

					var colorVal = '';
					$('#picker').colpick({
						layout:'hex',
						submit:0,
						colorScheme:'dark',
						onChange:function(hsb,hex,rgb,el,bySetColor) {
							$(el).css('border-color','#'+hex);
							// Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
							if(!bySetColor) $(el).val(hex);
							colorVal = this.value;
							if(nameIn.val() !== '' && urlIn.val() !== '' && colorVal !== ''){
								$('#editDial').find('.submit').removeClass('disabled');
							}else{
								$('#editDial').find('.submit').addClass('disabled');
							}
						}
					}).keyup(function(){
						$(this).colpickSetColor(this.value);
						if(nameIn.val() !== '' && urlIn.val() !== '' && colorVal !== ''){
							$('#editDial').find('.submit').removeClass('disabled');
						}else{
							$('#editDial').find('.submit').addClass('disabled');
						}
					});
				}else{
					$('#editDial .inputContainer.center').hide();
				}
				$('#editDial').find('input').on('keyup', function(){
					if(nameIn.val() !== dialData[dialID].name || urlIn.val() !== dialData[dialID].url){
						if(nameIn.val() !== '' && urlIn.val() !== ''){
							$('#editDial').find('.submit').removeClass('disabled');
						}else{
							$('#editDial').find('.submit').addClass('disabled');
						}
					}else{
						$('#editDial').find('.submit').addClass('disabled');
					}
				});
				
				$('#editDial').addClass('show');
				
				$('#editDial .closeDialog').click( function(){
					$('#editDial').removeClass('show');
					$('#editDial').find('input#name').val('');
					$('#editDial').find('input#url').val('');
				});
				$('#editDial .submit').click( function(){
					if(!$(this).hasClass('disabled')){
						var nameVal = nameIn.val();
						var urlVal = urlIn.val();
						dialData[dialID].name = nameVal;
						dialData[dialID].url = urlVal;
						var colorVal = $('#picker').val();
						if(colorVal !== '' && colorVal !== 'undefined'){
							dialData[dialID].color = colorVal;
						}
						chrome.storage.sync.set(dialData, function(){
							getDials();
						});
					}
				});
			});
		});
		
		$('.dial').on('click', function(e){
			if(!$(this).hasClass('suggestion')){
				var dataThumb = $(this).attr('data-thumbnail');
				var dialID = $(this).attr('data-id');
				var dialURL = $(this).attr('href');
				var timeOfDay = getTimeOfDay();

				if (dataThumb === 1) {
					e.preventDefault();
				}

				var dialsObject = {}
				dialsObject[dialID] = object[dialID];
				
				dialsObject[dialID].smartGroups[thisEnvironment][timeOfDay] = dialsObject[dialID].smartGroups[thisEnvironment][timeOfDay] + 1;

				if (dataThumb === 1) {

					dialsObject[dialID].setThumb = 0;

					chrome.tabs.create({
						url: dialURL
					}, function(tab){
						var isOnce = 1;
						chrome.tabs.onUpdated.addListener( function( updatedTabID, changeInfo, updatedTab ){
							if((tab.id === updatedTabID) && (updatedTab.status === 'complete') && (isOnce === 1)){

								isOnce = 0;
								dialsObject[dialID].favicon = updatedTab.favIconUrl;

								chrome.storage.sync.set(dialsObject, function(){
									chrome.tabs.executeScript( updatedTabID, {
										code : 'localStorage.setItem("dialID",' + dialID + ');'
									}, function(){
										chrome.tabs.executeScript( updatedTabID, {
											file : 'js/min/thumbnail.min.js'
										});
									});
								});
							}
						});
					});

				}else{
					chrome.storage.sync.set(dialsObject);
				}
			}
		});
	}

	function getDials(){

		if($('#dials #topDials').data('isotope')){
			$('#dials #topDials').isotope('destroy');
		}
		if($('#dials #filteredDials').data('isotope')){
			$('#dials #filteredDials').isotope('destroy');
		}
		if($('#dials #suggestedDials').data('isotope')){
			$('#dials #suggestedDials').isotope('destroy');
		}

		if(typeof globalSettings.columns === 'undefined'){
			globalSettings.columns = 5;
		}
		if(globalSettings.columns !== 5){
			var allContainers = $('#dials #topDials, #dials #filteredDials, #dials #suggestedDials');
			allContainers.removeClass().addClass('row count-' + globalSettings.columns);
		}
		chrome.storage.sync.get(null, function(dialsObject){
			
				var dialsList = [];

				for(var dialID in dialsObject){
					var dialValue = dialsObject[dialID];
					if(dialID !== 'settings' && dialID !== 'feedly_api'){
						var extraClasses = '';
						if((typeof dialValue.color === 'undefined') && (!dialValue.thumb || dialValue.thumb === 'undefined' || dialValue.thumb === '')){
							extraClasses += ' usePlaceholder ver-' + dialValue.id;
						}
						if(globalSettings.features.beSmart == true){
							var thisSmartGroups = [
								'data-home-morning="' + dialValue.smartGroups.home.morning + '"',
								'data-home-day="' + dialValue.smartGroups.home.day + '"',
								'data-home-afternoon="' + dialValue.smartGroups.home.afternoon + '"',
								'data-home-evening="' + dialValue.smartGroups.home.evening + '"',
								'data-home-night="' + dialValue.smartGroups.home.night + '"',
								'data-work-morning="' + dialValue.smartGroups.work.morning + '"',
								'data-work-day="' + dialValue.smartGroups.work.day + '"',
								'data-work-afternoon="' + dialValue.smartGroups.work.afternoon + '"',
								'data-work-evening="' + dialValue.smartGroups.work.evening + '"',
								'data-work-night="' + dialValue.smartGroups.work.night + '"'
							]
						}else{
							var homeorder = 1,
								workorder = 1;
							
							if(typeof dialValue.order !== 'undefined'){
								if(typeof dialValue.order.home !== 'undefined'){
									homeorder = dialValue.order.home;
									if(homeorder === 0){
										homeorder = 1;
									}
								}
								if(typeof dialValue.order.work !== 'undefined'){
									workorder = dialValue.order.work;
									if(workorder === 0){
										workorder = 1;
									}
								}
							}
							var thisSmartGroups = [
								'data-home-order="' + homeorder + '"',
								'data-work-order="' + workorder + '"'
							]
						}
						
						var backgroundColor = '';
						if(typeof dialValue.color !== 'undefined'){
							var normalColor = '#' + dialValue.color;
							var lightColor = shadeColor(normalColor, 0.35);
							backgroundColor = 'background: linear-gradient(45deg, ' + normalColor + ' 0%, ' + lightColor + ' 100%) !important;';
						}

						dialsList.push('<div class="column" data-id="' + dialValue.id + '" ' + thisSmartGroups.join(' ') + '><div class="deleteDial" title="Delete" data-id="' + dialValue.id + '"><span class="icon_trash_alt"></span></div><div class="editDial" title="Edit" data-id="' + dialValue.id + '"><span class="icon_pencil"></span></div><a class="dial' + extraClasses + '" href="' + dialValue.url + '" data-id="' + dialValue.id + '" data-thumbnail="' + dialValue.setThumb + '" style="background-image:url(' + dialValue.thumb + '); ' + backgroundColor + '"><div class="dialName"><div class="nameInner"><span class="faviconImg" style="background-image:url(' + dialValue.favicon + ')"></span>' + dialValue.name + '</div></div></a><div class="dialLoader"></div></div>');
					}
				}

				$('#dials #topDials').html(dialsList.join(''));

				if(globalSettings.features.beSmart === true){
					$('#dials #filteredDials').html(dialsList.join(''));
					$('#dials #topDials').isotope({
						itemSelector: '#dials #topDials .column',
						getSortData: {
							homemorning: '[data-home-morning] parseInt',
							homeday: '[data-home-day] parseInt',
							homeafternoon: '[data-home-afternoon] parseInt',
							homeevening: '[data-home-evening] parseInt',
							homenight: '[data-home-night] parseInt',
							workmorning: '[data-work-morning] parseInt',
							workday: '[data-work-day] parseInt',
							workafternoon: '[data-work-afternoon] parseInt',
							workevening: '[data-work-evening] parseInt',
							worknight: '[data-work-night] parseInt'
						},
						sortAscending: false
					});

					$('#dials #filteredDials').isotope({
						itemSelector: '#dials #filteredDials .column',
						getSortData: {
							homemorning: '[data-home-morning] parseInt',
							homeday: '[data-home-day] parseInt',
							homeafternoon: '[data-home-afternoon] parseInt',
							homeevening: '[data-home-evening] parseInt',
							homenight: '[data-home-night] parseInt',
							workmorning: '[data-work-morning] parseInt',
							workday: '[data-work-day] parseInt',
							workafternoon: '[data-work-afternoon] parseInt',
							workevening: '[data-work-evening] parseInt',
							worknight: '[data-work-night] parseInt'
						},
						sortAscending: false
					});
				}else{
					$('#dials #topDials').isotope({
						itemSelector: '#dials #topDials .column',
						getSortData: {
							home: '[data-home-order] parseInt',
							work: '[data-work-order] parseInt'
						},
						sortAscending: {
							home: true,
							work: true
						}
					});	
				}
			if(globalSettings.features.suggestions === true){

				var currDate = new Date;
				var oneWeekBack = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate() - 7).getTime();

				function compileSuggestions(suggestionsObject){
					
					var suggestionsList = [];
					var suggestionCount = 0;
					$.each(suggestionsObject, function(key, suggDial){
						suggestionCount++;
						var thisVisitsGroups = [
							'data-morning="' + suggDial.visits.morning + '"',
							'data-day="' + suggDial.visits.day + '"',
							'data-afternoon="' + suggDial.visits.afternoon + '"',
							'data-evening="' + suggDial.visits.evening + '"',
							'data-night="' + suggDial.visits.night + '"'
						];

						suggestionsList.push('<div class="column" ' + thisVisitsGroups.join(' ') + '><a class="dial suggestion usePlaceholder ver-' + suggestionCount + '" href="' + suggDial.url + '"><div class="dialName"><div class="nameInner">' + suggDial.name + '</div></div></a><div class="dialLoader"></div></div>');
					});

					$('#dials #suggestedDials').html(suggestionsList.join(''));
					$('#dials #suggestedDials').isotope({
						itemSelector: '#dials #suggestedDials .column',
						getSortData: {
							morning: '[data-morning]',
							day: '[data-day]',
							afternoon: '[data-afternoon]',
							evening: '[data-evening]',
							night: '[data-night]'
						},
						sortAscending: false
					});

					showSorting();
				}

				chrome.history.search({
					'text' : '',
					'startTime' : oneWeekBack,
					'maxResults' : 500
				}, function(historyResults){
					
					var urlArray = [];
					var totalLength = Object.keys(dialsObject).length;
					
					for (var i = 1; i < totalLength; i++) {
						if(typeof dialsObject[i] !== 'undefined'){
							var thisItemUrl = dialsObject[i].url;
							var newUrl = thisItemUrl.substr(thisItemUrl.indexOf('://')+3);
							newUrl = newUrl.replace(/www\./g, '');
							if(newUrl.indexOf('/') !== -1) {
								newUrl = newUrl.substr(0, newUrl.indexOf('/'));
							}
							urlArray.push(newUrl);
						}
					}

					var historyObject = {};
					var count = 0;
					
					function historyLoop(count){
						if(count === historyResults.length){
							compileSuggestions(historyObject);
						}else{
							var historyItem = historyResults[count];

							if(historyItem.visitCount > 3 && historyItem.title !== ''){
								var thisHistoryUrl = historyItem.url;
								if(thisHistoryUrl.indexOf('feedly') === -1 && thisHistoryUrl.indexOf('evernote') === -1){
									var thisNewUrl = thisHistoryUrl.substr(thisHistoryUrl.indexOf('://')+3);
									thisNewUrl = thisNewUrl.replace(/www\./g, '');
									if(thisNewUrl.indexOf('/') !== -1) {
										thisNewUrl = thisNewUrl.substr(0, thisNewUrl.indexOf('/'));
									}
									if(urlArray.indexOf(thisNewUrl) === -1){
										historyObject[historyItem.id] = {
											"url" : thisHistoryUrl,
											"name" : historyItem.title,
										}

										chrome.history.getVisits({ 'url' : thisHistoryUrl }, function(visitArray){	
											var visitsCount = {
												"morning" : 0,
												"day" : 0,
												"afternoon" : 0,
												"evening" : 0,
												"night" : 0
											}
											var arrayLength = visitArray.length;
											for (var y = 0; y < arrayLength; y++) {
												var visitItem = visitArray[y];
												var timeOfVisit = getTimeOfDay(visitItem.visitTime);
												visitsCount[timeOfVisit]++;
												if(y === arrayLength - 1){
													historyObject[visitArray[0].id].visits = visitsCount;
													count++;
													if(count <= historyResults.length){
														historyLoop(count);
													}
												}
											}

										});
									}else{
										count++;
										if(count <= historyResults.length){
											historyLoop(count);
										}
									}
								}else{
									count++;
									if(count <= historyResults.length){
										historyLoop(count);
									}
								}
							}else{
								count++;
								if(count <= historyResults.length){
									historyLoop(count);
								}
							}
						}
					}
					historyLoop(count);
				});

				$('#loader').hide();
				$('#dials').addClass('show');

				onDialClick(dialsObject);
				
			}else{
				
				$('#dials #suggestedDials').hide();
				$('#loader').hide();
				$('#dials').addClass('show');

				onDialClick(dialsObject);
				showSorting();
			}

		});
	}
	
	$('#menu li[data-target="dials"]').addClass('active');
	
	$('body').mCustomScrollbar({
		theme: 'light',
		scrollInertia: 300
	});
	
	$('#menu li .menu-icon').click( function(){
		
		var menuTarget = $(this).parent().attr('data-target');
		
		if(menuTarget !== 'evernote' && menuTarget !== 'feedly' && menuTarget !== 'settings'){
			$('#menu li').removeClass('active');
			$(this).parent().addClass('active');
			$('#loader img').attr('src','images/' + menuTarget + '-btn.png');
			$('.content').removeClass('show');
			$('#loader').show();
		}
		
		if(menuTarget === 'dials'){
			getDials();
		}else if(menuTarget === 'apps'){
			getApps();
		}else if(menuTarget === 'pocket'){
			if(!$('#pocket').hasClass('not-logged-in')){
				chrome.storage.sync.get('settings', function(object){
					getPocketList(object.settings.pocket.token, true);
				});
			}else{
				$('#loader').hide();
				$('#pocket').addClass('show');
			}
		}else if(menuTarget === 'evernote'){
			chrome.tabs.create({
				url: 'https://www.evernote.com/Home.action'
			});
		}else if(menuTarget === 'feedly'){
			chrome.tabs.create({
				url: 'http://feedly.com'
			});
		}else if(menuTarget === 'settings'){
			
			$('#settings .columnCount').find('.columns[data-value="' + globalSettings.columns + '"]').addClass('active');
			
			$('#settings').addClass('show');
			
			$('#settings .closeDialog').click( function(){
				$('#settings').removeClass('show');
				$('#import').removeClass('show');
				$('#settingsInput').addClass('show');
				$('#import textarea').val('');
			});
		}
	});
	
	$('#settings').find('.onoffswitch').click( function(){
		var thisCheckbox = $(this).find('.onoffswitch-checkbox');
		var thisValue = thisCheckbox.attr('data-value');
		
		chrome.storage.sync.get('settings', function(settingsData){
			
			if(thisCheckbox.prop('checked')){
				settingsData.settings.features[thisValue] = true;
				$('#menu li[data-target="' + thisValue + '"]').show();
			}else{
				settingsData.settings.features[thisValue] = false;
				$('#menu li[data-target="' + thisValue + '"]').hide();
			}
			
			chrome.storage.sync.set(settingsData, function(){
				if(thisValue === 'beSmart'){
					chrome.tabs.reload();
				}	
			});
			globalSettings = settingsData.settings;
			
		});
		
	});	
	$('#settings .columnCount').find('.columns').click( function(){
		var thisValue = $(this).attr('data-value');
		
		$('#settings .columnCount').find('.columns').removeClass('active');
		$(this).addClass('active');
		
		chrome.storage.sync.get('settings', function(settingsData){

			settingsData.settings.columns = thisValue;
			globalSettings = settingsData.settings;
			
			chrome.storage.sync.set(settingsData, function(){
				getDials();
			});
			
		});
		
	});
	
	$('#settings #speedDialImport').click( function(){
		$('#settingsInput').removeClass('show');
		$('#import').addClass('show');
		$('#import').find('textarea').keyup( function(){
			if($('#import textarea').val() !== ''){
				$('#import-btn').removeClass('disabled');
			}else{
				$('#import-btn').addClass('disabled');
			}
		});
	});
	
	$('#import-btn').click( function(){
		if(!$(this).hasClass('disabled')){
			importFromSpeedDial($('#import textarea').val());
		}
	});
	
	function importFromSpeedDial(textAreaValue){
		var importObject;
		
		try {
			importObject = $.parseJSON(textAreaValue);
		}
		catch (err) {
			alert('cannot load data because: "' + err + '", please try and copy and paste the whole output from SpeedDial 2 anew and try again');
		};
		
		if(typeof importObject !== undefinied){

			if(typeof importObject.dials['0'] !== 'undefined'){
				
				var confirmation = confirm("This will overwrite all your current dials, continue?");
				if (confirmation === true){
					var newDials = {};
					
					var idCount = 1;
					$.each(importObject.dials, function(index, dial){
						newDials[idCount] = {
							"id": idCount,
							"name": dial.title,
							"url": dial.url,
							"thumbnail": "",
							"thumb": "",
							"setThumb": 1,
							"order": {
								"home" : 1,
								"work" : 1
							},
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
						idCount++;
					});
					
					chrome.storage.sync.set( newDials, function() {
						alert('Import successful!');
						$('#import textarea').val('');
						$('#import').removeClass('show');
						$('#settingsInput').addClass('show');
						getDials();
					});
				}
			}else{
				alert('No dials found in the export object, are you sure you have any saved?');
			}
		}
	}
	
	var pocketAPI = "https://getpocket.com/v3/",
		requestAuthPocket = 'oauth/request',
		authPocket = 'oauth/authorize',
		getPocket = 'get',
		modifyPocket = 'send',
		pocketConsumerKey = '29891-62d35387246a98487a6065ee',
		requestToken = '',
		state = location.search.replace('?', '').split('=');
	
	function doPocketIsotope(gridSizer){
		$('#pocketDials').isotope('destroy');	
		$('#pocketDials').isotope({
			itemSelector: '.column',
			layoutMode: 'packery',
			packery: {
				//columnWidth: gridSizer,
				rowHeight: 220
			}
		});
	}
	
	function getPocketList(token, doOutput, showSearch){
		
		showSearch = showSearch || false;
		//var totalCount = -1;
		
		$.getJSON( pocketAPI + getPocket, {
			'consumer_key' : pocketConsumerKey,
			'access_token' : token,
			'sort' : 'newest',
			'detailType' : 'complete',
			//'count' : totalCount
		}).done( function(pocketData){
			
			var delay = 0,
				count = 0,
				output = [],
				pocketList = [];
			
			$.each(pocketData.list, function(itemID, itemObj){
				pocketList.push(itemObj);
			});

			function SortByName(a, b){
				var timeA = a.time_added*1000;
				var timeB = b.time_added*1000;
				return new Date(timeB) - new Date(timeA);
			}
			pocketList.sort(SortByName);
			
			$('#menu li[data-target="pocket"]').find('.count').addClass('show').text(pocketList.length);
			
			if(doOutput === true){
				
				$.each(pocketList, function(itemKey, itemObj){

					var columnClasses = 'column',
						linkClasses = 'pocket-item row',
						articleImage = '',
						timeAdded = new Date(itemObj.time_added*1000),
						formattedTime = $.format.date(timeAdded, 'E dd MMM, yyyy'),
						pocketContent = '',
						buttonClasses = 'buttongrp',
						favBtn = '<span class="pocketModify setAsFav icon_star_alt" data-action="favorite"></span>';

					if(itemObj.favorite === 1){
						columnClasses += ' favorite';
						favBtn = '<span class="pocketModify setAsFav icon_star" data-action="unfavorite"></span>';
						if(itemObj.is_article === 0){
							columnClasses += ' sv-no-big';
						}
					}

					if(itemObj.has_image === 1 || itemObj.has_image === 2){
						
						if(typeof itemObj.image !== 'undefined'){
							articleImage = '<div class="image-container" style="background-image:url(' + itemObj.image.src + ');"></div>';
						}
						if(articleImage.search(/(icon-x-30-white)/i) !== -1) {

							linkClasses += ' error-image';
							articleImage = '';

							if((itemObj.is_article === 0) && (itemObj.favorite !== 1)){
								columnClasses += ' no-big sv-no-big';
							}

						}else{
							linkClasses += ' has-image';				
							buttonClasses += ' has-image';			
						}

					}else{
						linkClasses += ' no-image';

						if((itemObj.is_article === 0) && (itemObj.favorite !== 1)){
							columnClasses += ' no-big sv-no-big';
						}
					}

					if(itemObj.is_article === 1){
						pocketContent = '<span class="pocket-excerpt">' + itemObj.excerpt + '</span>';
					}

					var pocketButtons = '<div class="' + buttonClasses + '">' + favBtn + ' <span class="pocketModify setAsRead icon_check_alt2" data-action="archive"></span> <span class="pocketModify setAsRemove icon_trash_alt" data-action="delete"></span></div>',
						tags = [];

					if(typeof itemObj.tags !== 'undefined'){
						$.each(itemObj.tags, function(key, tagObject){
							tags.push(tagObject.tag);
						});
					}
					
					output.push('<div data-id="' + itemObj.item_id + '" class="' + columnClasses + '"><a class="' + linkClasses + '" href="' + itemObj.resolved_url + '"><div class="pocketLoader"></div>' + articleImage + '<div class="item-text">' + itemObj.resolved_title + '<br/>' + pocketContent + '<span class="pocket-meta">' + formattedTime + '</span><div class="pocketTags" style="display:none;">' + tags.join(' ') + '</div></div></a>' + pocketButtons + '</div>');

					count++;

				});
				
				$('#pocketDials').html(output.join(''));

				$('#loader').hide();
				$('#pocket').addClass('show');

					$('.column').each(function() {
						if($(this).height() == 220){
							console.log($(this).innerWidth());
							doPocketIsotope($(this).innerWidth());
							return false;
						}
					});
				
				if(showSearch === true){
					$('#pocketSearch').addClass('show');
					$('#pocketSearch input#search').focus();
					// quick search regex
					var qsRegex;

					// init Isotope
					var $container = $('#pocketDials').isotope({
						filter: function() {
							return qsRegex ? $(this).text().match( qsRegex ) : true;
						}
					});

					// use value of search field to filter
					var $quicksearch = $('#pocketSearch input#search').keyup( debounce( function() {
						qsRegex = new RegExp( $quicksearch.val(), 'gi' );
						$container.isotope();
					}, 200 ) );

					// debounce so filtering doesn't happen every millisecond
					function debounce( fn, threshold ) {
						var timeout;
						return function debounced() {
							if ( timeout ) {
								clearTimeout( timeout );
							}
							function delayed() {
								fn();
								timeout = null;
							}
							timeout = setTimeout( delayed, threshold || 100 );
						}
					}
				}

				$('.pocketModify').click( function(){
					var thisBtn = $(this);
					var thisColumn = $(this).parent().parent();
					var sendAction = $(this).attr('data-action');
					var itemID = thisColumn.attr('data-id');

					function doModifyCall(){
						$.ajax( pocketAPI + modifyPocket + '?actions=%5B%7B%22action%22%3A%22' + sendAction + '%22%2C%22item_id%22%3A' + itemID + '%7D%5D&access_token=' + token + '&consumer_key=' + pocketConsumerKey )
						.done( function(response){

							if(sendAction === 'favorite'){

								if(thisColumn.hasClass('no-big')){
									thisColumn.removeClass('no-big');
								}
								thisColumn.addClass('favorite');
								thisBtn.removeClass('icon_star_alt');
								thisBtn.addClass('icon_star');
								thisBtn.attr('data-action','unfavorite');

								setTimeout(function(){
									thisColumn.find('.pocketLoader').fadeOut('slow').removeClass('show favorite');
									$('#pocketDials').isotope('layout');
								}, 500);

							}else if(sendAction === 'archive' || sendAction === 'delete'){

								$('#pocketDials').isotope( 'remove', thisColumn ).isotope( 'on', 'removeComplete',
									function( isoInstance, removedItems ) {
										setTimeout(function(){
											$('#pocketDials').isotope('layout');
										}, 500);
									}
								);
								
								var allColumnsCount = 0;
								$('#pocket .column').each( function(i){
									allColumnsCount = i;
								});
								$('#menu li[data-target="pocket"]').find('.count').text(allColumnsCount);

							}else if(sendAction === 'unfavorite'){

								if(thisColumn.hasClass('sv-no-big')){
									thisColumn.addClass('no-big');
								}
								thisColumn.removeClass('favorite');
								thisBtn.removeClass('icon_star');
								thisBtn.addClass('icon_star_alt');
								thisBtn.attr('data-action','favorite');

								setTimeout(function(){
									thisColumn.find('.pocketLoader').fadeOut('slow').removeClass('show unfavorite');
									$('#pocketDials').isotope('layout');
								}, 500);

							}

						}).fail(function( jqxhr, textStatus, error ) {
							var err = textStatus + ", " + error;
							console.log( "Request Failed: " + err );
						});
					}

					if(sendAction === 'delete'){
						$('#confirmation').hide('fast').remove();
						thisBtn.addClass('active');
						$(this).parent().prepend($('<div id="confirmation" class="row">Are you sure?<br/><span id="confirm">Delete</span> <span id="regret">Cancel</span></div>').hide().show('fast'));
						$('#confirm').click( function(){
							$('#confirmation').hide('fast').remove();
							thisBtn.removeClass('active');
							thisColumn.find('.pocketLoader').show().addClass('show delete').html('<span class="delete"></span>');
							doModifyCall();
						});
						$('#regret').click( function(){
							$('#confirmation').hide('fast').remove();
							thisBtn.removeClass('active');
						});
						thisColumn.mouseleave( function(){
							$('#confirmation').hide('fast').remove();
							thisBtn.removeClass('active');
						});
					}else{
						thisColumn.find('.pocketLoader').show().addClass('show ' + sendAction).html('<span class="' + sendAction + '"></span>');
						doModifyCall();
					}

				});
			}
		});
	}
	
	if(state.length !== 0){
		
		if(state[1] === 'authpocket'){

			chrome.storage.sync.get( 'settings', function(object){
				
				if(typeof object.settings.pocketCode !== 'undefined'){
					$.ajax({
						type: "POST",
						url: pocketAPI + authPocket,
						headers : {
							"contentType" : 'application/json; charset=UTF-8',
							"X-Accept" : "application/json"
						},
						data: {
							"consumer_key" : pocketConsumerKey,
							"code" : object.settings.pocketCode
						},
						success: function( data ){
							chrome.storage.sync.get('settings', function(settingsData){
								
								settingsData.settings.pocket = {
									'username': data.username,
									'token': data.access_token
								}
								
								chrome.storage.sync.set( settingsData, function() {
									chrome.tabs.update({
										url : 'chrome://newtab?state=goToPocket',
										active : true
									});
								});
							});
						},
						error: function( jqXHR, textStatus, errorThrown ){
							console.log('jqXHR: ' + jqXHR + 'textStatus: ' + textStatus + 'errorThrown: ' + errorThrown );
							
							var confirmation = confirm("Authorization to Pocket failed, try again?");
							if (confirmation == true) {
								chrome.tabs.reload();
							}else{
								chrome.tabs.update({
									url : 'chrome://newtab',
									active : true
								});
							}
							
						}
					});
				}
				
			});

		}else if(state[1] === 'goToPocket'){
			$(window).load( function(){
				$('#menu li[data-target="pocket"] .menu-icon').trigger( "click" )
			});
		}
	}
	
	$('#authPocket').click( function(){
		$.ajax({
			type: "POST",
			url: pocketAPI + requestAuthPocket,
			headers : {
				"contentType" : 'application/json; charset=UTF-8',
				"X-Accept" : "application/json"
			},
			data: {
				"consumer_key" : pocketConsumerKey,
				"redirect_uri" : "/"
			},
			success: function( data ){
				chrome.storage.sync.get('settings', function(settingsData){
					settingsData.settings.pocketCode = data.code;
					chrome.storage.sync.set( settingsData, function() {
						chrome.tabs.create({
							url: 'https://getpocket.com/auth/authorize?request_token=' + data.code + '&redirect_uri=/'
						}, function(tab){
							chrome.tabs.onUpdated.addListener( function( tabID, info ){
								if(tabID === tab.id){
									if(info.url === 'http://getpocket.com/a/'){
										chrome.tabs.remove( tab.id, function(){
											chrome.tabs.update({
												url : 'chrome://newtab/?state=authpocket',
												active : true
											});

										});
									}
								}
							});
						});
					});
				});
			}
		});
	});
	
	$('#addDial-btn').click( function(){
		$('#addDial').addClass('show');
		$('#addDial input#url').focus();
	});	
	$('#addDial .closeDialog').click( function(){
		$('#addDial').removeClass('show');
		$('#topSitesList').removeClass('show');
		$('#addInputs').addClass('show');
		$('#addDial input#url').val('');
		$('#addDial input#name').val('');
		$('#addDial #innerDialogContent').css({
			'height' : $('#addInputs').height() + 20
		});
	});	
	$('#addInputs').find('input').keyup( function(){
		
		if(($('#addDial input#url').val() !== '') && ($('#addDial input#name').val() !== '')){
			$('#addInputs').find('.submit').removeClass('disabled');
		}else{
			$('#addInputs').find('.submit').addClass('disabled');
		}
		
	});
	
	$('#manageApps-btn').click( function(){
		chrome.tabs.create({
			url: 'chrome://extensions'
		});
	});
	
	$('#searchPocket-btn').click( function(){
		
		$('#menu li').removeClass('active');
		$(this).parent().addClass('active');
		var menuTarget = $(this).parent().attr('data-target');
		$('#loader img').attr('src','images/' + menuTarget + '-btn.png');
		$('.content').removeClass('show');
		$('#loader').show();
		
		chrome.storage.sync.get('settings', function(object){
			getPocketList(object.settings.pocket.token, true, true);
		});
		
	});	
	$('#pocketSearch .closeDialog').click( function(){
		$('#pocketSearch').removeClass('show');
		$('#pocketSearch input#search').val('');
	});	

	$('#addDial').find('#topSitesBtn').click( function(){
		chrome.topSites.get( function(mostVisitedUrls){
			var topSitesList = [];
			$.each(mostVisitedUrls, function(index, value){
				topSitesList.push('<li title="' + value.url + '" data-url="' + value.url + '">' + value.title + '</li>');
			});
			$('#topSitesList ul').html(topSitesList.join(''));
			$('#addInputs').removeClass('show');
			$('#topSitesList').addClass('show');
			$('#addDial #innerDialogContent').css({
				'height' : $('#topSitesList').height()
			});
			$('#topSitesList ul li').click( function(){
				var topTitle = $(this).text();
				var topURL = $(this).attr('data-url');
				$('#addDial input#url').val(topURL);
				$('#addDial input#name').val(topTitle);
				$('#topSitesList').removeClass('show');
				$('#addInputs').addClass('show');
				$('#addDial #innerDialogContent').css({
					'height' : $('#addInputs').height() + 20
				});
				$('#addInputs').find('.submit').removeClass('disabled');
			});
		});	
	});
	
	$('#addInputs').find('.submit').click( function(){
		
		var thisSubmit = $(this);
		var thisURL = $('#addDial input#url').val();
		var thisName = $('#addDial input#name').val();
		
		if(!thisSubmit.hasClass('disabled')){
			function addNewDial(thisID){
				var dialsObject = {}
				dialsObject[thisID] = {
					'id' : thisID,
					'name' : thisName,
					'url' : thisURL,
					'thumb' : '',
					'setThumb' : 1,
					"order": {
						"home" : 1,
						"work" : 1
					},
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
					if(thisSubmit.hasClass('continue')){
						$('#addDial input#url').val('');
						$('#addDial input#name').val('');
						$('#addDial input#url').focus();
					}else{
						$('#addDial input#url').val('');
						$('#addDial input#name').val('');
						$('#addDial').removeClass('show');
					}

					getDials();
					
				});
			}

			chrome.storage.sync.get( null, function(fullObject){
				var objectLength = Object.keys(fullObject).length;
				
				if(objectLength > 1){
					var count = 0;
					var totalCount = objectLength - 1;
					$.each( fullObject, function(key, object){
						count++;
						if (count === totalCount) {
							var thisID = object.id;
							thisID++;
							addNewDial(thisID);
						}
					});
				}else{
					addNewDial(1);
				}
				
			});
		}
		
	});
	
	function getApps(){
		
		function getIconURL(app) {
			if (!app.icons || app.icons.length === 0) {
				return chrome.extension.getURL('icon.png');
			}
			var largest = {size:0};
			for (var i = 0; i < app.icons.length; i++) {
				var icon = app.icons[i];
				if (icon.size > largest.size) {
					largest = icon;
				}
			}
			return largest.url;
		}
		
		chrome.management.getAll( function(app) {
			var appList = [];
			
			$.each(app, function(key, appObject){
				if(appObject.isApp === true && appObject.enabled === true){
					var thisApp = '<div class="column" data-id="' + appObject.id + '"><a href="javascript:void(0);"><img src="' + getIconURL(appObject) + '" /><span class="appName" title="' + appObject.description + '">' + appObject.name + '</span></a></div>';
					appList.push(thisApp);
				}
			});

			if(appList.length !== 0){
				
				$('#apps .row').html(appList.join(''));
				
				$('#loader').hide();
				$('#apps').addClass('show');
				
				$('#apps .row').isotope({
					itemSelector: '#apps .column'
				});
				
				$('#apps .column').click( function(){
					var appID = $(this).attr('data-id');
					chrome.management.launchApp(appID);
				});
			}
		});
		
	}
	
	function getBookmarks(){
		var treeObj = {};
		function loopChildren(childtree){
			for(var i = 0; i < childtree.length; i++){
				if(typeof childtree[i].children !== 'undefined'){
					loopChildren(childtree[i].children);
				}else{
					treeObj[childtree[i].id] = {
						'name' : childtree[i].title,
						'url' : childtree[i].url
					}
				}
			}
		}
		
		chrome.bookmarks.getTree(function(tree){
			loopChildren(tree);
			
			if($.isEmptyObject(treeObj) === false){

					var confirmation = confirm("Found a total of " + Object.keys(treeObj).length + " bookmarks. This will overwrite all your current dials, continue?");
					if (confirmation === true){
						var newDials = {};

						var idCount = 1;
						$.each(treeObj, function(index, dial){
							newDials[idCount] = {
								"id": idCount,
								"name": dial.name,
								"url": dial.url,
								"thumbnail": "",
								"thumb": "",
								"setThumb": 1,
								"order": {
									"home" : 1,
									"work" : 1
								},
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
							idCount++;
						});

						chrome.storage.sync.set( newDials, function() {
							alert('Import successful!');
							getDials();
						});
					}

			}else{
				alert('Sorry! Couldn\'nt find any bookmarks');
			}
		});
	}
	$('#bookmarkImport').click( function(){
		getBookmarks();
	});
});