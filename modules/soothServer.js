const zip = require('adm-zip');
const { sotsLocation } = require('../config.json');
const { pHeroDraft, pGetCollections, pPlayerStatsForHero, pPlayerStats, pAllPlayerStats } = require('./dbUtils');

module.exports = function handleRequest(req, res, db, sotsDB) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', async () => {
    try {
      const opts = body === '' ? {} : JSON.parse(body);
      let resp = null;
      // console.log(body);

      // check the url and handle appropriately
      // this should mirror the things that the sots-db extension is asking for in soothsayer
      if (req.url === '/collections') {
        resp = await pGetCollections(db, sotsDB);
      } else if (req.url === '/heroDraft') {
        resp = await pHeroDraft(opts, sotsDB);
      } else if (req.url === '/playerStatsForHero') {
        resp = await pPlayerStatsForHero(opts, sotsDB);
      } else if (req.url === '/playerStats') {
        resp = await pPlayerStats(opts, sotsDB);
      } else if (req.url === '/allPlayerStats') {
        resp = await pAllPlayerStats(opts, sotsDB);
      }
      if (req.url === '/get/database') {
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename=database.zip',
        });

        const zipDb = new zip();
        zipDb.addLocalFolder(`${sotsLocation}/db`);
        res.write(zipDb.toBuffer());
        res.end();
        return;
      }

      // console.log(resp);
      res.writeHead(200, { 'Content-Type': 'text/json' });
      res.write(JSON.stringify(resp));
      res.end();
    } catch (e) {
      console.log(`Error processing soothsayer request: ${e}`);
    }
  });
};
