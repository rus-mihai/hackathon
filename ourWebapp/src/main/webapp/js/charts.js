(function($) {
	$(function() {
		var numberFormat = d3.format(".2f");

	    var genericTimeChart = dc.barChart("#generic-time-chart");
	    var subcaseTimeChart = dc.lineChart("#subcase-time-chart");
	    var bubbleOverlayChart = dc.bubbleOverlay("#ca-chart")
	            				   .svg(d3.select("#ca-chart svg"));

        var data = crossfilter(window.jsonData);

        var locationDimension = data.dimension(function(d) {
            return d.judetul_beneficiarului;
        });
        
        var authorizationsByCity = locationDimension.group().reduce(
                function(p, v) {
                	p.totalRequested += v.valoare_solicitata;
                	p.totalAuthorised += v.valoare_autorizata;
                	p.totalReimbursement += v.valoare_rambursata;
                	p.count++;
                    
                	p.ratio = (p.totalReimbursement / p.totalRequested) * 100;
                	
                	return p;
                },
                function(p, v) {
                	p.totalRequested -= v.valoare_solicitata;
                	p.totalAuthorised -= v.valoare_autorizata;
                	p.totalReimbursement -= v.valoare_rambursata;
                	p.count--;

                	p.ratio = (p.totalReimbursement / p.totalRequested) * 100;

                	return p;
                },
                function() {
                    return {
                        totalAuthorised:0, totalRequested:0, totalReimbursement:0, count:0
                    };
                }
        );

	        var yearDimension = data.dimension(function(d) {
	        	var year = d.data_autorizarii.substring(6,11);
	            return Number(year);
	        });

	        var authorizationsByYear = yearDimension.group().reduce(
	                function(p, v) {
	                	p.totalRequested += v.valoare_solicitata;
	                	p.totalAuthorised += v.valoare_autorizata;
	                	p.totalReimbursement += v.valoare_rambursata;
	                	p.count++;
	                    
	                	p.ratio = (p.totalReimbursement / p.totalRequested) * 100;
	                	
	                	return p;
	                },
	                function(p, v) {
	                	p.totalRequested -= v.valoare_solicitata;
	                	p.totalAuthorised -= v.valoare_autorizata;
	                	p.totalReimbursement -= v.valoare_rambursata;
	                	p.count--;

	                	p.ratio = (p.totalReimbursement / p.totalRequested) * 100;

	                	return p;
	                },
	                function() {
	                    return {
	                        totalAuthorised:0, totalRequested:0, totalReimbursement:0, count:0
	                    };
	                }
	        );

        bubbleOverlayChart.width(600)
			                .height(450)
			                .dimension(locationDimension)
			                .group(authorizationsByCity)
			                .radiusValueAccessor(function(p) {
//				                    return p.value.count;
			                	return 1;
			                })
			                .r(d3.scale.linear().domain([0, 200000]))
			                .colors(["#ff7373","#ff4040","#ff0000","#bf3030","#a60000"])
			                .colorDomain([13, 30])
			                .colorAccessor(function(p) {
//				                    return p.value.ratio;
			                    return 1;
			                })
			                .title(function(d) {
//			                    return "Judet: " + d.judetul_beneficiarului
//			                            + "\nSuma solicitata: " + numberFormat(d.value.totalRequested)
//			                            + "\nSuma authorizata: " + numberFormat(d.value.totalAuthorised)
//			                            + "\nSuma rambursata: " + numberFormat(d.value.totalReimbursement);
		                		return 'test';
			                })
			                .point("Toronto", 364, 400)
			                .point("Ottawa", 395.5, 383)
			                .point("Vancouver", 40.5, 316)
			                .point("Montreal", 417, 370)
			                .point("Edmonton", 120, 299)
			                .point("Saskatoon", 163, 322)
			                .point("Winnipeg", 229, 345)
			                .point("Calgary", 119, 329)
			                .point("Quebec", 431, 351)
			                .point("Halifax", 496, 367)
			                .point("St. John's", 553, 323)
			                .point("Yukon", 44, 176)
			                .point("Northwest Territories", 125, 195)
			                .point("Nunavut", 273, 188)
			                .debug(false);

	        genericTimeChart.width(360)
			                .height(180)
			                .margins({top: 40, right: 50, bottom: 30, left: 60})
			                .dimension(yearDimension)
			                .group(authorizationsByYear, "Non-Violent Crime")
			                .valueAccessor(function(d) {
			                    return d.value.totalReimbursement;
			                })
			                .stack(authorizationsByYear, "Violent Crime", function(d) {return d.value.totalRequested;})
			                .x(d3.scale.linear().domain([1997, 2012]))
			                .renderHorizontalGridLines(true)
			                .centerBar(true)
			                .elasticY(true)
			                .brushOn(false)
			                .legend(dc.legend().x(250).y(10))
			                .title(function(d){
			                    return d.key
			                            + "\nSuma solicitata: " + Math.round(d.value.totalRequested)
			                            + "\nSuma rambursata: " + Math.round(d.value.totalReimbursement);
			                })
			                .xAxis().ticks(5).tickFormat(d3.format("d"));

	        subcaseTimeChart.width(360)
			                .height(150)
			                .margins({top: 10, right: 50, bottom: 30, left: 60})
			                .dimension(yearDimension)
			                .group(authorizationsByYear)
			                .valueAccessor(function(d) {
			                    return d.value.count;
			                })
			                .x(d3.scale.linear().domain([1997, 2012]))
			                .renderHorizontalGridLines(true)
			                .elasticY(true)
			                .brushOn(true)
			                .title(function(d){
			                    return d.key
			                            + "\nNumarul total de investitii la nivel de tara: " + Math.round(d.value.count);
			                })
			                .xAxis().ticks(5).tickFormat(d3.format("d"));

        dc.renderAll();
	});
}) (jQuery)
