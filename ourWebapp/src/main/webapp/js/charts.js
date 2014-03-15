(function($) {
	$(function() {
		var numberFormat = d3.format(".2f");

	    var caChart = dc.bubbleOverlay("#ca-chart")
	            .svg(d3.select("#ca-chart svg"));

	    var incidentChart = dc.barChart("#incident-chart");

	    var homicideChart = dc.lineChart("#homicide-chart");

	    function isTotalCrimeRateRecord(v) {
	        return v.type == "Total, all violations" && v.sub_type == "Rate per 100,000 population";
	    }

	    function isTotalCrimeIncidentRecord(v) {
	        return v.type == "Total, all violations" && v.sub_type == "Actual incidents";
	    }

	    function isViolentCrimeRateRecord(v) {
	        return v.type == "Total violent Criminal Code violations" && v.sub_type == "Rate per 100,000 population";
	    }

	    function isViolentCrimeIncidentRecord(v) {
	        return v.type == "Total violent Criminal Code violations" && v.sub_type == "Actual incidents";
	    }

	    function isHomicideRateRecord(v) {
	        return v.type == "Homicide" && v.sub_type == "Rate per 100,000 population";
	    }

	    function isHomicideIncidentRecord(v) {
	        return v.type == "Homicide" && v.sub_type == "Actual incidents";
	    }

	    d3.csv("crime.csv", function(csv) {
	        var data = crossfilter(csv);

	        var cities = data.dimension(function(d) {
	            return d.city;
	        });
	        var totalCrimeRateByCity = cities.group().reduce(
	                function(p, v) {
	                    if (isTotalCrimeRateRecord(v)) {
	                        p.totalCrimeRecords++;
	                        p.totalCrimeRate += +v.number;
	                        p.avgTotalCrimeRate = p.totalCrimeRate / p.totalCrimeRecords;
	                    }
	                    if (isViolentCrimeRateRecord(v)) {
	                        p.violentCrimeRecords++;
	                        p.violentCrimeRate += +v.number;
	                        p.avgViolentCrimeRate = p.violentCrimeRate / p.violentCrimeRecords;
	                    }
	                    p.violentCrimeRatio = p.avgViolentCrimeRate / p.avgTotalCrimeRate * 100;
	                    return p;
	                },
	                function(p, v) {
	                    if (isTotalCrimeRateRecord(v)) {
	                        p.totalCrimeRecords--;
	                        p.totalCrimeRate -= +v.number;
	                        p.avgTotalCrimeRate = p.totalCrimeRate / p.totalCrimeRecords;
	                    }
	                    if (isViolentCrimeRateRecord(v)) {
	                        p.violentCrimeRecords--;
	                        p.violentCrimeRate -= +v.number;
	                        p.avgViolentCrimeRate = p.violentCrimeRate / p.violentCrimeRecords;
	                    }
	                    p.violentCrimeRatio = p.avgViolentCrimeRate / p.avgTotalCrimeRate * 100;
	                    return p;
	                },
	                function() {
	                    return {
	                        totalCrimeRecords:0,totalCrimeRate:0,avgTotalCrimeRate:0,
	                        violentCrimeRecords:0,violentCrimeRate:0,avgViolentCrimeRate:0,
	                        violentCrimeRatio:0
	                    };
	                }
	        );

	        var years = data.dimension(function(d) {
	            return d.year;
	        });
	        var crimeIncidentByYear = years.group().reduce(
	                function(p, v) {
	                    if (isTotalCrimeRateRecord(v)) {
	                        p.totalCrimeRecords++;
	                        p.totalCrime += +v.number;
	                        p.totalCrimeAvg = p.totalCrime / p.totalCrimeRecords;
	                    }
	                    if (isViolentCrimeRateRecord(v)) {
	                        p.violentCrimeRecords++;
	                        p.violentCrime += +v.number;
	                        p.violentCrimeAvg = p.violentCrime / p.violentCrimeRecords;
	                    }
	                    if(isHomicideIncidentRecord(v)){
	                        p.homicide += +v.number;
	                    }
	                    p.nonViolentCrimeAvg = p.totalCrimeAvg - p.violentCrimeAvg;
	                    return p;
	                },
	                function(p, v) {
	                    if (isTotalCrimeRateRecord(v)) {
	                        p.totalCrimeRecords--;
	                        p.totalCrime -= +v.number;
	                        p.totalCrimeAvg = p.totalCrime / p.totalCrimeRecords;
	                    }
	                    if (isViolentCrimeRateRecord(v)) {
	                        p.violentCrimeRecords--;
	                        p.violentCrime -= +v.number;
	                        p.violentCrimeAvg = p.violentCrime / p.violentCrimeRecords;
	                    }
	                    if(isHomicideIncidentRecord(v)){
	                        p.homicide -= +v.number;
	                    }
	                    p.nonViolentCrimeAvg = p.totalCrimeAvg - p.violentCrimeAvg;
	                    return p;
	                },
	                function() {
	                    return {
	                        totalCrimeRecords:0,
	                        totalCrime:0,
	                        totalCrimeAvg:0,
	                        violentCrimeRecords:0,
	                        violentCrime:0,
	                        violentCrimeAvg:0,
	                        homicide:0,
	                        nonViolentCrimeAvg:0
	                    };
	                }
	        );

	        caChart.width(600)
	                .height(450)
	                .dimension(cities)
	                .group(totalCrimeRateByCity)
	                .radiusValueAccessor(function(p) {
	                    return p.value.avgTotalCrimeRate;
	                })
	                .r(d3.scale.linear().domain([0, 200000]))
	                .colors(["#ff7373","#ff4040","#ff0000","#bf3030","#a60000"])
	                .colorDomain([13, 30])
	                .colorAccessor(function(p) {
	                    return p.value.violentCrimeRatio;
	                })
	                .title(function(d) {
	                    return "City: " + d.key
	                            + "\nTotal crime per 100k population: " + numberFormat(d.value.avgTotalCrimeRate)
	                            + "\nViolent crime per 100k population: " + numberFormat(d.value.avgViolentCrimeRate)
	                            + "\nViolent/Total crime ratio: " + numberFormat(d.value.violentCrimeRatio) + "%";
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

	        incidentChart
	                .width(360)
	                .height(180)
	                .margins({top: 40, right: 50, bottom: 30, left: 60})
	                .dimension(years)
	                .group(crimeIncidentByYear, "Non-Violent Crime")
	                .valueAccessor(function(d) {
	                    return d.value.nonViolentCrimeAvg;
	                })
	                .stack(crimeIncidentByYear, "Violent Crime", function(d){return d.value.violentCrimeAvg;})
	                .x(d3.scale.linear().domain([1997, 2012]))
	                .renderHorizontalGridLines(true)
	                .centerBar(true)
	                .elasticY(true)
	                .brushOn(false)
	                .legend(dc.legend().x(250).y(10))
	                .title(function(d){
	                    return d.key
	                            + "\nViolent crime per 100k population: " + Math.round(d.value.violentCrimeAvg)
	                            + "\nNon-Violent crime per 100k population: " + Math.round(d.value.nonViolentCrimeAvg);
	                })
	                .xAxis().ticks(5).tickFormat(d3.format("d"));

	        homicideChart
	               .width(360)
	                .height(150)
	                .margins({top: 10, right: 50, bottom: 30, left: 60})
	                .dimension(years)
	                .group(crimeIncidentByYear)
	                .valueAccessor(function(d) {
	                    return d.value.homicide;
	                })
	                .x(d3.scale.linear().domain([1997, 2012]))
	                .renderHorizontalGridLines(true)
	                .elasticY(true)
	                .brushOn(true)
	                .title(function(d){
	                    return d.key
	                            + "\nHomicide incidents: " + Math.round(d.value.homicide);
	                })
	                .xAxis().ticks(5).tickFormat(d3.format("d"));

	        dc.renderAll();
	    });
	});
}) (jQuery)
