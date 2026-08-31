import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the import
code = code.replace("import anime from 'animejs';", "import { animate as anime, stagger, remove as removeAnime } from 'animejs';")

# Replace anime.stagger and anime.remove
code = code.replace("anime.stagger", "stagger")
code = code.replace("anime.remove", "removeAnime")

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx fixed!")
