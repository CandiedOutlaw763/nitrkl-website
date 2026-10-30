$(document).ready(function () {

    var topmenu = $('#topmenu').val();
    var submenu = $('#submenu').val();
    var thirdmenu = $('#thirdmenu').val();

    $('.nav-menu a').removeClass('active');
    $('.nav-menu li').removeClass('active');

    if (topmenu != "" && submenu != "") {
        $('#' + topmenu).addClass("active");
        $('#' + submenu).addClass("active");

        if (thirdmenu != "") {
            $('#' + thirdmenu).addClass("active");
        }
    }

    $('.outside-link').click(function () {
        return confirm('This link shall take you to a page/website outside this website. For any query regarding the contents of the linked page/website, please contact the administrator of the concerned website.')
    });

    $('#increase').click(function () {
        modifyFontSize('increase');
    });
    $('#decrease').click(function () {
        modifyFontSize('decrease');
    });
    $('#reset').click(function () {
        modifyFontSize('reset');
    })

});

function modifyFontSize(action) {
    var divElement = $('.body');
    var currentFontSize = parseInt(divElement.css('font-size'));

    if (action == 'increase')
        currentFontSize += 3;
    else if (action == 'decrease')
        currentFontSize -= 3;
    else
        currentFontSize = 14;

    if (currentFontSize > 25) {
        currentFontSize = 25;
    }
    else if (currentFontSize < 10) {
        currentFontSize = 10;
    }

    divElement.animate({ 'fontSize': currentFontSize }, 300);
}

function googleTranslateElementInit() {
    var panel = document.getElementById("translatePanel");
    if (typeof google !== 'undefined' && google.translate && google.translate.TranslateElement) {
        new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,hi,or' }, 'google_translate_element');
    }
    if (panel) {
        panel.classList.toggle("hide");
    }
}

function toggleTranslate() {
    var panel = document.getElementById("translatePanel");
    panel.classList.toggle("show");
}