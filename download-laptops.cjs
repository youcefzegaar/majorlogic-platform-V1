const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'apps', 'search-ui', 'public', 'laptops');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const images = {
  'macbook': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-202402?wid=1000&hei=1000&fmt=png-alpha',
  'zephyrus': 'https://dlcdnwebimgs.asus.com/gain/3D7A4D0F-3A03-45B6-B2FA-41B088F5E973/w1000/h732',
  'thinkpad': 'https://p4-ofp.static.pub/ShareResource/we/Products/laptops/thinkpad/thinkpad-p-series/lenovo-thinkpad-p1-gen-6-16-inch-intel-gallery-1.png',
  'inspiron': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/inspiron-notebooks/14-5430/media-gallery/touch/silver/notebook-inspiron-14-5430-t-slv-gallery-1.png?fmt=png-alpha',
  'acer': 'https://images.acer.com/is/image/acer/Nitro_V_15_ANV15-51_Backliton_Black_01a-1?$Product-Cards-XL$'
};

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function main() {
  for (const [name, url] of Object.entries(images)) {
    try {
      const dest = path.join(dir, `${name}.png`);
      await download(url, dest);
      console.log(`Downloaded ${name}`);
    } catch (e) {
      console.error(`Error with ${name}: ${e.message}`);
    }
  }
}

main();
