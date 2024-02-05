import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { dwebp } from 'webp-converter';
import { createHash, randomBytes } from 'crypto';

const SECRET_PATH = 'secret';
let secret = '';

function _log(...s) {
  console.log(...s);
}

function _gen_device_token(android_id) {
  const hash = createHash('md5').update(android_id, 'utf8').digest('hex');
  return hash;
}

async function _register() {
  const ANDROID_ID = randomBytes(8).toString("hex");
  const DEVICE_TOKEN = _gen_device_token(ANDROID_ID);
  const SECURITY_KEY = _gen_device_token(DEVICE_TOKEN + '4Kin9vGg');

  const url = new URL('https://jumpg-api.tokyo-cdn.com/api/register');
  url.searchParams.set('device_token', DEVICE_TOKEN);
  url.searchParams.set('security_key', SECURITY_KEY);
  url.searchParams.set('os', 'android');
  url.searchParams.set('os_ver', '28');
  url.searchParams.set('app_ver', '111');
  let res = await (await fetch(url, {
    method: 'PUT'
  })).text();
  res = res.split('\n')[2].trim();
  return res;
}

async function get_chapter(id, quality) {
  const url = new URL('https://jumpg-api.tokyo-cdn.com/api/manga_viewer');
  url.searchParams.set('chapter_id', id);
  url.searchParams.set('img_quality', quality);
  url.searchParams.set('split', 'yes');
  url.searchParams.set('ticket_reading', 'no');
  url.searchParams.set('free_reading', 'yes');
  url.searchParams.set('subscription_reading', 'no');
  url.searchParams.set('viewer_mode', 'horizontal');
  url.searchParams.set('os', 'android');
  url.searchParams.set('os_ver', '28');
  url.searchParams.set('app_ver', '111');
  url.searchParams.set('secret', secret);
  // url.searchParams.set('format', 'json');

  let data = await (await fetch(url, {
    "headers": {
      "accept": "application/json",
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\"",
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "Referer": "https://mangaplus.shueisha.co.jp/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": null,
    "method": "GET"
  })).text();
  return data;
}

async function _download({ title_id, number, chtitle, churl, chid }) {
  _log(`[-] Downloading chapter ${number} - ${chtitle}`);
  const base_path = title_id.toString();
  if (!fs.existsSync(base_path))
    fs.mkdirSync(base_path.toString());
  const chaps = await get_chapter(chid, 'high');

  const reg = /https:(.*?)86400/g
  const matches = (chaps.match(reg)).filter(e => e.includes(chid) && e.includes("manga_page"))

  let file = new PDFDocument({ autoFirstPage: false });
  file.pipe(fs.createWriteStream(path.join(base_path, `${title_id}-${number}.pdf`)));

  let blobs_pro = [];
  for (let m of matches) {
    blobs_pro.push(fetch(m));
  }

  const blobs = await Promise.all(blobs_pro);

  let i = 0;
  let image_data;
  for (let m of blobs) {
    i++;
    const image_blob = new Uint8Array(await (m).arrayBuffer());
    const ppathw = path.join(base_path, `${title_id}-${number}-${i}.webp`);
    const ppath = path.join(base_path, `${title_id}-${number}-${i}.png`);
    fs.writeFileSync(ppathw, Buffer.from(image_blob));
    await dwebp(ppathw, ppath, "-o");
    if (!image_data) {
      image_data = file.openImage(ppath);
    }
    file.addPage({ size: [image_data.width, image_data.height] });
    file.image(ppath, 0, 0);
    fs.unlinkSync(ppathw);
    fs.unlinkSync(ppath);
  }

  file.end();
}

async function get_chapters(title_id) {
  const url = new URL('https://jumpg-api.tokyo-cdn.com/api/title_detailV3');
  url.searchParams.set('title_id', title_id);
  url.searchParams.set('os', 'android');
  url.searchParams.set('os_ver', '28');
  url.searchParams.set('app_ver', '111');
  url.searchParams.set('secret', secret);
  // url.searchParams.set('format', 'json');
  const res = await (await fetch(url)).text();
  const reg = /#.*?https:(.*?)86400/g
  const matches = (res.match(reg));
  let chapters = [];
  for (let m of matches) {
    let [, number] = /#(.*?)"/.exec(m);
    number = Number(number);
    let [, chtitle] = /:(.*?)https/.exec(m);
    chtitle = chtitle.slice(0, -3).trim();
    let [, churl] = /(https.*?86400)/.exec(m);
    let [, chid] = /chapter\/(.*?)\/chapter_thumbnail/.exec(churl);
    chid = Number(chid);
    chapters[number] = { title_id, number, chtitle, churl, chid };
  }
  return chapters;
}

async function main() {
  let index = 0;
  let title_id = undefined;
  let chapter_nums = [];
  if (process.argv.indexOf('--help') > -1) {
    _log(`[?] To download a chapter (e.g. One Piece):\n    node index.js --title-id 100020 --chapter 1`);
    return;
  }
  if ((index = process.argv.indexOf('--title-id')) > -1 && process.argv[index + 1]) {
    title_id = process.argv[index + 1];
  } else {
    _log(`[x] Please insert the manga id using --title_id {id}`);
    return;
  }
  if ((index = process.argv.indexOf('--chapter-range')) > -1 && process.argv[index + 1]) {
    const range = (process.argv[index + 1].split("-").map(e => Number(e)));
    if (range.length != 2) {
      _log(`[x] The range is not valid`);
      return;
    }
    for (let i = range[0]; i < range[1] + 1; i++)
      chapter_nums.push(i);
  }
  if (chapter_nums.length == 0) {
    if ((index = process.argv.indexOf('--chapters')) > -1 && process.argv[index + 1]) {
      chapter_nums = (process.argv[index + 1].split(",").map(e => Number(e)));
    }
  }
  if (chapter_nums.length == 0) {
    if ((index = process.argv.indexOf('--chapter')) > -1 && process.argv[index + 1]) {
      chapter_nums.push(process.argv[index + 1]);
    } else {
      _log(`[x] Please insert the chapter number using --chpater {num}`);
      return;
    }
  }
  if (fs.existsSync(SECRET_PATH))
    secret = fs.readFileSync(SECRET_PATH, { encoding: 'utf8' });
  else {
    secret = await _register();
    fs.writeFileSync(SECRET_PATH, secret);
  }
  try {
    const chapters = await get_chapters(title_id);
    _log(`[!] Number of chapters found: ${chapters.length}\n`);

    let promises = [];
    let count = 0;
    for (let c of chapter_nums) {
      promises.push((async (c) => {
        if (!chapters[c]) {
          _log(`[x] Chapter ${c} does not exist`);
          return;
        }
        await _download(chapters[c]);
        _log(`[!] Chapter ${c} downloaded in dir '${title_id}'\n`);
      })(c))
      if (++count == 5) {
        count = 0;
        await Promise.all(promises);
      }

    }

  } catch (e) {
    _log(e);
    _log(`[x] Error occurred ... try again`);
    return;
  }
}

main();
