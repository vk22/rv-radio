import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors())
const PORT = 3001;
const ICECAST_URL = "http://icecast:8001/status-json.xsl";

app.get("/info", async (req, res) => {
  try {
    const itemsForSale = JSON.parse(await fs.promises.readFile('data/forSale.json', 'utf-8'));
    res.json({
        data: itemsForSale
    });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.get("/nowplaying", async (req, res) => {
  try {
    const response = await fetch(ICECAST_URL);
    const data = await response.json();
    console.log('data ', data)
    const source = data.icestats?.source || {};

    if (source.title) {
        const pos = source.title.split('-')[0].trim();
        const releaseID = source.title.split('-')[1].trim(); 

        const itemsForSale = JSON.parse(await fs.promises.readFile('data/forSale.json', 'utf-8'));
        const releaseData = itemsForSale.find(item => item.release.id === +releaseID);
        if (releaseData) {
            const artist = releaseData.release.artist;
            const title = releaseData.release.title;
            const media = releaseData.condition;
            const sleeve = releaseData.sleeve_condition;
            const link = releaseData.uri;
            const img = `${releaseID}.jpg`;
            const price = releaseData.original_price.formatted;

            res.json({
                releaseID: +releaseID,
                img: img,
                title: title,
                artist: artist,
                media: media,
                sleeve: sleeve,
                price: price,
                link: link,
            });
        }
    } else {
        res.json({
            releaseID: null,
            img: null,
            title: null,
            artist: null,
            media: null,
            sleeve: null,
            price: null,
            link: null,
        });
    }

  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
