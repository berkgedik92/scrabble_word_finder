let language = new URLSearchParams(window.location.search).get("lang");
let configuration = {};

if (language === "tr") {
    configuration = configurationTr;
}
else {
    language = "en";
    configuration = configurationEn;
}

/*Reference to a clicked DOM element (letter container for user userHand or board cell)*/
let focused_element_DOM = null;

/*True if a cell in board is focused, otherwise false*/
let is_board_focused = false;

/*DOM elements for containers of user letters*/
let user_letters_DOM = [];

/*For each cell in the board, keeps if the letter on the cell is committed*/
let is_cell_committed = Array.from({length: configuration.board_size}, () => new Array(configuration.board_size).fill(false));

/*For each cell in the board, keeps if the letter on the cell is changed since the last commit*/
let is_cell_changed = Array.from({length: configuration.board_size}, () => new Array(configuration.board_size).fill(false));

/*Reference to the game object that handles the suggestion logic*/
let game;

/*Map from ASCII code to the index of letter in the alphabet*/
let ascii_to_letter_index = {};

let property_index_to_string = {
    0:   "NO_PROPERTY_CELL",
    1:   "LETTER_DOUBLE_POINT_CELL",
    2:   "LETTER_TRIPLE_POINT_CELL",
    3:   "WORD_DOUBLE_POINT_CELL",
    4:   "WORD_TRIPLE_POINT_CELL"
};

function getCellDOM(row_index, col_index) {
    return $("#board_cell" +  (row_index * configuration.board_size + col_index));
}

function setBackgroundImage(element_DOM, image) {
    element_DOM.css("background-image", "url('visual/" + image + "')");
}

function removeBackgroundImage(element_DOM) {
    element_DOM.css("background-image", "");
}

function getPropertyImageOfCell(element_DOM, game) {
    let row_index = parseInt(element_DOM.attr("row_index"));
    let col_index = parseInt(element_DOM.attr("col_index"));
    let property = game.rowRegions[row_index].cells[col_index].property;
    return configuration.cell_images[property_index_to_string[property]];
}

function getLetterImage(ascii_code) {
    let index = ascii_to_letter_index[ascii_code];
    return game.index_to_alphabet[index].image;
}

function ClearBoardCell(row_index, col_index) {
    let element = getCellDOM(row_index, col_index);
    element.removeAttr("letter");
    setBackgroundImage(element, getPropertyImageOfCell(element, game));
    is_cell_changed[row_index][col_index] = false;
}

$(document).ready(function() {

    if (language === "tr") {
        $("#language_selector .language").eq(1).css("background-color", "lightblue");
        $("#language_selector .language").eq(1).css("font-size", "25px");
    }
    else {
        $("#language_selector .language").eq(0).css("background-color", "lightblue");
        $("#language_selector .language").eq(0).css("font-size", "25px");
    }

    //Create the map to go from ASCII code to the properties of the corresponding letter
    $.each(configuration.alphabet, function(index, element) {
        let ascii_code = element.letter.toLocaleUpperCase(language);
        element["ascii"] = ascii_code;
        ascii_to_letter_index[ascii_code] = index;
    });

    //Create the game
    game = new Game(configuration);

    let board_container     = $("#board_container");
    let left_numbers        = $("#left_numbers");
    let user_hand_container = $("#user_hand_container");

    //Create the row numbers on the left of the game board and board cells
    for (let row_index = 0; row_index < configuration.board_size; row_index++) {

        //Add the row number
        left_numbers.append($("<div/>", {class: "left_number"}).html(row_index + 1));

        //Create the row which will keep the cells
        let row_DOM = $("<div/>", {class: "board_row_container"});

        for (let col_index = 0; col_index < configuration.board_size; col_index++) {

            let cell_index = row_index * configuration.board_size + col_index;
            let cell = $("<div/>", {
                class:      "board_cell",
                id:         "board_cell" + cell_index,
                row_index:  row_index,
                col_index:  col_index
            });
            row_DOM.append(cell);

            //Event listener for this board cell
            cell.click(function(event) {
                if (focused_element_DOM)
                    focused_element_DOM.removeClass("focused");
                focused_element_DOM = $(event.target);
                focused_element_DOM.addClass("focused");
                is_board_focused = true;
            });

            //Fix the background image of the cell according to its property
            setBackgroundImage(cell, getPropertyImageOfCell(cell, game));
        }
        board_container.append(row_DOM);
    }

    //Create letter containers for user userHand
    for (let i = 0; i < configuration.maximum_number_of_letters; i++)
        user_hand_container.append($("<div/>", {class: "hand_cell"}));

    user_letters_DOM = $('.hand_cell').click(function(event) {
        if (focused_element_DOM)
            focused_element_DOM.removeClass("focused");
        focused_element_DOM = $(event.target);
        focused_element_DOM.addClass("focused");
        is_board_focused = false;
    });
});

