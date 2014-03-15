(function($) {
	$(function() {
		var numberFormat = d3.format(".2f");

	    var genericTimeChart = dc.barChart("#generic-time-chart");
	    var subcaseTimeChart = dc.lineChart("#subcase-time-chart");
	    var bubbleOverlayChart = dc.bubbleOverlay("#harta")
	            				   .svg(d3.select("#harta svg"));

	    d3.csv("contracte-rambursari-new.csv", function(csv) {
	        var data = crossfilter(csv),
	        	MAX_COUNT = 0,
	        	MIN_COUNT = 0,
	        	MAX_REIMBURSEMENT = 0,
	        	MIN_REIMBURSEMENT = 0;
	
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
                	throw "Operation not supported";
                },
                function() {
                    return {
                        totalAuthorised:0, totalRequested:0, totalReimbursement:0, count:0
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
				                .radiusValueAccessor(function(p) { // bubble radius
				                	var radius = 0;
				                	if (p.value.count > 0) {
				                		radius = ((p.value.count - MIN_COUNT) / (MAX_COUNT - MIN_COUNT)) * 1000;
				                	}
				                	if (p.value.count == MAX_COUNT) {
				                		radius = 1000;
				                	}
				                	radius = Math.max(0, radius);
				                	radius = Math.min(radius, 1000);
				                    return radius;
				                })
				                .r(d3.scale.linear().domain([0, 10000]))
				                .colors(["#ff7373","#ff4040","#ff0000","#bf3030","#a60000"])
				                .colorDomain([0, 100])
				                .colorAccessor(function(p) {
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
				                    return "Judet: " + d.key
				                            + "\nSuma solicitata: " + numberFormat(d.value.totalRequested)
				                            + "\nSuma authorizata: " + numberFormat(d.value.totalAuthorised)
				                            + "\nSuma rambursata: " + numberFormat(d.value.totalReimbursement);
				                })
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
