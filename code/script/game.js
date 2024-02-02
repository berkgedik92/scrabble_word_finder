let NO_LETTER = -1;
let NO_PROPERTY_CELL = 0;
let LETTER_DOUBLE_POINT_CELL = 1;
let LETTER_TRIPLE_POINT_CELL = 2;
let WORD_DOUBLE_POINT_CELL = 3;
let WORD_TRIPLE_POINT_CELL = 4;

/*
    Cell class
    For each cell in the game board, a Cell object is created

    Properties
        a) letter: The index of the letter that has been added to the cell (NO_LETTER if it is empty)
        b) property: The property of the cell (double of the word, triple of the letter etc. NO_PROPERTY_CELL if
                        it is not special)

        c) is_letter_forbidden_for_row (boolean array): Xth element of this array is True if it is impossible
           to use on this cell the letter whose index is X when writing a horizontal word in the game board

        d) is_letter_forbidden_for_col (boolean array): Xth element of this array is True if it is impossible
           to use on this cell the letter whose index is X when writing a vertical word in the game board

        (c) and (d) is used to speed up the candidate finding process. Thanks to them, we do not need to try every
        letter on this cell as we already know some of them are impossible to be used.
 */
function Cell(alphabet_size) {
    this.letter = NO_LETTER;
    this.is_letter_forbidden_for_row = Array.from({length: alphabet_size}, () => false);
    this.is_letter_forbidden_for_col = Array.from({length: alphabet_size}, () => false);
    this.property = NO_PROPERTY_CELL;
}

/*
    Each row and column is a region. So for 15*15 board, we create 30 BoardRegion objects.

 */
