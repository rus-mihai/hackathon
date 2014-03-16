$( document ).ready(function() {

$(".one").on("mouseover", function(){
	$(".one").addClass("op");
});
$(".one").on("mouseout", function(){
	$(".one").removeClass("op");
});
$(".two").on("mouseover", function(){
	$(".two").addClass("op");
});
$(".two").on("mouseout", function(){
	$(".two").removeClass("op");
});
$(".three").on("mouseover", function(){
	$(".three").addClass("op");
});
$(".three").on("mouseout", function(){
	$(".three").removeClass("op");
});
$(".four").on("mouseover", function(){
	$(".four").addClass("op");
});
$(".four").on("mouseout", function(){
	$(".four").removeClass("op");
});
$(".five").on("mouseover", function(){
	$(".five").addClass("op");
});
$(".five").on("mouseout", function(){
	$(".five").removeClass("op");
});

$(".root").on("click", function(){
	$(".link").toggleClass("myhidden");
	$(".node").toggleClass("myhidden");
	$(".descDot").fadeToggle("fast");
	if ($(".node").hasClass("myhidden")){
		$('.node').animate({svgR: 0}, 300);
		$('.root').animate({svgR: 90}, 300);
	}else{
		$('.node').animate({svgR: 35}, 300);
		$('.root').animate({svgR: 45}, 300);
	}
	
});

})