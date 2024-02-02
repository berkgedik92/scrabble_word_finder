letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
           "k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
           "u", "v", "w", "x", "y", "z"]

with open("wordlist.txt", "r", encoding="utf-8") as input:
    words = input.readlines()

content = """
function LoadDatabase() {
    #REPLACE HERE#
}
"""

out_lines = []

for wordIndex, word in enumerate(words):
    print(str(wordIndex + 1) + "/" + str(len(words)))
    word = word.strip()
    letter_indices = []
    for letter in word:
        letter_index = letters.index(letter)
        letter_indices.append(str(letter_index))
    line = "tree.AddWord(new LetterSequence({letters : ["
    line += ", ".join(letter_indices)
    line += "]}));"
    out_lines.append(line)

content = content.replace("#REPLACE HERE#", "\n".join(out_lines))

with open("script/loaddatabase.js", "w", encoding="utf-8") as out:
    out.write(content)
