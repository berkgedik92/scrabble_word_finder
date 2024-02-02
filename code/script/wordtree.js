/*
    This is node object for WordTree (see below for WordTree class). This class is supposed to be used
    only by WordTree. The node consists of only two properties: "isWord" and "edges".
    As name implies, if "isWord" is TRUE the node represents a word.
    "edges" is an array of references to other WordTreeNode objects (for each letter in alphabet, there is an edge).
    More details about the usage of this class will be given in the explanation for WordTree class.
 */
let WordTreeNode = function(options = {}) {

    let vars = {
        isWord: false
    };

    this.construct = function(options){
        $.extend(vars, options);
        vars.edges = Array.from({length: vars.alphabet_size}, () => null);
    };

    this.getEdge = function(index){
        return vars.edges[index];
    };

    this.setEdge = function (index, value) {
        vars.edges[index] = value;
    };

    this.isWord = function () {
        return vars.isWord;
    };

    this.setAsWord = function() {
        vars.isWord = true;
    };

    this.construct(options);
};

/*
    WordTree is a data structure that allows us to check whether the following:
        1) If a sequence of letter represented by a LetterSequence object is a prefix of any word (isPrefix function)
        2) If a sequence of letter represented by a LetterSequence object is a word (isWord function)
*/
let WordTree = function(alphabet_size) {

    let vars = {
        rootNode: new WordTreeNode(),
        alphabet_size: alphabet_size
    };

    /*
     * Private method
     * Can only be called inside class
     */
    let tryToAccessNode = function(letters) {
        let node = vars.rootNode;

        $.each(letters.getLetters(), function(index, letter) {
            try {
                if (!node.getEdge(letter)) {
                    node = null;
                    return false;
                }
                node = node.getEdge(letter);
            }catch(err) {
                console.log(letters.getLetters());
            }
        });
        return node;
    };

    this.AddWord = function(word) {
        let current = vars.rootNode;
        let alphabet_size = vars.alphabet_size;

        $.each(word.getLetters(), function(index, letter) {
            if (!current.getEdge(letter))
                current.setEdge(letter, new WordTreeNode({
                    alphabet_size: alphabet_size
                }));
            current = current.getEdge(letter);
        });

        current.setAsWord();
    };

	this.isWord = function(letters) {
        let node = tryToAccessNode(letters);

        if (!node)
            return false;

        return node.isWord();
    };


	this.isPrefix = function(letters) {
        let node = tryToAccessNode(letters);
        if (node)
            return true;
        else
            return false;
    };
};
