// Stiky Header=====
$(window).scroll(function () {
    if ($(window).scrollTop() >= 100) {
        $('.nav-container').addClass('fixed-header');
        $('.onscroll-logo').show();
        $('.nav-container .container').addClass('onscroll-container');
        $('.nav-container .container .navigation').addClass('navigation-paading-left');
        $('.nav-menu').css({
            'background': 'transparent',
        });
        $('.nav-menu>li>a').css({
            'color': '#000',
        });
        $('.nav-menu>li.active>a').css({
            'color': '#fff',
            'background-color': '#771D1D',
        });
        $('.nav-menu>li .submenu-indicator-chevron').css({
            'border-color': '#000',
        });

    } else {
        $('.nav-container').removeClass('fixed-header');
        $('.nav-container .container').removeClass('onscroll-container');
        $('.nav-container .container .navigation').removeClass('navigation-paading-left');
        $('.onscroll-logo').hide();
        $('.nav-menu').css({
            'background': 'rgba(50,50,50,0.2)',
        });
        $('.nav-menu>li>a').css({
            'color': '#fff',
        })
        $('.nav-menu>li .submenu-indicator-chevron').css({
            'border-color': '#fff',
        });
    }
});



$('.counter').countUp(); // counter




// vertical tabs academic programe
if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
    document.querySelectorAll('#myTab a').forEach(function (everyitem) {
        var tabTrigger = new bootstrap.Tab(everyitem);
        everyitem.addEventListener('mouseenter', function () {
            tabTrigger.show();
        });
    });
}

// Hero Carousel Controls Click Handlers
$(document).ready(function () {
    $('#carouselExampleCaptions .carousel-control-prev').on('click', function (e) {
        e.preventDefault();
        var el = document.getElementById('carouselExampleCaptions');
        if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
            bootstrap.Carousel.getOrCreateInstance(el).prev();
        } else if (window.jQuery && $(el).carousel) {
            $(el).carousel('prev');
        }
    });

    $('#carouselExampleCaptions .carousel-control-next').on('click', function (e) {
        e.preventDefault();
        var el = document.getElementById('carouselExampleCaptions');
        if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
            bootstrap.Carousel.getOrCreateInstance(el).next();
        } else if (window.jQuery && $(el).carousel) {
            $(el).carousel('next');
        }
    });
});

//===Research Slider
$('.rearch-slider').owlCarousel({
    loop: false,
    margin: 40,
    autoplay: false,
    nav: false,
    dots: false,
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 2
        },
        1000: {
            items: 3
        }
    }
});

$('.gov-slider').owlCarousel({
    loop: true,
    margin: 40,
    nav: true,
    autoplay: true,
    responsive: {
        0: {
            items: 2
        },
        600: {
            items: 4
        },
        1000: {
            items: 6
        }
    }
});

if ($('.upcoming-event-slider').length > 0) {
    $('.upcoming-event-slider').owlCarousel({
        loop: true,
        margin: 40,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            1000: {
                items: 2
            }
        }
    });
}

if ($('.news-slider').length > 0) {
    $('.news-slider').owlCarousel({
        loop: true,
        margin: 35,
        nav: false,
       
        autoplay: true,
        autoplayTimeout: 4000,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            1000: {
                items: 2
            }
        }
    });
}

if ($('.admissions-slider').length > 0) {
    $('.admissions-slider').owlCarousel({
        loop: true,
        margin: 15,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 3
            },
            600: {
                items: 4
            },
            1000: {
                items: 5
            }
        }
    });
}

if ($('.awards-slider').length > 0) {
    $('.awards-slider').owlCarousel({
        loop: true,
        margin: 15,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            1000: {
                items: 1
            }
        }
    });
}

if ($('.IPR-slider').length > 0) {
    $('.IPR-slider').owlCarousel({
        loop: true,
        margin: 15,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            }
        }
    });
}

if ($('.incubation-slider').length > 0) {
    $('.incubation-slider').owlCarousel({
        loop: true,
        margin: 15,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            }
        }
    });
}

