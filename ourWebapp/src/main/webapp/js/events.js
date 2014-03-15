(function($) {

var eventHtml = "<li><a href='http://www.visitclujnapoca.ro' target='_blank'><img src='http://www.visitclujnapoca.ro/images/evenimente/{0}'><div>{1}</div></img></a></li>";
 
 function loadFund() {
	var query = {"query": {
				         "query_string": {
				            "query": "1",
				            "fields": ["dateEvent"]
				        }
				    }
				};

  $.ajax({
  	 type: 'POST',
  	 data: JSON.stringify(query,""),
  	 dataType: "json",
     url : "http://localhost:9200/events/event/_search",
     success : function(response) {
       var values = response.hits.hits, 
       		eventsBannerHtml = "";
       $.each(values, function( index, value ) {
       var currentEventHtml = eventHtml.replace("{0}", value._source.image);
       		eventsBannerHtml += currentEventHtml.replace("{1}", value._source.identifier);
		});
		
		$("#carousel ul").html(eventsBannerHtml);
     }
    });
 }

 $(function() {
  loadFund();
  
 
 });
})(jQuery);