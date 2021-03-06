var R = Raphael("mapCluj", 300, 300),
	attr = {
	    "id": 'mapCluj',
	    "fill": "#E9E9E9",
	    "stroke": "#ffffff",
	    "stroke-width": 1,
	    "stroke-linejoin": "round"
	},
	ro = {};

ro.cj = R.path("m 230.167,192.777 c 0.833,0 1.333,-1.833 2.667,-1.833 1.334,0 4.333,1.333 5.833,1.167 0,0 2.833,4.5 1.833,5 -1,0.5 -6,2.5 -4,6 2,3.5 10,6.5 10.75,9.25 0.75,2.75 -2.5,6.75 -1,8.5 1.5,1.75 8.5,4.25 3.25,14 l -0.125,0.75 c -0.875,0.25 -6,3.125 -6,4.25 0,1.125 3.5,3.375 2.375,5 -1.125,1.625 -5.375,1.5 -5.375,3.75 0,2.25 2,6.25 0.25,7.125 -1.75,0.875 -6.375,1.625 -0.5,9.5 -0.125,-0.375 -6.375,-5.625 -12.875,-5.625 -6.5,0 -6.625,4.875 -10.375,4.25 -3.75,-0.625 -1.625,-4 -0.875,-4.25 0.75,-0.25 -2.5,-2.125 -5.125,-2.125 -2.625,0 -4.25,-0.5 -6.25,-2 -2,-1.5 -5.875,-2 -8,-1.125 -2.125,0.875 -2.125,4.5 -4.25,3.25 -2.125,-1.25 -5.125,0.5 -7,1.75 -1.875,1.25 -4,-3.5 -4.5,-5.5 -0.5,-2 -4.875,-1.25 -6.75,-0.5 -1.875,0.75 -4.5,-2.75 -4.5,-2.75 0.25,-1.125 1.25,-4.625 0.625,-5 -0.625,-0.375 -3.5,0.625 -3.5,-0.125 0,-0.75 1,-5.5 -1,-6.75 -2,-1.25 -2.25,-2.5 -3.25,-3.625 -1,-1.125 -0.5,-1.5 -0.5,-1.5 0,0 4.5,0.125 5,-0.75 0.5,-0.875 0.625,-3.625 0.625,-3.625 0,0 2.5,-2.5 1.75,-3.5 -0.75,-1 -4.125,-1.75 -5,-3.375 -0.875,-1.625 1.625,-2.875 1.625,-4.25 0,0 7.5,0.5 10,2.25 2.5,1.75 1.5,5.25 4,5.25 2.5,0 6.5,4.5 8.25,4.5 1.75,0 6.75,-1.75 6.75,-1.75 l 0.5,-7.25 c 0,0 4.5,6.25 5.75,5.25 1.25,-1 6.75,-8.25 8.75,-9.25 2,-1 -1.75,-3 -1.25,-4.75 0.5,-1.75 2,-5 2.75,-5 0.75,0 7.5,-0.25 7.75,-1.5 0.25,-1.25 4.25,-7.75 7.25,-7.25 3,0.5 4,2.5 4.25,1.75 0.25,-0.75 -0.583,-7.584 -0.583,-7.584 z").attr(attr)

var judete = {
    cj: 'Cluj'
};

for (var judet in ro) {
    ro[judet].color = '#c5ced8';
    
    (function (st, judet) {
        st.attr({
            'id': judet,
            'title': judete[judet]
        }).click(function(e){e.preventDefault()});

        st.hover(
                function(){
                    if ( !$(this[0]).attr('sel') ) st.animate({fill: st.color}, 200);
                    R.safari();
                    $(judet).css('display','block');
                },
                function(){
                    if ( !$(this[0]).attr('sel') ) st.animate({fill: "#E9E9E9"}, 200);
                    R.safari();
                }
            )
            .click(function(){
            	$("#mapCluj, #mapClujOverlay").fadeOut('slow');
        		$('#bubble-map').fadeIn('slow');
            });
        
        // unde punem numele prescurtate ale judetelor
        var w = st.getBBox().width,
            h = st.getBBox().height,
            svg_l = $('#mapCluj').offset().left, 
            svg_t = $('#mapCluj').offset().top, 
            off = $(st[0]).offset(), 
            ol = off.left, 
            ot = off.top, 
            stg = ol - svg_l,  
            sus = ot - svg_t, 
            left = stg + w / 2, 
            top =  sus + h / 2;

        // we don't live in a perfect world
        if (judet == 'cj') top  = top  * 1.05;

        ro[judet].judete = R
                            .attr({
                                   fill: '#47555c',
                                   font: 'bold 10px arial,helvetica,sans-serif'
                            });

    })(ro[judet], judet);
}