function BoardRegion(game, index, isRow) {

    //How many cells are there in this region
	this.size           = game.size;

	//If the region is horizontal or vertical
	this.isRow          = isRow;

	//If it is a row region, index of row. Otherwise, the index of column
	this.index          = index;

	//Reference to the game object
	this.game           = game;

	//Cell objects for each cell that belongs to this region
	this.cells          = [];

	this.addCell = function(cell) {
	    this.cells.push(cell);
    };

	/*
	    In a region, a cell is an anchor if the cell is empty and either previous cell or next cell is occupied.
	    Any word that can be written in this region must pass through an anchor cell due to the rules of the game.
	 */
	this.isAnchor = function(cell_index) {
        if (this.cells[cell_index].letter !== NO_LETTER)
            return false;

        if (cell_index < this.size - 1 && this.cells[cell_index + 1].letter !== NO_LETTER)
            return true;

        if (cell_index > 0 && this.cells[cell_index - 1].letter !== NO_LETTER)
            return true;

        return false;
    };

	/*
	    For a cell in this region, returns the array which shows which letters are impossible
	    to be used on this cell
	 */
	this.getArrayForForbiddenLetters = function(cell_index) {
	    if (this.isRow)
	        return this.cells[cell_index].is_letter_forbidden_for_row;
	    else
	        return this.cells[cell_index].is_letter_forbidden_for_col;
    };

	/*
	    Update the forbidden letters for the cell in this region. Here is the logic for deciding which letters
	    to forbid:

        Let's assume the region is a row and the cell marked with ? is the cell for which we try to decide
        letters to forbid. Assume this is the current situation on the board: (. marks the cells whose content
        is irrelevant and _ is empty cell)

        . . _ . .
        . . B . .
        . . R . .
        . . ? . .
        . . A . .
        . . K . .
        . . _ . .

        In this case, if we are about to write a horizontal word which will pass through ?, as a side effect
        a vertical word will appear as well (which starts with BR and ends with AK). So any letter which can make
        the letter sequence BR?AK a meaningful word when replaces ? will be allowed, and all other letters will not
        be allowed. (so for instance, letter E would be allowed and A would not be allowed)

        In the function prototype, obj is an object that contains a prefix and a suffix. In our example,
        prefix would be a LetterSequence object that represents "BR" and suffix would be "AK". Of course it is possible
        that suffix or prefix is empty. If both are empty, it means there is no ground to disallow any letter,

	 */
	this.UpdateForbiddenLetters = function(cell_index, obj) {

	    let prefix = obj.prefix;
	    let suffix = obj.suffix;

	    //A LetterSequence object that keeps prefix + ? + suffix (BR?AK) in our example
        let temp = this.MergeSequence(prefix, suffix, this.game.alphabet_size);

        //Reference to forbidden letters array (any change in this array will be reflected in
        //the corresponding property of the corresponding cell object)
        let is_letter_forbidden = this.getArrayForForbiddenLetters(cell_index);

        for (let letter_index = 0; letter_index < this.game.alphabet_size; letter_index++) {

            //If both suffix and prefix are empty, we cannot disallow any letter
            if (obj.prefix.getLength() === 0 && obj.suffix.getLength() === 0)
                is_letter_forbidden[letter_index] = false;
            else {
                //Replace ? with the letter whose index is "letter_index"
                temp.setLetter(prefix.getLength(), letter_index);

                //Disallow the letter if "temp" is not a valid word
                is_letter_forbidden[letter_index] = !this.game.tree.isWord(temp);
            }
        }
    };

	/*
	    Finds all words that we can write in this region.
	        1) Find all anchor points
	        2) For each anchor point A find words such that the first anchor point the word passes through is A
	 */
    this.FindWord = function() {
        let prev_anchor = -1;
        for (let cell_index = 0; cell_index < this.size; cell_index++) {
            if (this.isAnchor(cell_index)) {
                /*
                    This cell is anchor, find the words which passes from this cell where this cell is the
                    first anchor cell that those words are passing through.

                    We will find such words by extending backwards and forward from that point.
                    Extending backwards means to prepend a letter just before the current letter sequence.
                    Extending forward means to append a letter just after the current letter sequence. For instance:

                    . . . . . [] . N

                    is the initial state of the region, where [] represents the anchor cell, "." represents
                    the empty cells. First, let's assume we put letter V to anchor cell (this can be done by
                    either backward extension or forward extension), so we have:

                    . . . . . V . N

                    Currently, the letter sequence is = "V". Now we can extend backwards by prepending letter
                    "E" to the letter sequence (we need to have this letter in our userHand to be able to do that of course). We have
                    Now we have

                    . . . . E V . N

                    ...and the current letter sequence = "EV"

                    Let's extend backwards one more time by prepending letter "S" and then :

                    . . . S E V . N

                    Now let's extend forward by appending E. The letter "N" is also appended as it
                    is touching to the letter sequence, so we have:

                    . . . S E V E N

                    Here is the extension policy:
                        1) When extending backwards, never extend to a cell which is an anchor. If the previous
                           cell to the current letter sequence is an anchor, stop extending backwards
                           (By definition we said that we want to find words such that the first anchor point they
                           pass through is this anchor point. We want to find only those words because others are
                           already found in the previous iteration for the previous anchor)
                        2) In the beginning, if we extend backwards, we try to form all letter sequences which are
                           either a valid word or a prefix of a valid word, and from each such point we try to extend
                           forward. When doing so, if we get a valid word, we add it to moveCandidatesList. Once we extend forward
                           we never extend backwards.
                */

                /*
                    If back is occupied (cell index is 0 or there is a letter in the previous cell),
                    there is no point of trying to extend backwards because if cell index is 0, there is no
                    place to extend backwards and if there is a letter in the previous cell, the first empty
                    cell must be a previous anchor and according to our policy we do not extend into
                    previous anchor.
                */
                if (cell_index !== 0 && this.cells[cell_index - 1].letter !== NO_LETTER) {
                    /* In this case we will extend forward and the letters that touches to the anchor point
                        are the initial letter sequence
                    */

                    let prefix = this.GetTouchingLetterSequences(cell_index).prefix;

                    // The parameter FALSE means that we did not add any letter so far
                    this.ForwardExtension(prefix, cell_index, false);
                }
                else {
                    /*
                        Set the number of letter that we can prepend so we can be sure that
                        we will not extend into the previous anchor cell (and as an indirect
                        result we can be sure that all cells in this limit will be empty and
                        we will not add any letter which will be adjacent to an already-existing
                        letter (this can be the case for forward extension)
                        so we do not need to check for that)
                        We have no letters in the letter sequence initially
                     */
                    let letter_limit = cell_index - prev_anchor;
                    this.BackwardExtension(new LetterSequence(), letter_limit, cell_index);
                }
                prev_anchor = cell_index;
            }
        }
    };

	/*
	    letters: letter sequence we have so far
	    letter_limit: how many more letters we can use when extending backwards
	    index_of_last_cell: the index of the cell where the last letter in letter sequence
	                        resides
	 */
	this.BackwardExtension = function(letters, letter_limit, index_of_last_cell) {

	    /*
	        If the current letter sequence is a valid word or the prefix of a valid word and
	        we already added at least one letter to the letter sequence, try to extend forward
	        to see if we can get a word out of that
	     */
        if (this.game.tree.isPrefix(letters) && letters.getLength() > 0)
            this.ForwardExtension(letters, index_of_last_cell + 1, true);

        if (letter_limit > 0) {
            let forbidden_letters_to_prepend = this.getArrayForForbiddenLetters(index_of_last_cell - letters.getLength());
            for (let letter_index = 0; letter_index < this.game.alphabet_size; letter_index++) {
                if (this.game.userHand[letter_index] > 0 && !forbidden_letters_to_prepend[letter_index]) {
                    this.game.userHand[letter_index]--;
                    let temp = letters.prependLetter(letter_index);
                    this.BackwardExtension(temp, letter_limit - 1, index_of_last_cell);
                    this.game.userHand[letter_index]++;
                }
            }
        }
    };

	this.ForwardExtension = function(letters, cell_index_to_expand, is_any_letter_added) {

	    /*  If the letter sequence is not a valid word or the prefix of a valid word, it cannot lead
            us to find any word.
        */
        if (!this.game.tree.isPrefix(letters))
            return;

        /*
            Check if we are still in the game board and the cell we are trying to expand contains an
            already-existing letter.

            If we are in a cell which contains an already-existing letter, we must append this letter
            into our letter sequence and try to expand into the next cell.

            Otherwise we can check if the current letter sequence is a valid word, if so we can add this
            word into the moveCandidatesList. Then we can try to expand into this cell and continue expanding
         */
        if (cell_index_to_expand < this.size && this.cells[cell_index_to_expand].letter !== NO_LETTER) {
            let current_letter = this.cells[cell_index_to_expand].letter;
            let new_letter_sequence = letters.appendLetter(current_letter);
            this.ForwardExtension(new_letter_sequence, cell_index_to_expand + 1, is_any_letter_added);
        }
        else {
            /*
                If this letter sequence is a valid word, add it into moveCandidatesList (send letter sequence and
                the index of the cell which contains the first letter of the sequence.
            */
            if (this.game.tree.isWord(letters) && is_any_letter_added)
                this.AddCandidateIntoList(letters, cell_index_to_expand - letters.getLength());

            /*
                Try to expand into this cell by using one of the letters in our userHand. (It must
                be also an allowed letter (see comments of UpdateForbiddenLetters function)
             */
            if (cell_index_to_expand < this.size) {
                let is_letter_forbidden = this.getArrayForForbiddenLetters(cell_index_to_expand);
                for (let letter_index = 0; letter_index < this.game.alphabet_size; letter_index++) {
                    if (this.game.userHand[letter_index] === 0 || is_letter_forbidden[letter_index])
                        continue;

                    this.game.userHand[letter_index]--;
                    let new_letter_sequence = letters.appendLetter(letter_index);
                    this.ForwardExtension(new_letter_sequence, cell_index_to_expand + 1, true);
                    this.game.userHand[letter_index]++;
                }
            }
        }
    };

	/*
	    Push a candidate move found into moveCandidatesList of Game object
	 */
	this.AddCandidateIntoList = function(letters, start_cell_index) {

        let col_index, row_index;
        if (this.isRow) {
            col_index = start_cell_index;
            row_index = this.index;
        }
        else {
            col_index = this.index;
            row_index = start_cell_index;
        }

        this.game.moveCandidatesList.push(new CandidateMove({
            word:           letters,
            start_column:   col_index,
            start_row:      row_index,
            is_horizontal:  this.isRow
        }));
    };

	/*
	    prefix (LetterSequence)
	    suffix (LetterSequence)
	    letter_index: Index of a letter

	    Returns a LetterSequence where the sequence is prefix + letter_index + suffix
	 */
	this.MergeSequence = function(prefix, suffix, letter_index) {

        let new_sequence = [];

        for (let i = 0; i < prefix.getLength(); i++)
            new_sequence.push(prefix.getLetter(i));

        new_sequence.push(letter_index);

        for (let i = 0; i < suffix.getLength(); i++)
            new_sequence.push(suffix.getLetter(i));

        return new LetterSequence({
            letters: new_sequence
        });
    };

	/*
	    For a cell C whose index is given in "cell_index" parameter,
	    returns the following:

	    left:  the index of the last empty cell that comes before C (returns -1 if there is no such cell)
	    right: the index of the first empty cell that comes after C (returns this.size if there is no such cell)
	 */
	this.FindFirstEmptyCells = function(cell_index) {

	    let result = {
	        previous_index: cell_index,
            next_index: cell_index
        };

        while (result.previous_index >= 0 && this.cells[result.previous_index].letter !== NO_LETTER)
            result.previous_index -= 1;

        while (result.next_index < this.size && this.cells[result.next_index].letter !== NO_LETTER)
            result.next_index += 1;

        return result;
    };

	/*
	    Let's assume we have the following situation in the region

	    . A S ? U M . A

	    Where . represents empty cells and ? is the cell whose index is given as an input
	    to this function. In this case it returns

	    prefix: LetterSequence for "AS"
	    suffix: LetterSequence for "UM"

	    They are the touching letter sequences to cell marked with ?.
	 */
	this.GetTouchingLetterSequences = function(cell_index) {

	    let prefix_letters = [];
	    let suffix_letters = [];

        let current = cell_index - 1;
        while (current >= 0 && this.cells[current].letter !== NO_LETTER) {
            prefix_letters.unshift(this.cells[current].letter);
            current--;
        }

        current = cell_index + 1;
        while (current < this.size && this.cells[current].letter !== NO_LETTER) {
            suffix_letters.push(this.cells[current].letter);
            current++;
        }

        return {
            prefix: new LetterSequence({
                letters: prefix_letters
            }),
            suffix: new LetterSequence({
                letters: suffix_letters
            })
        };
	};
}