$(document).keydown(function (e) {
    if (focused_element_DOM === null)
        return;

    focused_element_DOM.removeClass("focused");

    e.preventDefault();
    let k = e.originalEvent.key.toLocaleUpperCase(language);

    //If a cell on board was focused...
    if (is_board_focused) {

        let row_index = parseInt(focused_element_DOM.attr("row_index"));
        let col_index = parseInt(focused_element_DOM.attr("col_index"));

        //If arrow keys are pressed, then update the focused cell
        if (e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40) {

            if (e.keyCode === 37 && col_index > 0)
                col_index--;
            else if (e.keyCode === 38 && row_index > 0)
                row_index--;
            else if (e.keyCode === 39 && col_index < configuration.board_size - 1)
                col_index++;
            else if (e.keyCode === 40 && row_index < configuration.board_size - 1)
                row_index++;

            focused_element_DOM = getCellDOM(row_index, col_index);
        }

        //If DELETE key is pressed and if the value in focused cell is not committed before, remove it
        else if ((e.keyCode === 46 || e.keyCode === 8) && !is_cell_committed[row_index][col_index]) {
            ClearBoardCell(row_index, col_index);
        }

        //If a letter key is pressed, and if the value in focused cell is not committed before,
        //show the letter on the cell
        else if (Object.keys(ascii_to_letter_index).indexOf(k) !== -1 && !is_cell_committed[row_index][col_index]) {
            focused_element_DOM.attr("letter", k); // e.keyCode);
            setBackgroundImage(focused_element_DOM, getLetterImage(k)); //e.keyCode));
            is_cell_changed[row_index][col_index] = true;
        }
    }

    //If the focused cell is userHand cell
    else {
        let current_index = user_letters_DOM.index(focused_element_DOM);

        //If LEFT ARROW is pressed, change the focused element
        if (e.keyCode === 37) {
            if (current_index !== 0)
                current_index = current_index - 1;
            else
                current_index = configuration.maximum_number_of_letters - 1;
            focused_element_DOM = user_letters_DOM.eq(current_index);
        }

        //If RIGHT ARROW is pressed, change the focused element
        else if (e.keyCode === 39) {
            if (current_index !== configuration.maximum_number_of_letters - 1)
                current_index = current_index + 1;
            else
                current_index = 0;
            focused_element_DOM = user_letters_DOM.eq(current_index);
        }

        //If DELETE is pressed, remove the letter from this userHand cell
        else if (e.keyCode === 46 || e.keyCode === 8) {
            focused_element_DOM.removeAttr("letter");
            removeBackgroundImage(focused_element_DOM);
            UpdateUserHand();
        }

        //If a letter key is pressed show the letter on the cell
        else if (Object.keys(ascii_to_letter_index).indexOf(k) !== -1) {
            focused_element_DOM.attr("letter", k);
            setBackgroundImage(focused_element_DOM, getLetterImage(k));
            UpdateUserHand();
        }
    }
    focused_element_DOM.addClass("focused");
});

//Informs the game object about all changes since the last commit
function Commit() {
    for (let row_index = 0; row_index < configuration.board_size; row_index++)
        for (let col_index = 0; col_index < configuration.board_size; col_index++)
            if (is_cell_changed[row_index][col_index]) {

                is_cell_changed[row_index][col_index] = false;
                is_cell_committed[row_index][col_index] = true;

                let ascii_code = getCellDOM(row_index, col_index).attr("letter");
                let letter_index = ascii_to_letter_index[ascii_code];

                game.CommitLetter(letter_index, row_index, col_index);
            }
}

//Informs the game object about the letter in the userHand of the user
function UpdateUserHand() {

    for (let i = 0; i < game.alphabet_size; i++)
        game.userHand[i] = 0;

    for (let i = 0; i < configuration.maximum_number_of_letters; i++) {
        let ascii_code = user_letters_DOM.eq(i).attr("letter");

        //Check if the current user letter container is empty or not, if not empty add the corresponding letter
        //to the user userHand in the game object.
        if (ascii_code) {
            let letter_index = ascii_to_letter_index[ascii_code];
            game.userHand[letter_index]++;
        }
    }
}

//For a word candidate, shows all letters of the candidate on the board so user
//can see what is the suggestion. The shown letters are not committed so user can remove them by
//seeing another candidate or by pressing clear button
function ShowWordCandidateOnBoard(candidate) {

    ClearLettersOnBoard();

    let row = candidate.getStartRow();
    let col = candidate.getStartColumn();
    let word = candidate.getWord();

    $.each(word.getLetters(), function(index, letter) {
        if (!is_cell_committed[row][col]) {
            let letter_image = game.index_to_alphabet[letter].image;
            let ascii_code = game.index_to_alphabet[letter].ascii;
            let element_DOM = getCellDOM(row, col);

            element_DOM.attr("letter", ascii_code);
            setBackgroundImage(element_DOM, letter_image);
            is_cell_changed[row][col] = true;
        }
        if (candidate.isHorizontal())
            col += 1;
        else
            row += 1;
    });
}

//Shows all candidates in the "candidate_list" on the "results_container"
function ShowWordCandidates() {

    let candidate_list = game.FindCandidates();

    let candidates_container = $("#results_container");
    candidates_container.html("");

    $.each(candidate_list, function(candidate_index, element) {

        let candidate_level = "low";
        if (element.point > 30)
            candidate_level = "critical";
        else if (element.point > 20)
            candidate_level = "high";
        else if (element.point > 10)
            candidate_level = "medium";

        let text = "";

        $.each(element.candidate.getWord().getLetters(), function (index, letter_index) {
           text +=  game.index_to_alphabet[letter_index].letter;
        });

        text += " " + element.point;

        let candidate_DOM = $("<div/>", {
            text:           text,
            class:          "candidate_cell " + candidate_level,
            candidate_index: candidate_index
        });

        candidate_DOM.click(function() {
            ShowWordCandidateOnBoard(element.candidate);
        });

        candidates_container.append(candidate_DOM);
    });
}

/* Removes all letters that have been added and not committed from the board */
function ClearLettersOnBoard() {
    for (let row_index = 0; row_index < configuration.board_size; row_index++)
        for (let col_index = 0; col_index < configuration.board_size; col_index++)
            if (is_cell_changed[row_index][col_index])
                ClearBoardCell(row_index, col_index);
}

/* Removes all letters on board */
function ClearAllLettersOnBoard() {
    for (let row_index = 0; row_index < configuration.board_size; row_index++)
        for (let col_index = 0; col_index < configuration.board_size; col_index++) {
            ClearBoardCell(row_index, col_index);
            is_cell_committed[row_index][col_index] = false;
        }
}