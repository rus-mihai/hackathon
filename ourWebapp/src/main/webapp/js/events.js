(function($) {

	var eventHtml = "<li><a href='http://www.visitclujnapoca.ro' target='_blank'><img src='http://www.visitclujnapoca.ro/images/evenimente/{0}'><div>{1}</div></img></a></li>";

	function loadFund() {

		var query = {
			"query" : {
				"range" : {
					"data_eveniment" : {
						"gte" : "2014-03-6 0:00:00"
					}
				}
			}
		};

		$.ajax({
			type : 'POST',
			data : JSON.stringify(query, ""),
			dataType : "json",
			url : "http://54.72.105.17:8080/events/event/_search",
			success : function(response) {
				var values = response.hits.hits, eventsBannerHtml = "";
				$.each(values, function(index, value) {
					var currentEventHtml = eventHtml.replace("{0}",
							value._source.img);
					eventsBannerHtml += currentEventHtml.replace("{1}",
							value._source.identifier);
				});

				$("#carousel ul").html(eventsBannerHtml);
			}
		});
	}

	$(function() {
		loadFund();

	});
})(jQuery);