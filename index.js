const http = require("http");
const express = require("express");
const app = express();
const mqtt = require("mqtt");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;

const DataPointModel = require("./models/datapoint.model");
const DataSeriesModel = require("./models/dataseries.model");

const { DB_USERNAME, DB_PASSWORD, DB_PORT, DB, DB_HOSTNAME } = process.env;

const DEVICE_MAX_TIMEOUT = 10 * 1000;

const port = "5000";
const dburl = `mongodb://mongo:${DB_PORT}/${DB}?authSource=admin`;

// 1. Device inits connection
// - send name
// - create series ID

// 2. Device sends data
// - data is saved as datapoint with correct series ID

// 3. On device 'disconnect' or 'timeout' end series

/* 
{
  deviceID: 'ssss',
  currentSeriesId: 'ObjectId'
},
{
  ...
}

*/

let activeSeries = [];
// let timeOu

mongoose
  .connect(dburl, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Mongo connected");
  })
  .catch((err) => {
    console.log(err);
  });

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
  console.log(`http://localhost:${port}`);
});

const client = mqtt.connect(`wss://${process.env.MQTT_HOSTNAME}:${MQTT_PORT_TSL}`, {
  username: process.env.SERVER_USERNAME,
  password: process.env.SERVER_PASSWORD,
});

const TOPICS = {
  init: "init",
  device: "device",
  phone: "phone",
};

client.on("error", (err) => console.log(err));

client.on("connect", () => {
  console.log("Connected!");
  client.subscribe("device");
  client.subscribe("init");
  client.subscribe("phone");
});

// service:
// topic: init - [deviceName];[status]

const addActiveSeries = (deviceName, seriesId) => {
  console.log(`New series added: ${deviceName}:${seriesId}`);
  activeSeries.push({
    deviceId: deviceName,
    currentSeriesId: seriesId,
    timeout: setTimeout(() => {
      console.log(`Removing series... ${deviceName}:${seriesId}`);
      removeActiveSeries(deviceName, seriesId);
    }, DEVICE_MAX_TIMEOUT),
  });
};

const removeActiveSeries = (deviceId, seriesId) => {
  activeSeries = activeSeries.filter((el) => el.deviceId !== deviceId);

  if (seriesId) {
    DataPointModel.find({ seriesId: ObjectId(seriesId) }, (err, points) => {
      if (err) console.log(err);

      if (points.length === 0) {
        console.log("Self destruct empty series");
        DataPointModel.deleteOne(
          {
            seriesId: ObjectId(seriesId),
          },
          (err, res) => {
            if (err) console.log(err);

            console.log("Removed");
          }
        );
      }
    });
  }
};

const initMessageHandler = (message) => {
  const msg = message.toString().split(";");
  const deviceName = msg[0];
  const status = msg[1];

  // Create new series and wait data;
  const series = new DataSeriesModel();
  series.deviceName = deviceName;
  series.active = true;
  series.save((err, series) => {
    console.log(err);
    console.log(series);

    addActiveSeries(series.deviceName, series._id);
  });
};

const deviceMessageHandler = (message) => {
  const splitMsg = message.toString().split(",");
  console.log(splitMsg);

  if (splitMsg.length === 1) {
    const deviceId = splitMsg[0].split(":")[1];
    const status = splitMsg[1].split(":")[1];

    if (status === "disconnected") {
      removeActiveSeries(deviceId);
    }

    return;
  }

  const spoVal = splitMsg[0].split(":")[1];
  const hrVal = splitMsg[1].split(":")[1];
  const deviceId = splitMsg[2].split(":")[1];

  console.log(spoVal, hrVal, deviceId);

  // check if series active

  console.log(activeSeries);
  const currentSeries = activeSeries.filter(
    (el) => el.deviceId === deviceId
  )[0];

  console.log(currentSeries);

  clearTimeout(currentSeries.timeout);
  
  activeSeries = activeSeries.map((el) => {
    if (el.deviceId === deviceId) {
      el.timeout = setTimeout(() => {
        console.log(`Removing series... ${el.deviceId}:${el.currentSeriesId}`);
        removeActiveSeries(el.deviceId, el.currentSeriesId);
      }, DEVICE_MAX_TIMEOUT)
    }
    return el;
  })

  if (currentSeries) {
    const dataPoint = new DataPointModel();
    dataPoint.hrVal = Number(hrVal);
    dataPoint.spoVal = Number(spoVal);
    dataPoint.seriesId = currentSeries.currentSeriesId;
    dataPoint.save((err, point) => {
      if (err) console.log(err);

      console.log(point);
    });
  }
};

const deconstructMessage = (topic, message) => {
  console.log(topic, message);
  switch (topic) {
    case TOPICS.init: {
      initMessageHandler(message);
      break;
    }
    case TOPICS.device: {
      deviceMessageHandler(message);
      break;
    }
    case TOPICS.phone: {
      break;
    }
    default:
      undefined;
  }
};

client.on("message", (topic, message) => {
  console.log("New message:");
  console.log(topic, message.toString());
  deconstructMessage(topic, message);
});

app.get("/", (req, res) => res.send("<div>hellow uwu</div>"));

app.get("/allSeries", (req, res) =>
  DataSeriesModel.find((err, series) => {
    if (err) console.log(err);

    res.send(series);
  })
);

// DataPointModel.deleteMany({});

// for (let i = 0; i < 15; i++) {
//   const dpm = new DataPointModel;
//   dpm.hrVal = i;
//   dpm.spoVal = i;
//   dpm.seriesId = ObjectId("6114e38e04af0f001f5bed76");

//   dpm.save();
// }

app.get("/seriesPerId", (req, res) => {
  const seriesId = req.query.seriesId;

  DataPointModel.find({ seriesId: ObjectId(seriesId) }, (err, points) => {
    if (err) console.log(err);

    res.send(points);
  });
});

app.get("/allDataPoints", (req, res) =>
  DataPointModel.find((err, points) => res.send(points))
);
