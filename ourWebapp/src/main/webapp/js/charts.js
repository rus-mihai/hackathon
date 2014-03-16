(function($) {
	$(function() {
		var numberFormat = function(yourNumber) {
			var n= yourNumber.toString().split(".");
		    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		    return n.join(".");
		};

	    var genericTimeChart = dc.barChart("#generic-time-chart");
	    var subcaseTimeChart = dc.lineChart("#subcase-time-chart");
	    var bubbleOverlayChart = dc.bubbleOverlay("#bubble-map")
	            				   .svg(d3.select("#bubble-map svg"));

	    $("div.reset").on("click", "a", function() {
	    	dc.filterAll();
	    	dc.redrawAll();
	    });

	    $.ajax({
			type: "POST",
			url: 'http://192.168.0.100:9200/excel_river/doc/_search',
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			data: JSON.stringify({
				"size": 0, 
			    "aggregations": {
			        "aplications_per_county": {
			            "terms": { "field": "JUDETUL_BENEFICIARULUI","size":100 , "order": {
			               "suma_autorizata": "desc"
			            }},
			             "aggregations": {
			                "suma_autorizata": {
			                   "sum": {
			                      "field": "VALOARE_AUTORIZATA"
			                   }
			                },
			                "suma_rambursata": {
			                   "sum": {
			                      "field": "VALOARE_RAMBURSATA"
			                   }
			                },
			                "year": {
			                    "terms": { "field": "DATA_AUTORIZATA","size":100},
			                    "aggregations": {
			                        "suma_rambursata": {
			                           "sum": {
			                              "field": "VALOARE_RAMBURSATA"
			                           }
			                        },
			                         "suma_autorizata": {
			                   "sum": {
			                      "field": "VALOARE_AUTORIZATA"
			                   }
			                }
			                        
			                }
			                }
			        }
			    }
			}}, ""),
			success: function(data) {
	    		var processedData = [];
	    		$.each(data.aggregations.aplications_per_county.buckets, function(index, bucket) {
	    			$.each(bucket.year.buckets, function(index, yearBucket) {
	    				processedData.push({
	    					key: bucket.key.toLowerCase(),
	    					suma_autorizata: yearBucket.suma_autorizata.value,
	    					suma_rambursata: yearBucket.suma_rambursata.value,
	    					doc_count: yearBucket.doc_count,
	    					year: yearBucket.key
	    				});
	    			});
	    		});

				var data = crossfilter(processedData),
		        	MAX_COUNT = 0,
		        	MIN_COUNT = 0,
		        	MAX_REIMBURSEMENT = 0,
		        	MIN_REIMBURSEMENT = 0;
		
		        var locationDimension = data.dimension(function(d) {
		            return d.key;
		        });
		        
		        var authorizationsByCity = locationDimension.group().reduce(
		        	function(p, v) {
	                	if (v.suma_autorizata)
	                		p.totalAuthorised += v.suma_autorizata;
	                	if (v.suma_rambursata)
	                		p.totalReimbursement += v.suma_rambursata;
	                	p.count += v.doc_count;
	
	                	if (p.count > MAX_COUNT) {
	                		MAX_COUNT = p.count;
	                	} else if (MIN_COUNT == 0  || p.count < MIN_COUNT) {
	                		MIN_COUNT = p.count;
	                	}
	                	if (p.totalReimbursement > MAX_REIMBURSEMENT) {
	                		MAX_REIMBURSEMENT = p.totalReimbursement;
	                	} else if ( MIN_REIMBURSEMENT  == 0 || p.totalReimbursement < MIN_REIMBURSEMENT) {
	                		MIN_REIMBURSEMENT = p.totalReimbursement;
	                	}
	
	                	return p;
	                },
	                function(p, v) {
		            	if (v.suma_autorizata)
		            		p.totalAuthorised -= v.suma_autorizata;
		            	if (v.suma_rambursata)
		            		p.totalReimbursement -= v.suma_rambursata;
		            	p.count -= v.doc_count;
	
		            	if (p.count > MAX_COUNT) {
		            		MAX_COUNT = p.count;
		            	} else if (MIN_COUNT == 0  || p.count < MIN_COUNT) {
		            		MIN_COUNT = p.count;
		            	}
		            	if (p.totalReimbursement > MAX_REIMBURSEMENT) {
		            		MAX_REIMBURSEMENT = p.totalReimbursement;
		            	} else if ( MIN_REIMBURSEMENT  == 0 || p.totalReimbursement < MIN_REIMBURSEMENT) {
		            		MIN_REIMBURSEMENT = p.totalReimbursement;
		            	}
		
		            	return p;
	                },
	                function() {
	                    return {
	                        totalAuthorised:0, totalReimbursement:0, count:0
	                    };
	                }
	    		);
		
		        var yearDimension = data.dimension(function(d) {
		        	return d.year;
		        });
	
		        var authorizationsByYear = yearDimension.group().reduce(
		                function(p, v) {
		                	p.count += v.doc_count;
		                	if (v.suma_rambursata)
		                		p.totalReimbursement += v.suma_rambursata;
	
		                	return p;
		                },
		                function(p, v) {
		                	p.count -= v.doc_count;
		                	if (v.suma_rambursata)
		                		p.totalReimbursement -= v.suma_rambursata;

		                	return p;
		                },
		                function() {
		                    return {
		                    	totalReimbursement: 0,
		                    	count: 0,
		                    	projectCountAccepted: 0
		                    };
		                }
		        );
		
		        bubbleOverlayChart.width(600)
					                .height(450)
					                .dimension(locationDimension)
					                .group(authorizationsByCity)
					                .radiusValueAccessor(function(p) { // bubble radius
					                	var radius = 0;
					                	if (!p) return 1;
					                	if (p.value.count > 0) {
					                		radius = (p.value.count - MIN_COUNT) / (MAX_COUNT - MIN_COUNT) * 1000;
					                	}
					                	if (p.value.count == MAX_COUNT) {
					                		radius = 1000;
					                	}
					                	radius = Math.max(0, radius);
					                	radius = Math.min(radius, 1000);

					                	return radius;
					                })
					                .r(d3.scale.linear().domain([0, 10000]))
					                .colors(["#F5AEB1", "#F59DA1", "#ff7373","#ff4040","#ff0000","#F00C17", "#D40813", "#C7040E", "#a60000", "#8C0707"])
					                .colorDomain([0, 100])
					                .colorAccessor(function(p) { // bubble color
					                	if (!p) return 1;
					                	var ratio = 0;
					                	if (p.value.totalReimbursement > 0) {
					                		ratio = Math.abs(Math.log(((p.value.totalReimbursement - MIN_REIMBURSEMENT) / (MAX_REIMBURSEMENT - MIN_REIMBURSEMENT)))) * 10;
					                	}
					                	if (p.value.totalReimbursement == MAX_REIMBURSEMENT) {
					                		ratio = 100;
					                	}
					                	ratio = Math.max(0, ratio);
					                	ratio = Math.min(ratio, 100);
					                	
					                    return ratio;
					                })
					                .title(function(d) {
					                	if (d)
						                    return "Judet: " + d.key.substring(0, 1).toUpperCase() + d.key.substring(1)
						                            + "\nNumarul de proiecte: " + numberFormat(d.value.count)
						                            + "\nSuma rambursata: " + numberFormat(d.value.totalReimbursement) + " RON";
					                })
					                .renderLabel(false)
				                	.point("bihor", 132, 224)
					                .point("suceava", 337, 178)
									.point("botosani", 396, 148)
									.point("iasi", 425, 201)
									.point("neamt", 368, 216)
									.point("bacau", 396, 261)
									.point("vaslui", 453, 256)
									.point("galati", 454, 310)
									.point("vrancea", 409, 308)
									.point("buzau", 394, 348)
									.point("braila", 454, 364)
									.point("constanta", 494, 426)
									.point("tulcea", 536, 362)
									.point("mehedinti", 166, 415)
									.point("dolj", 213, 444)
									.point("gorj", 196, 379)
									.point("valcea", 243, 370)
									.point("olt", 261, 436)
									.point("arges", 284, 369)
									.point("teleorman", 306, 451)
									.point("giurgiu", 354, 445)
									.point("ialomita", 423, 400)
									.point("calarasi", 408, 424)
									.point("prahova", 355, 367)
									.point("bucuresti", 363, 412)
									.point("satu mare", 180, 156)
									.point("maramures", 233, 168)
									.point("bihor", 132, 224)
									.point("arad", 107, 274)
									.point("timis", 75, 316)
									.point("caras-severin", 120, 364)
									.point("hunedoara", 171, 315)
									.point("alba", 209, 283)
									.point("sibiu", 253, 305)
									.point("brasov", 306, 312)
									.point("covasna", 354, 303)
									.point("harghita", 328, 249)
									.point("mures", 270, 250)
									.point("bistrita-nasaud", 271, 201)
									.point("cluj", 214, 235)
									.point("salaj", 182, 204)
					                .debug(false);
		
		        genericTimeChart.width(360)
								.rangeChart(subcaseTimeChart	)
				                .height(180)
				                .margins({top: 40, right: 50, bottom: 30, left: 80})
				                .dimension(yearDimension)
				                .group(authorizationsByYear, "Numar proiecte")
				                .valueAccessor(function(d) {
				                    return d.value.count;
				                })
	//				                .stack(authorizationsByYear, "Sume solicitate", function(d) { return d.value.totalRequested; })
				                .x(d3.scale.linear().domain([2008, 2014]))
				                .xUnits(function(){return 11;})
				                .renderHorizontalGridLines(true)
				                .centerBar(true)
				                .elasticY(true)
				                .brushOn(false)
				                .legend(dc.legend().x(250).y(10))
				                .title(function(d){
				                    return d.key
				                            + "\nSuma rambursata: " + Math.round(d.value.totalReimbursement);
				                })
				                .xAxis().ticks(5).tickFormat(d3.format("d"));
	
		        subcaseTimeChart.width(360)
				                .height(150)
				                .margins({top: 10, right: 50, bottom: 30, left: 80})
				                .dimension(yearDimension)
				                .group(authorizationsByYear, 'Suma investitii')
				                .valueAccessor(function(d) {
				                    return d.value.totalReimbursement;
				                })
				                .x(d3.scale.linear().domain([2008, 2014]))
				                .renderHorizontalGridLines(true)
				                .elasticY(true)
				                .brushOn(true)
				                .title(function(d){
				                    return d.key + "\nSumata totala de investitii: " + Math.round(d.value.totalReimbursement);
				                })
				                .xAxis().ticks(5).tickFormat(d3.format("d"));
		
		        dc.renderAll();
            }
	    });
	});
}) (jQuery);
