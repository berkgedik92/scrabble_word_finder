/*
    When computing the possible moves for a player, each possible move is presented by a MoveCandidate object.
    By "move", to add letters to game board is meant. In a valid move, all added letters must lie in the same row
    or same column. For the former, the move is said to be "horizontal" and for the latter, it is "vertical".
    In this object, only the word emerged in the orientation of the move is kept. To be more precise, for instance
    if the move is horizontal, some vertical words might appear as a side result.If the move is horizontal,
    the horizontal word is called "main word" and vertical words that emerged as a side effect (if there are any)
    are called "derived words". In this object, only the main word is kept. Also the start column and row
    (the top-left coordinates) of the main word is kept.
 */
let CandidateMove = function(options) {

    let vars = {
        word:           new LetterSequence(),
        start_column:   0,
        start_row:      0,
        is_horizontal:  false,
    };

    this.construct = function(options){
        $.extend(vars, options);
    };

    this.getWord = function () {
        return vars.word;
    };

    this.getStartColumn = function() {
        return vars.start_column;
    };

    this.getEndColumn = function() {
        if (vars.is_horizontal)
            return vars.start_column + vars.word.getLength() - 1;
        else
            return vars.start_column;
    };

    this.getEndRow = function() {
        if (vars.is_horizontal)
            return vars.start_row;
        else
            return vars.start_row + vars.word.getLength() - 1;
    };

    this.getStartRow = function() {
        return vars.start_row;
    };

    this.isHorizontal = function() {
        return vars.is_horizontal;
    };

    this.setStartColumn = function(column) {
        vars.start_column = column;
    };

    this.construct(options);
};