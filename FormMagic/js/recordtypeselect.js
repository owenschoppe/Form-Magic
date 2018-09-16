console.log("bug logger recordtypeselect script");

function clickContinue() {
    //TODO check that bug is selected?

    var btns = document.getElementsByName('save');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].title == "Continue") {
            btns[i].click();
        }
    }
}

clickContinue();
