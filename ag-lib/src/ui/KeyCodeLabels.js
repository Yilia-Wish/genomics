goog.provide('ag.ui.KeyCodeLabels');

goog.require('goog.events.KeyCodes');

ag.ui.KeyCodeLabels = {};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var KeyCodes = goog.events.KeyCodes;
var KeyCodeLabels = ag.ui.KeyCodeLabels;

KeyCodeLabels[KeyCodes.F1] = 'F1';
KeyCodeLabels[KeyCodes.WIN_KEY_FF_LINUX] = 'Win';
KeyCodeLabels[KeyCodes.MAC_ENTER] = 'Enter';
KeyCodeLabels[KeyCodes.BACKSPACE] = 'Backspace';
KeyCodeLabels[KeyCodes.TAB] = 'Tab';
KeyCodeLabels[KeyCodes.NUM_CENTER] = 'Numlock';  // NUMLOCK on FF/Safari Mac
KeyCodeLabels[KeyCodes.ENTER] = 'Enter';
KeyCodeLabels[KeyCodes.SHIFT] = 'Shift';
KeyCodeLabels[KeyCodes.CTRL] = 'Ctrl';
KeyCodeLabels[KeyCodes.ALT] = 'Alt';
KeyCodeLabels[KeyCodes.PAUSE] = 'Pause';
KeyCodeLabels[KeyCodes.CAPS_LOCK] = 'Caps Lock';
KeyCodeLabels[KeyCodes.ESC] = 'Esc';
KeyCodeLabels[KeyCodes.SPACE] = 'Space';
KeyCodeLabels[KeyCodes.PAGE_UP] = 'Page up';     // also NUM_NORTH_EAST
KeyCodeLabels[KeyCodes.PAGE_DOWN] = 'Page down';   // also NUM_SOUTH_EAST
KeyCodeLabels[KeyCodes.END] = 'End';         // also NUM_SOUTH_WEST
KeyCodeLabels[KeyCodes.HOME] = 'Home';        // also NUM_NORTH_WEST
KeyCodeLabels[KeyCodes.LEFT] = 'Left';        // also NUM_WEST
KeyCodeLabels[KeyCodes.UP] = 'Up';          // also NUM_NORTH
KeyCodeLabels[KeyCodes.RIGHT] = 'Right';       // also NUM_EAST
KeyCodeLabels[KeyCodes.DOWN] = 'Down';        // also NUM_SOUTH
KeyCodeLabels[KeyCodes.PRINT_SCREEN] = 'Print Screen';
KeyCodeLabels[KeyCodes.INSERT] = 'Ins';      // also NUM_INSERT
KeyCodeLabels[KeyCodes.DELETE] = 'Del';      // also NUM_DELETE
KeyCodeLabels[KeyCodes.FF_SEMICOLON] = ';'; // Firefox (Gecko) fires this for semicolon instead of 186
KeyCodeLabels[KeyCodes.FF_EQUALS] = '='; // Firefox (Gecko) fires this for equals instead of 187
KeyCodeLabels[KeyCodes.META] = 'Meta'; // WIN_KEY_LEFT
KeyCodeLabels[KeyCodes.WIN_KEY_RIGHT] = 'Win (right)';
KeyCodeLabels[KeyCodes.CONTEXT_MENU] = 'Context';
KeyCodeLabels[KeyCodes.NUM_ZERO] = 'Num 0';
KeyCodeLabels[KeyCodes.NUM_ONE] = 'Num 1';
KeyCodeLabels[KeyCodes.NUM_TWO] = 'Num 2';
KeyCodeLabels[KeyCodes.NUM_THREE] = 'Num 3';
KeyCodeLabels[KeyCodes.NUM_FOUR] = 'Num 4';
KeyCodeLabels[KeyCodes.NUM_FIVE] = 'Num 5';
KeyCodeLabels[KeyCodes.NUM_SIX] = 'Num 6';
KeyCodeLabels[KeyCodes.NUM_SEVEN] = 'Num 7';
KeyCodeLabels[KeyCodes.NUM_EIGHT] = 'Num 8';
KeyCodeLabels[KeyCodes.NUM_NINE] = 'Num 9';
KeyCodeLabels[KeyCodes.NUM_MULTIPLY] = 'Num *';
KeyCodeLabels[KeyCodes.NUM_PLUS] = 'Num +';
KeyCodeLabels[KeyCodes.NUM_MINUS] = 'Num -';
KeyCodeLabels[KeyCodes.NUM_PERIOD] = 'Num .';
KeyCodeLabels[KeyCodes.NUM_DIVISION] = 'Num /';
KeyCodeLabels[KeyCodes.F1] = 'F1';
KeyCodeLabels[KeyCodes.F2] = 'F2';
KeyCodeLabels[KeyCodes.F3] = 'F3';
KeyCodeLabels[KeyCodes.F4] = 'F4';
KeyCodeLabels[KeyCodes.F5] = 'F5';
KeyCodeLabels[KeyCodes.F6] = 'F6';
KeyCodeLabels[KeyCodes.F7] = 'F7';
KeyCodeLabels[KeyCodes.F8] = 'F8';
KeyCodeLabels[KeyCodes.F9] = 'F9';
KeyCodeLabels[KeyCodes.F10] = 'F10';
KeyCodeLabels[KeyCodes.F11] = 'F11';
KeyCodeLabels[KeyCodes.F12] = 'F12';
KeyCodeLabels[KeyCodes.NUMLOCK] = 'Num Lock';
KeyCodeLabels[KeyCodes.SCROLL_LOCK] = 'Scroll Lock';

KeyCodeLabels[KeyCodes.SEMICOLON] = ';';            // needs localization
KeyCodeLabels[KeyCodes.DASH] = '-';                 // needs localization
KeyCodeLabels[KeyCodes.EQUALS] = '=';               // needs localization
KeyCodeLabels[KeyCodes.COMMA] = ',';                // needs localization
KeyCodeLabels[KeyCodes.PERIOD] = '.';               // needs localization
KeyCodeLabels[KeyCodes.SLASH] = '/';                // needs localization
KeyCodeLabels[KeyCodes.APOSTROPHE] = '`';           // needs localization
KeyCodeLabels[KeyCodes.TILDE] = '~';                // needs localization
KeyCodeLabels[KeyCodes.SINGLE_QUOTE] = '\'';         // needs localization
KeyCodeLabels[KeyCodes.OPEN_SQUARE_BRACKET] = '[';  // needs localization
KeyCodeLabels[KeyCodes.BACKSLASH] = '\\';            // needs localization
KeyCodeLabels[KeyCodes.CLOSE_SQUARE_BRACKET] = ']'; // needs localization
KeyCodeLabels[KeyCodes.WIN_KEY] = 'Win';
KeyCodeLabels[KeyCodes.MAC_FF_META] = 'Meta'; // Firefox (Gecko) fires this for the meta key instead of 91

/*******************************************************************************************************************/});
