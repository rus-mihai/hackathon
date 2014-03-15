var map = new L.Map('map');

var color1 = '#ff6200', color2= '#4380d3';

	// create the tile layer with correct attribution
	//var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmUrl='http://otile{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
	var osmAttrib="Tiles courtesy of <a href='http://www.mapquest.com/' target='_blank'>MapQuest</a> <img src='http://developer.mapquest.com/content/osm/mq_logo.png'>";
	var osm = new L.TileLayer(osmUrl, {minZoom: 12, maxZoom: 18,
	subdomains: "1234", 
	attribution: osmAttrib});		

	// start the map in South-East England
	map.setView(new L.LatLng(46.77,23.59),15);
	map.addLayer(osm);
	
	
	if (navigator.geolocation) {
	  navigator.geolocation.getCurrentPosition(function(position){
		  map.setView(new L.LatLng(position.coords.latitude, position.coords.longitude),15);
		  L.marker([position.coords.latitude, position.coords.longitude]).addTo(map);
	  });
	}
	
	
	var GJ = kizzy('streetGeoJson');
	
	var roadStyle = {
			"color": color1,
			"weight": 4,
			"opacity": 1
		};
		
	function drawGeoJson(name, data) {
		var i;
		for (i=0;i<data.length;i++) {
			drawn[name].push(L.geoJson(data[i], roadStyle).addTo(map));
		}
	}
	
	var drawn = {};
	
	function _drawStreet(name) {
		if (drawn[name] !== undefined) {
			return;
		}
		drawn[name] = [];
		if (GJ.get(name)) {
			drawGeoJson(name, GJ.get(name));
			return;
		}
		drawStreetRecursive(name, [], []);
	}
	
	function drawStreetRecursive(name, geoJsons, excludes, preloadOnly) {
		var url = 'http://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=';
		url += encodeURIComponent(name + ', Cluj-Napoca, Romania');
		
		if (excludes && excludes.length) {
			url += "&exclude_place_ids=" + excludes.join(',');
		}
		
		GJ.set(name, geoJsons);
		if (preloadOnly){
			needPreload++;
			$('a.play').addClass('loading').text('Loading '+Number(preloaded * 100 / needPreload).toFixed(0)+'%');
		}
		jQuery.getJSON(url, function(data){
			if (preloadOnly){
				preloaded++;
				if (preloaded === needPreload-1) {
					startPlayback();
				}
			}

			excludes = excludes || [];
			for (i=0;i<data.length;i++) {
				if (data[i]["class"] === "highway" && (data[i].geojson.type === 'LineString' || data[i].geojson.type === 'Polygon')) {
					//console.log('Drawing', data[i]);
					geoJsons.push(data[i].geojson);
					if (!preloadOnly){
						drawn[name].push(L.geoJson(data[i].geojson, roadStyle).addTo(map));
					}
				}
				excludes.push(data[i].place_id);
			}
			
			if (data.length) {
				drawStreetRecursive(name, geoJsons, excludes, preloadOnly);
			} else {
				GJ.set(name, geoJsons);
				if (geoJsons.length === 0) {
					console.warn('No geo Json data found for [' + name + ']');
				} else {
					console.log('Loaded geo Json data found for [' + name + ']');
				}
			}
			
		}).fail(function() {
			if (preloadOnly){
				preloaded++;
				if (preloaded === needPreload-1) {
					startPlayback();
				}
			}
			GJ.set(name, geoJsons);
			if (geoJsons.length === 0) {
				console.warn('No geo Json data found for [' + name + ']');
			}
		});
	}
	
	
	function cleanName(name) {
		var original = name;
		name = name.toLowerCase();//lowercase
		name = name.replace(/\(.*\)/, '');//remove text between parenthesis
		name = name.replace(/\bsc\..*$/, '');//remove "scara"
		name = name.replace(/\bbl\..*$/, '');//remove "bloc"
		name = name.replace(/\bnr\..*$/, '');//remove street number (with nr. prefix)
		name = name.replace(/\s\d+[a-zA-Z]?(\s*-\s*\d+)*\s*$/, '');//remove street number (no prefix), and number ranges
		name = name.replace(/\s\d+(;\d+)+\s*$/, '');//remove multiple street number (no prefix)
		name = name.replace(/\s(numere|de la).*$/, ' ').trim();//remove special keywords
		name = name.replace(/\s+/, ' ').trim();//remove extra white spaces
		
		//console.log('Cleaned name [' + name + '] from [' + original + ']');
		return name;
	}
	
	function splitNames(name) {
		if (name.indexOf('#') !== -1) {
			return name.split('#');
		}
		if (name.indexOf(' colt ') !== -1) {
			return name.split(' colt ');
		}
		return [name];
	}
	
	function drawStreet(name) {
		
		//first check for street intersections
		var splits = splitNames(name), i;
		
		for (i=0;i<splits.length;i++) {
			_drawStreet(cleanName(splits[i]));
		}
		
		
	}
	
	var hits = [];
	function loadDataFromElasticSearch(){
		
		

		$.getJSON('http://54.72.105.17:8080/spargeri/csv_type/_search', {
			size: 1000,
			"query" : {
				"match_all" : {}
			}
		}, function(data) {
			hits = data.hits.hits;
			prepareData();
			drawChart();
			drawStreets(new Date());
			showSummary();
		});
		
		
		
	}
	
	
	var playBackLoop=0, playBackInterval=0, preloaded = 0, needPreload = 1;
	
	function startPlayback(){
		$('a.play').removeClass('loading').text('Play All');
		$('a.play,a.stop').toggle();
		clearInterval(playBackInterval);
		playBackLoop=-1;
		
		playBackInterval = setInterval(function() {
			playBackLoop++;
			if (playBackLoop === chart.series[0].data.length) {
				clearInterval(playBackInterval);
				$('a.play,a.stop').toggle();
			} else {
				chart.series[0].data[playBackLoop].events.click.call(chart.series[0].data[playBackLoop]);
			}
		},300);
		
		
		
	}
	
	function showSummary(){
		var i, names = {}, splits, j, total=0;
		
		for (i=0;i<hits.length;i++) {
			splits= splitNames(hits[i]._source.loc1_sparg);
			for (j=0;j<splits.length;j++) {
				names[cleanName(splits[j])] = true;
			}
		}
		for (i in names) {total++;}
		$('#total').text(total);
		$('#months').text(maxDate.getFullYear()*12+maxDate.getMonth()-minDate.getFullYear()*12-minDate.getMonth());
		$('#summary a.play').click(function(){
			if ($(this).hasClass('loading')) {
				return false;
			}
			
			if (needPreload === 1) {
				preloadAllStreets();
			} else {
				startPlayback();
			}
			
			
			return false;
		});
		$('#summary a.stop').click(function(){
			clearInterval(playBackInterval);
			$('a.play,a.stop').toggle();
			return false;
		});
	}
	
	
	
	function drawChart() {
		window.chart = new Highcharts.Chart({
			title: '',
	        chart: {
	            renderTo: 'chart',
	            type: 'column',
	            spacing: [10,10,10,10]
	        },

	        xAxis: {
	            type: 'datetime'
	        },
	        yAxis: {
	        	title: {
	        		text: null
	        	}
	        },
	        series: [{ name: 'Broken Streets' ,data: chartData}],
	        legend: {
	        	enabled: false
	        },
	        plotOptions: {
	        	column: {
	        		pointPadding: 0,
	        		borderColor: color2
	        	}
	        }

	    });
		
		var today = Date.today().getTime();
		 for (var i = 0; i < chart.series[0].data.length; i++) {
			 if (chart.series[0].data[i].x === today) {
				 lastUpdatedColumn= chart.series[0].data[i];
				 lastUpdatedColumn.update({ color: color1, oldColor: color1, borderColor: color1 }, true, false);	 
			 }
			 
         }
		
		
		
	}
	
	
	
	var minDate = new Date().addMonths(-1), maxDate = new Date().addMonths(1), dates = {}, chartData = [];
	
	function prepareData(){
		var i, data;
		for (i=0;i<hits.length;i++) {
			data = hits[i]._source;
			data.perioada1_exec = parseDateRange(data.perioada1_exec);
			data.perioada1_refac = parseDateRange(data.perioada1_refac);
			
			calcMinDate(data.perioada1_exec.from, data.perioada1_exec.to, data.perioada1_refac.from, data.perioada1_refac.to);
			calcMaxDate(data.perioada1_exec.from, data.perioada1_exec.to, data.perioada1_refac.from, data.perioada1_refac.to);
			
			groupByDate(data);
			
			
			
		}
		aggregateData();
		console.log(minDate,maxDate);
	}
	
	function cleanStreets(){
		var i, j, geoJsons;
		for (i in drawn) {
			geoJsons = drawn[i];
			for (j=0;j<geoJsons.length;j++){
				map.removeLayer(geoJsons[j]);	
			}
		}
		drawn={};
	}
	
	function drawStreets(date) {
		var data = dates[date.clearTime().getTime()], i;
		cleanStreets();
		if (data) {
			for (i=0;i<data.length;i++) {
				drawStreet(data[i].loc1_sparg);
			}
		}
		
		
	}
	
	var lastUpdatedColumn;
	
	function aggregateData(){
		var i;
		for (i in dates) {
			chartData.push({
				color: color2,
				borderColor: color2,
				x: Number(i),
				y: countDistinctStreets(dates[i]),
				events: {
					click: function(e){
						if (lastUpdatedColumn) {
							lastUpdatedColumn.update({ color: color2, borderColor: color2 }, true, false);
						}
                        this.update({ color: color1, borderColor: color1 }, true, false);
                        this.oldColor=color1;
                        lastUpdatedColumn = this;
						drawStreets(new Date(this.x));
					},
					mouseOver: function(e) {
						this.oldColor = this.color;
						this.update({ color: color1, borderColor: color1 }, true, false);
					},
					mouseOut: function(e){
						this.update({ color: this.oldColor, borderColor: this.oldColor }, true, false);
					}
				}
			});
		}
		chartData.sort(function (a,b) {
			return a.x - b.x;
		});
		chartData = chartData.slice(-200);
	}
	
	var allStreets = {};
	function countDistinctStreets(data){
		var names= {}, i, splits, total=0, name;
		for (i=0;i<data.length;i++) {
			splits= splitNames(data[i].loc1_sparg);
			for (j=0;j<splits.length;j++) {
				name = cleanName(splits[j]);
				allStreets[name] = true;
				names[name]=true;
			}
		}
		for (i in names) {total++;}
		return total;
		
	}
	
	function groupByDate(data) {
		var start = data.perioada1_exec.from, end = data.perioada1_refac.to.getTime();
		
		while (start.getTime() <= end) {
			if (!dates[start.getTime()]) {
				dates[start.getTime()] = [];
			}
			dates[start.getTime()].push(data);
			start = start.addDays(1);
		}
	}
	
	function calcMinDate(){
		var i;
		for (i=0;i<arguments.length;i++) {
			if (arguments[i].getTime() < minDate.getTime()) {
				minDate = arguments[i];
			}
		}
	}
	
	function calcMaxDate(){
		var i;
		for (i=0;i<arguments.length;i++) {
			if (arguments[i].getTime() > maxDate.getTime()) {
				maxDate = arguments[i];
			}
		}
	}
	
	
	function parseDateRange(str) {
		var range = {}, pieces;
		str = str.replace(/\s+/g,'').split('-');
		pieces = str[0].split('.');
		if (str.length == 1) {
			str[1] = str[0];
		}
		range.to = parseDate(str[1]);
		if (pieces.length === 0) {
			str[0] = String(range.to.getDate());
		}
		if (pieces.length <= 1) {
			str[0] += '.' + (range.to.getMonth()+1);
		}
		if (pieces.length <= 2) {
			str[0] += '.' + (range.to.getFullYear());
		}
		
		range.from = parseDate(str[0]);
		
		return range;
	}
	
	function parseDate(str) {
		if (!str) {
			return new Date();
		}
		str = str.split('.');
		if (str[0].length==1) {
			str[0] = '0' + str[0]; 
		}
		if (str[1].length==1) {
			str[1] = '0' + str[1]; 
		}
		if (str[2] === '20' || str[2] === '13') {
			str[2] = '2014';
		}
		if (str[2].length==2) {
			str[2] = '20' + str[2]; 
		}
		return Date.parseExact(str.join('.'), 'dd.MM.yyyy') || new Date();
	}
	
	loadDataFromElasticSearch();
	
	function preloadAllStreets(){
		$('a.play').addClass('loading').text('Loading '+Number(preloaded * 100 / needPreload).toFixed(0)+'%');
		var name;
		for (name in allStreets) {
			if (GJ.get(name)) {
				continue;
			}
			drawStreetRecursive(name, [], [], true);
		}
		if (preloaded === needPreload-1) {
			startPlayback();
		}
	}
	
	