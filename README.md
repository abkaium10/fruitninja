# Fruit Ninja - Vercel Web Version

This is a browser/HTML-CSS-JavaScript conversion of the supplied raylib C version.

## Folder structure

fruit-ninja-vercel/
  index.html
  style.css
  script.js
  assets/

Put the same original asset files from the C project into `assets/`.

Required files include:
- fruit_Ninja_Bg2.png
- fruit_Ninja_Bg.png
- gameovertxt.png
- menu.png
- load.png
- thumbnail.png
- Frenzy_Banana.png
- fire.png
- tushar.png
- kaium.png
- sir.png
- Themesong.mp3
- bomb.wav
- slicing.mp3
- respawn.wav
- gameover.wav
- losingpoint.wav
- bombBlast.mp3
- specialFruit.wav
- combo.mp3
- Fruit frames: 10.png ... 14.png, 20.png ... 24.png, ... 90.png ... 94.png

## Vercel

No build command is required. Upload this folder/project to Vercel as a static site, or push it to GitHub and import the repository into Vercel.

Player scores are stored in browser `localStorage`, so they are local to the browser/device. They are not shared between different users/devices.