if ($('.faculty-awards-slider').length > 0) {
    $('.faculty-awards-slider').owlCarousel({
        loop: true,
        margin: 15,
        nav: false,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            }
        }
    });
}

if ($('.department-faculty-slier').length > 0) {
    $('.department-faculty-slier').owlCarousel({
        loop: true,
        margin: 15,
        nav: true,
        autoplay: true,
        dots: false,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            }
        }
    });
}
if ($('.department-sponso-pro-slier').length > 0) {
    $('.department-sponso-pro-slier').owlCarousel({
        loop: true,
        margin: 40,
        nav: true,
        autoplay: true,
        dots: false,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            1000: {
                items: 1
            }
        }
    });
}


$('.archi-news-happenings-slider').owlCarousel({
    loop: true,
    margin: 40,
    nav: false,
    autoplay: true,
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 3
        },
        1000: {
            items: 3
        }
    }
});


$('.science-news-happenings-slider').owlCarousel({
    loop: true,
    margin: 40,
    nav: false,
    autoplay: true,
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 3
        },
        1000: {
            items: 3
        }
    }
});


if ($(".seminar-scroll").length > 0) {
    $(".seminar-scroll").bootstrapNews({
        newsPerPage: 4,
        autoplay: true,
        pauseOnHover: true,
        navigation: false,
        direction: 'up',
        newsTickerInterval: 3000,
        onToDo: function () {}
    });

}

if ($(".event-scroll").length > 0) {
    $(".event-scroll").bootstrapNews({
        newsPerPage: 5,
        autoplay: true,
        pauseOnHover: true,
        navigation: false,
        direction: 'up',
        newsTickerInterval: 3000,
        onToDo: function () { }
    });

}



$(function () {
    // add all to same gallery
    $(".gallery a").attr("data-fancybox", "mygallery");
    // assign captions and title from alt-attributes of images:
    $(".gallery a").each(function () {
        $(this).attr("data-caption", $(this).find("img").attr("alt"));
        $(this).attr("title", $(this).find("img").attr("alt"));
    });
    // start fancybox:
    $(".gallery a").fancybox();


    

});



(function () {

    var timerId = null;

    function startSetInterval() {
        timerId = setInterval(function () {
            $(".scrollitem:first").slideUp();
            setTimeout(function () {
                $(".scrollitem:first").fadeIn().appendTo(".scrollgroup")
            }, 300);
        }, 2000);
    }
    startSetInterval();

    $('.scrollitem').mouseover(function () {
        clearInterval(timerId);
    }).mouseout(function () {
        startSetInterval();
    });

})();

$(document).ready(function () {

    $(".filter-button").click(function () {
        var value = $(this).attr('data-filter');

        if (value == "all") {
            //$('.filter').removeClass('hidden');
            $('.filter').show('1000');
        }
        else {
            //$('.filter[filter-item="'+value+'"]').removeClass('hidden');
            //$(".filter").not('.filter[filter-item="'+value+'"]').addClass('hidden');
            $(".filter").not('.' + value).hide('3000');
            $('.filter').filter('.' + value).show('3000');
            $(this).addClass("active");
        }
    });

});

if ($('.gridFilter button').length) {
    var projectfiler = $('.gridFilter button');
    if (projectfiler.length) {
        $('.gridFilter button').on('click', function (event) {
            $(this).siblings('.active').removeClass('active');
            $(this).addClass('active');
            event.preventDefault();
        });
    }
}


new WOW().init();

// Trigger CSS animations on scroll.
// Detailed explanation can be found at http://www.bram.us/2013/11/20/scroll-animations/

// Looking for a version that also reverses the animation when
// elements scroll below the fold again?
// --> Check https://codepen.io/bramus/pen/vKpjNP





//    const observer = new IntersectionObserver(entries => {
//        // Loop over the entries
//        entries.forEach(entry => {
//            // If the element is visible
//            if (entry.isIntersecting) {
//                // Add the animation class
//                entry.target.classList.add('image-animation');
//            }
//        });
//    });

//const viewbox = document.querySelectorAll('.animatable');
//    viewbox.forEach(image => {
//        observer.observe(image);
//    });



