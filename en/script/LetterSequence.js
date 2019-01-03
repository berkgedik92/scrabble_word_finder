/*
    Array of integers, where each integer is representing a letter.
    If a letter X is having Yth position in configuration["alphabet"] (see configuration.js)
    for letter X there will be Y in the array.
 */
let LetterSequence = function(options = {}) {

    let vars = {
        letters: [],
    };

    this.construct = function(options){
        $.extend(vars, options);
    };

    this.getLetters = function () {
        return vars.letters;
    };

    this.getLetter = function(index) {
        return vars.letters[index];
    };

    this.setLetter = function (index, letter) {
      return vars.letters[index] = letter;
    };

    this.getLength = function () {
      return vars.letters.length;
    };

    // Returns a new sequence which is equal to the old sequence and "letter" prepended
    this.prependLetter = function (letter) {
        let letters = [];

        $.each(vars.letters, function (index, letter) {
            letters.push(letter);
        });

        letters.unshift(letter);
        return new LetterSequence({
            letters: letters
        });
    };

    // Returns a new sequence which is equal to the old sequence and "letter" appended
    this.appendLetter = function(letter)
    {
        let letters = [];

        $.each(vars.letters, function (index, letter) {
            letters.push(letter);
        });

        letters.push(letter);

        return new LetterSequence({
            letters: letters
        });
    };

    this.construct(options);
};