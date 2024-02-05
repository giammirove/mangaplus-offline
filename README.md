## Features

- Download multiple chapters
- All chapter pages are merged into a single pdf

## Installation

````shell
npm i 
````

## Usage

Here's an example of how to use the PyMangaPlus library:

```shell
# download single chapter 
node index.js --title-id 100020 --chapter 1

# download multiple chapters
node index.js --title-id 100020 --chapters 1,3,6,9

# download a range of chapters
node index.js --title-id 100020 --chapter-range 1-60
```

<b>Note:</b> 
the chapters are downloaded as `${title_id}-${chapter_num}.pdf` in the directory `${title_id}`.
For instance chapter 1 of One Piece is downloaded in `100020/100020-1.pdf`

## How did I write the code?

Prerequisities:
- Download the APK and a software to inspect it (e.g. [jadx](https://github.com/skylot/jadx))
- Use any android emulator available (e.g. [Genymotion](https://www.genymotion.com/))
- Use any proxy-server or similar tool able to generate/install a ca certificate (e.g. [HTTPToolkit](https://httptoolkit.com/))

Steps:
- Fire your proxy (using HTTPToolkit you just need to select `Android Device via ADB`)
- Launch the MangaPlus application on your emulator and do simple operations, for instance reading a chapter
- Go check the captured requests by the proxy
- Try to understand the flow and look for possible `secret` codes 
- In particular notice that `device_token`,`security_key`, and `secret` seem to be fundamental
- Using [jadx](https://github.com/skylot/jadx) inspect the APK and try to understand the origin of such values
- The rest is up to your skills

## Disclaimer

mangaplus-offline is an unofficial library and is not affiliated with or endorsed by MangaPlus or Shueisha. The library is
provided "as is" without any warranty, and the usage of this library is at your own risk. Make sure to comply with the
terms and conditions of the MangaPlus service while using this library.

mangaplus-offline is for educational purposes only.

### License

This project is licensed under the [GPL v3 License](https://github.com/giammirove/mangaplus-offline/blob/main/LICENSE).
