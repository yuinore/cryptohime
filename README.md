# cryptohime
Himekabe Encryption and Modification Tools

## Features
- Split images into tiles and shuffle (Image encryption)
- Obfuscate source code (with Javascript Obfuscator)
- Overlap translucent tile images
- Clear remaining blocks on stage clear
- Quantize colors (NOTE: Photoshop optimization is recommended)
- Add margin below the paddle
- Auto-generate blockmap

## Install
```
bundle install
npm install
```

## Execute
```
# tools/
# ├── 01a.png
# ├── 01b.png
# ├── 02a.png
# └── 02b.png

bash cryptohime.sh
ruby -run -e httpd ./www -p 3000

# open http://localhost:3000/
```