function Game(config) {

    // Map from letter indices to letter-related data (which contains letter point)
    this.index_to_alphabet = {};
    this.alphabet_size = config.alphabet.length;

    this.tree = new WordTree(this.alphabet_size);
    let language = new URLSearchParams(window.location.search).get("lang");
    LoadDatabase(this.tree, language);

    let root = this;

    $.each(config.alphabet, function(index, element) {
        element["index"] = index;
        root.index_to_alphabet[index] = element;
    });

	this.size = config.board_size;
	this.rowRegions = [];
	this.colRegions = [];
	this.userHand = Array.from({length: this.alphabet_size}, () => 0);
	this.cells = Array.from({length: this.size * this.size}, () => new Cell(config.alphabet.length));
	this.isBoardEmpty = true;

    //When user requests to find all move candidates, they will be stored here for the current board state
    this.moveCandidatesList = [];

    //Create row regions and for each region, assign corresponding cells
    for (let row_index = 0; row_index < this.size; row_index++) {
        let region = new BoardRegion(this, row_index, true);
        let start_index = row_index * this.size;
        while (region.cells.length < this.size) {
            region.addCell(this.cells[start_index]);
            start_index += 1;
        }
		this.rowRegions.push(region);
	}

	//Create column regions and for each region, assign corresponding cells
    for (let col_index = 0; col_index < this.size; col_index++) {
        let region = new BoardRegion(this, col_index, false);
        let start_index = col_index;
        while (region.cells.length < this.size) {
            region.addCell(this.cells[start_index]);
            start_index += this.size;
        }
        this.colRegions.push(region);
    }

    //Set special properties for cells
    $.each(config.special_cells, function(index, element) {
       let cell_index = element.row * root.size + element.col;
       root.cells[cell_index].property = element.property;
    });

    /**
     * @return {number}
     */
    this.LetterSequenceToPoint = function(sequence) {
        let point = 0;
        let root = this;
        $.each(sequence.getLetters(), function(index, letter) {
            point += root.index_to_alphabet[letter].point;
        });

        return point;
    };

	this.FindCandidates = function() {
        this.moveCandidatesList = [];

        //If this is the first word to be written in the board...
        if (this.isBoardEmpty) {
            //Let's try to find all horizontal words in the center row, and assume that it starts from first cell...
            this.rowRegions[parseInt(this.size / 2)].ForwardExtension(new LetterSequence(), 0, false);
            /*
                After finding all such words, update their starting cells so that they will be centered also column-wise
                If we set the position to X/2 instead of 0 where the column amount is X, we would miss words longer than
                X/2 characters. This is the reason why we set position to 0
            */
            for (let i = 0; i < this.moveCandidatesList.length; i++) {
                let start_column = parseInt((this.size - Math.round(this.moveCandidatesList[i].getWord().getLength())) / 2);
                this.moveCandidatesList[i].setStartColumn(start_column);
            }
        }
        //If it will not be the first word of the board
        else {
            for (let i = 0; i < this.size; i++) {
                this.rowRegions[i].FindWord();
                this.colRegions[i].FindWord();
            }
        }

        if (this.moveCandidatesList.length === 0)
            window.alert("Cannot find any word candidate");

        /*Compute point of each move and sort them by point*/

        let result_list = [];
        let game = this;
        $.each(this.moveCandidatesList, function(index, candidate) {
            let point = game.ComputePoint(candidate);
            result_list.push({
                "candidate": candidate,
                "point": point
            });
        });

        result_list.sort(
            /**
             * @return {number}
             */
            function SortCandidatesByPoint(candidate1, candidate2) {
                return candidate2.point - candidate1.point;
            });

        return result_list;
    };

    /**
     * @return {number}
     */
    this.ComputePoint = function(candidate) {

        let region, start_pos, end_pos, main_word;
        if (candidate.isHorizontal()) {
            region = this.rowRegions[candidate.getStartRow()];
            start_pos = candidate.getStartColumn();
            end_pos = candidate.getEndColumn();
        }
        else {
            region = this.colRegions[candidate.getStartColumn()];
            start_pos = candidate.getStartRow();
            end_pos = candidate.getEndRow();
        }

        main_word = candidate.getWord();
        let final_point = 0;

        /*Compute points coming from the main word
            1) Compute "raw point" (sum of each letter in the main word regardless of whether the letter
                was already on the board or not and special cells) and set variable "coefficient" to 1.
            2) For each letter of the main word, if the letter is written on a previously unoccupied cell, check if it is
                a special cell:
                    a) If it is LETTER_DOUBLE_POINT_CELL, add the point for this letter to raw point
                    b) If it is LETTER_TRIPLE_POINT_CELL, add the double of the point for this letter to raw point
                    (Note that we already added the point of the letter on step 1, this is why we add only double of the point
                    for LETTER_TRIPLE_POINT_CELL)
                    c) If it is WORD_DOUBLE_POINT_CELL, update coefficient = coefficient * 2
                    d) If it is WORD_TRIPLE_POINT_CELL, update coefficient = coefficient * 3
             3) Main word point = raw point * coefficient
         */

        let points_from_main_word = this.LetterSequenceToPoint(main_word);
        let coefficient_main_word = 1;

        for (let current_pos = start_pos; current_pos <= end_pos; current_pos++) {
            if (region.cells[current_pos].letter === NO_LETTER) {
                let cell_property = region.cells[current_pos].property;
                let letter = main_word.getLetter(current_pos - start_pos);

                switch (cell_property) {
                    case LETTER_DOUBLE_POINT_CELL:
                        points_from_main_word += this.index_to_alphabet[letter].point;
                        break;
                    case LETTER_TRIPLE_POINT_CELL:
                        points_from_main_word += 2 * this.index_to_alphabet[letter].point;
                        break;
                    case WORD_DOUBLE_POINT_CELL:
                        coefficient_main_word *= 2;
                        break;
                    case WORD_TRIPLE_POINT_CELL:
                        coefficient_main_word *= 3;
                        break;
                }
            }
        }
        points_from_main_word *= coefficient_main_word;
        final_point += points_from_main_word;

        /*
            Compute points coming from derived words (here is the meaning of "derived" word). For instance, if
            the main word we are considering is horizontal, while writing this word, some vertical words might appear.
            For each cell of main word which was not occupied before, we should check if such a word appear.
            If so, we will compute word point for it. For each such word, the point it provides is computed
            in the following way:

            1) Compute "raw point" (sum of each letter in the main word regardless of whether the letter
                was already on the board or not and special cells) and set variable "coefficient" to 1.
            2) Check if the cell we are occupying now is a special cell
                a) If it is LETTER_DOUBLE_POINT_CELL, point is raw point + the point for this letter
                b) If it is LETTER_TRIPLE_POINT_CELL, point is raw point + double of the point for this letter
                (Note that we already added the point of the letter on step 1, this is why we add only double of the point
                for LETTER_TRIPLE_POINT_CELL)
                c) If it is WORD_DOUBLE_POINT_CELL, point is raw point * 2
                d) If it is WORD_TRIPLE_POINT_CELL, point is raw point * 3
         */

        for (let current_pos = start_pos; current_pos <= end_pos; current_pos++) {
            if (region.cells[current_pos].letter === NO_LETTER) {
                let cell_property = region.cells[current_pos].property;
                let letter = main_word.getLetter(current_pos - start_pos);
                let obj = this.getComplimentaryRegion(region, current_pos).GetTouchingLetterSequences(region.index);

                //We found a derived word
                if (obj.prefix.getLength() + obj.suffix.getLength() > 0) {
                    let derived_word = region.MergeSequence(obj.prefix, obj.suffix, letter);
                    let points_from_derived_word = this.LetterSequenceToPoint(derived_word);

                    switch (cell_property) {
                        case LETTER_DOUBLE_POINT_CELL:
                            points_from_derived_word += this.index_to_alphabet[letter].point;
                            break;
                        case LETTER_TRIPLE_POINT_CELL:
                            points_from_derived_word += 2 * this.index_to_alphabet[letter].point;
                            break;
                        case WORD_DOUBLE_POINT_CELL:
                            points_from_derived_word *= 2;
                            break;
                        case WORD_TRIPLE_POINT_CELL:
                            points_from_derived_word *= 3;
                            break;
                    }

                    final_point += points_from_derived_word;
                }
            }
        }

        return final_point;
    };

    /*
        Save a letter into a cell. This cell will not have any special property anymore
        and we will update forbidden_letter list for some cells
     */
    this.CommitLetter = function(letter, row_index, col_index) {

        //Save the letter and remove any special property of the cell
        let cell_index = row_index * this.size + col_index;
        this.cells[cell_index].letter = letter;
        this.cells[cell_index].property = 0;

        /*
            Let's assume the current status:

            . .  .  . . (.) .
            . .  .  . .  X  .
            . . (.) X X  ? (.)
            . .  .  . .  X  .
            . .  .  . . (.) .

            Where X represents occupied cells, . represents empty cells and ? is the cell where
            we are currently committing on. In this case we want to get the coordinates of 4 cells
            represented by (.) (the closest empty cell which is left of ?, the closest empty cell which is on top of ?
            etc)
         */

        let empty_cells;

        empty_cells = this.rowRegions[row_index].FindFirstEmptyCells(col_index);

        let empty_left = {
            row_index: row_index,
            col_index: empty_cells.previous_index
        };

        let empty_right = {
            row_index: row_index,
            col_index: empty_cells.next_index
        };

        empty_cells = this.colRegions[col_index].FindFirstEmptyCells(row_index);

        let empty_up = {
            row_index: empty_cells.previous_index,
            col_index: col_index
        };

        let empty_down = {
            row_index: empty_cells.next_index,
            col_index: col_index
        };

        if (empty_left.col_index >= 0)
            this.UpdateForbiddenLettersLists(empty_left.row_index, empty_left.col_index);

        if (empty_right.col_index < this.size)
            this.UpdateForbiddenLettersLists(empty_right.row_index, empty_right.col_index);

        if (empty_up.row_index >= 0)
            this.UpdateForbiddenLettersLists(empty_up.row_index, empty_up.col_index);

        if (empty_down.row_index < this.size)
            this.UpdateForbiddenLettersLists(empty_down.row_index, empty_down.col_index);

        this.isBoardEmpty = false;
    };


    this.getComplimentaryRegion = function(region, requested_index) {
	    if (region.isRow)
	        return this.colRegions[requested_index];
	    else
	        return this.rowRegions[requested_index];
    };

    this.UpdateForbiddenLettersLists = function(row_index, col_index) {
        let obj;

        obj = this.rowRegions[row_index].GetTouchingLetterSequences(col_index);
        this.colRegions[col_index].UpdateForbiddenLetters(row_index, obj);

        obj = this.colRegions[col_index].GetTouchingLetterSequences(row_index);
        this.rowRegions[row_index].UpdateForbiddenLetters(col_index, obj);
    };
}
