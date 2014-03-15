(function($) {
	$(function() {
		var numberFormat = d3.format(".2f");

	    var genericTimeChart = dc.barChart("#generic-time-chart");
	    var subcaseTimeChart = dc.lineChart("#subcase-time-chart");
	    var bubbleOverlayChart = dc.bubbleOverlay("#harta")
	            				   .svg(d3.select("#harta svg"));

	    d3.csv("contracte-rambursari-new.csv", function(csv) {
	        var data = crossfilter(csv);
	
	        var locationDimension = data.dimension(function(d) {
	            return d.JUDETUL_BENEFICIARULUI.toLowerCase();
	        });
	        
	        var authorizationsByCity = locationDimension.group().reduce(
	        	function(p, v) {
	        		if (v.VALOARE_ELIGIBILA_CERUTA)
	        			p.totalRequested += parseInt(v.VALOARE_ELIGIBILA_CERUTA.replace(',', ''));
                	if (v.VALOARE_AUTORIZATA)
                		p.totalAuthorised += parseInt(v.VALOARE_AUTORIZATA.replace(',', ''));
                	if (v.VALOARE_RAMBURSATA)
                		p.totalReimbursement += parseInt(v.VALOARE_RAMBURSATA.replace(',', ''));
                	p.count++;
                    
                	if (p.totalRequested)
                		p.ratio = (p.totalReimbursement / p.totalRequested) * 100;
                	
                	return p;
                },
                function(p, v) {
                	if (v.VALOARE_ELIGIBILA_CERUTA)
                		p.totalRequested -= parseInt(v.VALOARE_ELIGIBILA_CERUTA.replace(',', ''));
                	if (v.VALOARE_AUTORIZATA)
                		p.totalAuthorised -= parseInt(v.VALOARE_AUTORIZATA.replace(',', ''));
                	if (v.VALOARE_RAMBURSATA)
                		p.totalReimbursement -= parseInt(v.VALOARE_RAMBURSATA.replace(',', ''));
                	p.count--;

                	if (p.totalRequested)
                		p.ratio = (p.totalReimbursement / p.totalRequested) * 100;

                	return p;
                },
                function() {
                    return {
                        totalAuthorised:0, totalRequested:0, totalReimbursement:0, count:1000
                    };
                }
    		);
	
	        var yearDimension = data.dimension(function(d) {
	        	var year = d.DATA_AUTORIZATA.substring(6,10);
	            return Number(year);
	        });

	        var authorizationsByYear = yearDimension.group().reduce(
	                function(p, v) {
	                	if (v.VALOARE_ELIGIBILA_CERUTA)
	                		p.totalRequested += parseInt(v.VALOARE_ELIGIBILA_CERUTA.replace(',', ''));
                		if (v.VALOARE_AUTORIZATA)
                			p.totalAuthorised += parseInt(v.VALOARE_AUTORIZATA.replace(',', ''));
            			if (v.VALOARE_RAMBURSATA)
            				p.totalReimbursement += parseInt(v.VALOARE_RAMBURSATA.replace(',', ''));
	                	p.count++;
	                    
	                	if (p.totalRequested)
	                		p.ratio = (p.totalReimbursement / p.totalRequested) * 100;

	                	return p;
	                },
	                function(p, v) {
	                	if (v.VALOARE_ELIGIBILA_CERUTA)
	                		p.totalRequested -= parseInt(v.VALOARE_ELIGIBILA_CERUTA.replace(',', ''));
	                	if (v.VALOARE_ELIGIBILA_CERUTA)
	                		p.totalAuthorised -= parseInt(v.VALOARE_AUTORIZATA.replace(',', ''));
	                	if (v.VALOARE_RAMBURSATA)
	                		p.totalReimbursement -= parseInt(v.VALOARE_RAMBURSATA.replace(',', ''));
	                	p.count--;

	                	if (p.totalRequested)
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
				                	if (!p)
				                		return 1;
				                    return p.value.count + 100;
				                })
				                .r(d3.scale.linear().domain([0, 200000]))
				                .colors(["#ff7373","#ff4040","#ff0000","#bf3030","#a60000"])
				                .colorDomain([13, 30])
				                .colorAccessor(function(p) {
				                    return p.value.ratio;
				                })
				                .title(function(d) {
				                    return "Judet: " + d.key
				                            + "\nSuma solicitata: " + numberFormat(d.value.totalRequested)
				                            + "\nSuma authorizata: " + numberFormat(d.value.totalAuthorised)
				                            + "\nSuma rambursata: " + numberFormat(d.value.totalReimbursement);
				                })
				                .point("galati", 364, 400)
//				                .point("buzau", 395.5, 383)
//				                .point("Vancouver", 40.5, 316)
//				                .point("galati", 417, 370)
//				                .point("Edmonton", 120, 299)
//				                .point("Saskatoon", 163, 322)
//				                .point("Winnipeg", 229, 345)
//				                .point("Calgary", 119, 329)
//				                .point("Quebec", 431, 351)
//				                .point("Halifax", 496, 367)
//				                .point("St. John's", 553, 323)
//				                .point("Yukon", 44, 176)
//				                .point("Northwest Territories", 125, 195)
//				                .point("Nunavut", 273, 188)
				                .debug(false);
	
		        genericTimeChart.width(360)
				                .height(180)
				                .margins({top: 40, right: 50, bottom: 30, left: 60})
				                .dimension(yearDimension)
				                .group(authorizationsByYear, "Sume autorizate")
				                .valueAccessor(function(d) {
				                    return d.value.totalReimbursement;
				                })
				                .stack(authorizationsByYear, "Sume solicitate", function(d) {return d.value.totalRequested;})
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
	});
}) (jQuery)
