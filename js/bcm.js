let bcm = new BCM();

function BCM() {
  /***************************************************************
    CONSTANTS
  ***************************************************************/
  const OPEN = 0;
  const CLOSED = 1;
  const DEFAULT_STATES = [OPEN, CLOSED];
  const MODE = "TEST";

  // Multipliers for difficulty levels
  const EASY = 1;
  const MEDIUM = 2;
  const HARD = 4;
  const PAIN = 8;

  // Function to swap hash keys and values
  function swap(json) {
    var ret = {};
    for (var key in json) {
      ret[json[key]] = key;
    }
    return ret;
  }

  // Difficulty map, string to value
  const d_map = {
    EASY: EASY,
    MEDIUM: MEDIUM,
    HARD: HARD,
    PAIN: PAIN,
  }

  // Difficulty map, value to string
  const d_val_map = swap(d_map);

  // Local address
  const BASE_URL = "http://192.168.0.50:5000/api/v1/pin/";

  // A bunch of default values
  let current_states = [OPEN, CLOSED];
  let cur_rand_level = null;
  var is_breathing = true;
  let is_interrupt = false;
  let is_resetting = false;
  let eventVar = null;

  // JQuerified DOM elements
  let $bcm_img = $("#bcm-img");
  let $modestate = $("#mode-state");

  // Image class map, moves the sprite around
  let img_classes = {
    "0_0": "bcm-state-0",
    "0_1": "bcm-state-1",
    "1_0": "bcm-state-2",
    "1_1": "bcm-state-3"
  }

  // Pin mappping with default state
  let pins = {
    18: OPEN,
    24: CLOSED
  }

  $modestate.attr("class", "mode-initializing");
  $modestate.text("---INITIALIZING---");

  function updateImage() {
    $bcm_img.attr("class", img_classes[current_states.join("_")]);
  }

  /* OPEN/CLOSE PORT FUNCTIONALITY */
  function openPort(pinNumber) {
    setPort(pinNumber, OPEN);
  }

  function closePort(pinNumber) {
    setPort(pinNumber, CLOSED);
  }

  function setPort(pinNumber, state) {
    if ( MODE === "TEST" ){
      current_states[pins[pinNumber]] = state;
      updateImage();
    } else {
      let url = BASE_URL + pinNumber;

      let request = $.ajax({
        url: url,
        data: {
          value: state
        },
        dataType: "json",
        method: "PATCH"
      });

      request.done(function(msg) {
        console.log("Request succeeded: ", msg, "color: #AFA;");
        current_states[pins[pinNumber]] = state;
        updateImage();
      });

      // This will pass in "TEsT" mode
      request.fail(function(jqXHR, textStatus) {
        console.log("%cERROR: Request failed: " + textStatus, "color: #FAA;");
      });
    }
  }

  function printCurrentStates() {
    console.log("NOT IMPLEMENTED: printCurrentStates()");
    //$.each(pins, function(k, v) {
    //console.log("Pin " + k + " is " + (current_states[v] == CLOSED ? "closed" : "open"));
    //})
  }

  // RESET
  //  - Stops all routines, puts valves back in original/default state
  //  - Magic Numbers, 18, 24, 2000
  //  - 18 and 24 are pins
  //  - 2000 is the default timing for the reset function
  //  - This coincides with the timeout for the random function - SLOPPY
  function reset(msg) {
    is_resetting = true;
    clearTimeout(eventVar);

    console.log("%c---" + msg + "---", "color: #FAA;");
    $modestate.attr("class", "mode-" + msg.toLowerCase());
    $modestate.text(msg + "...");

    setPort(18, DEFAULT_STATES[0]);
    setPort(24, DEFAULT_STATES[1]);
    updateImage();

    setTimeout(function() {
      $modestate.attr("class", "mode-manual");
      $modestate.text("MANUAL");
      console.log("%c---READY---", "color: #AFA;");
      is_resetting = false;
    }, 2000);
  }

  /* CLICK EVENTS */
  $("#pin_18_on").on("click", {
    pin: 18,
    state: OPEN
  }, handleManualClick);
  $("#pin_18_off").on("click", {
    pin: 18,
    state: CLOSED
  }, handleManualClick);
  $("#pin_24_on").on("click", {
    pin: 24,
    state: OPEN
  }, handleManualClick);
  $("#pin_24_off").on("click", {
    pin: 24,
    state: CLOSED
  }, handleManualClick);

  $("#reset").on("click", handleResetClick);

  $("#random_easy").on("click", {
    difficulty: EASY
  }, handleRandomClick);
  $("#random_medium").on("click", {
    difficulty: MEDIUM
  }, handleRandomClick);
  $("#random_hard").on("click", {
    difficulty: HARD
  }, handleRandomClick);
  $("#random_pain").on("click", {
    difficulty: PAIN
  }, handleRandomClick);

  // MANUAL EVENT HANDLER
  function handleManualClick(e) {
    console.log("---MANUAL MODE---");
    clearTimeout(eventVar);
    $modestate.attr("class", "mode-manual");
    $modestate.text("MANUAL");

    if (e.data) {
      setPort(e.data.pin, e.data.state);
    } else {
      console.log("Error handling click!");
    }
  }

  // RESET EVENT HANDLER
  function handleResetClick(e) {
    reset("RESETTING");
  }

  // RANDOM EVENT HANDLER
  //  - Sets up the "eventVar" with some command/timeout
  //  - Magic Numbers, 18, 24, 2050
  //  - 18 and 24 are pins
  //  - 2050 is the default timing for the random function
  //  - This coincides with the timeout for the reset function - SLOPPY
  function handleRandomClick(e) {
    if (is_resetting) {
      console.log("%cERROR: Unable to create random job, currently resetting!", "color:#FAA");
      return;
    }

    console.log("Resetting ports for 2 seconds...");
    reset("PREPARING");

    // set difficulty and increment the job count
    cur_rand_level = e.data.difficulty;
    let d_text = d_val_map[cur_rand_level].toLowerCase();
    let d_text_upper = d_text.toUpperCase();

    eventVar = setTimeout(function() {
      $modestate.text(" ");
      if (d_text == "pain") {
        $modestate.append("<span class='random-" + d_text + "'><i class='fa fa-fire fire'></i> " + "RANDOM " + d_text_upper + "</span>");
      } else {
        $modestate.append("<span class='random-" + d_text + "'>" + "RANDOM " + d_text_upper + "</span>");
      }

      console.log("--SETTING DEFAULT STATE---");
      is_breathing = true;

      setPort(18, DEFAULT_STATES[0]);
      setPort(24, DEFAULT_STATES[1]);

      randomLoop();
    }, 2050);
  }


  // LOOP
  //  - Calls itself, loops forever
  //  - Interrupted by Reset events, Manual events, and Random events
  function randomLoop() {
    var rand = Math.round(5000 + (Math.random() * 5000 * cur_rand_level));
    let d_text = d_val_map[cur_rand_level];

    if (is_breathing) {
      rand = rand / 2;
      console.log("%cRANDOM-" + d_text + ": Enjoy breathing for " + rand / 1000 + " seconds.", "color:#AFA");
    } else {
      console.log("%cRANDOM-" + d_text + ": Say goodbye to your air for " + rand / 1000 + " seconds.", "color:#FAA");
    }

    eventVar = setTimeout(function() {
      if (is_breathing) {
        setPort(18, CLOSED);
        setPort(24, OPEN);
      } else {
        setPort(18, OPEN);
        setPort(24, CLOSED);
      }
      is_breathing = !is_breathing;
      randomLoop();
    }, rand);
  }

  // START
  //  - Initializes the BCM
  //  - Sets all valves/pins to default states
  function init() {
    reset("INITIALIZING");
  }

  init();
}
